import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AuthProvider, useAuth } from '@/hooks/auth';
import { hydratePerks } from '@/hooks/use-perks';

SplashScreen.preventAutoHideAsync();

// Load persisted points/perks from disk once, before the UI reads the store, so a
// returning user sees their saved balance and active perks immediately.
void hydratePerks();

// The navigator lives in its own component rendered INSIDE <AuthProvider> so it can read
// `useAuth()` and gate routes. Expo Router includes every route by default; the
// `Stack.Protected` blocks carve out the authenticated-only and logged-out-only screens.
function RootNavigator() {
  const { isAuthenticated } = useAuth();
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Reachable only while authenticated. If the session drops (sign-out), these
          become protected and Expo Router falls back to the first available screen,
          which is `login`. */}
      <Stack.Protected guard={isAuthenticated}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="place/[id]" options={{ presentation: 'card' }} />
      </Stack.Protected>

      {/* Reachable only while logged out. */}
      <Stack.Protected guard={!isAuthenticated}>
        <Stack.Screen name="login" />
      </Stack.Protected>

      {/* Always registered (never guarded): the Auth0 round-trip returns to
          `timisight://redirect` and Expo Router navigates to `/redirect` BEFORE the code
          exchange flips `isAuthenticated`, so this must resolve to a real route to avoid
          an Unmatched Route. Its <Redirect> then lands on the tabs once the session is set
          (or bounces back to `login` when the guard is still false). */}
      <Stack.Screen name="redirect" />
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AuthProvider>
          <SplashGate />
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

// Keeps the native splash up (via the animated overlay) until the stored session has been
// read, so the app never flashes `login` or the tabs before auth rehydration finishes.
// The overlay stays the single owner of `SplashScreen.hideAsync()`; `ready` just defers
// when it fires. `RootNavigator` always renders underneath so the correct guarded screen
// is painted the moment the splash dissolves.
function SplashGate() {
  const { isLoading } = useAuth();
  return (
    <>
      <AnimatedSplashOverlay ready={!isLoading} />
      <RootNavigator />
    </>
  );
}
