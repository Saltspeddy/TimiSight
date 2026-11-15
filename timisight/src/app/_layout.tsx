import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StyleSheet, useColorScheme, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useEffect } from 'react';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { ChooseRole } from '@/components/choose-role';
import { AuthProvider, useAuth } from '@/hooks/auth';
import { resetRole, syncRole, useRole } from '@/hooks/use-role';

SplashScreen.preventAutoHideAsync();

// Points/perks are no longer loaded from disk: the balance comes from the DB ledger
// (hydrated by the collection store on sign-in via auth.tsx), and the per-offer
// active/claim banner state is session-only. No pre-UI hydration call is needed.

// The navigator lives in its own component rendered INSIDE <AuthProvider> so it can read
// `useAuth()` and gate routes. Expo Router includes every route by default; the
// `Stack.Protected` blocks carve out the authenticated-only and logged-out-only screens.
function RootNavigator() {
  const { isAuthenticated, user } = useAuth();
  const sub = user?.sub;

  // Once signed in, look this person's role up in the database. The app they see depends
  // on it. Cleared on sign-out.
  //
  // NOTE: the route guards below depend ONLY on `isAuthenticated`, as they always did.
  // Showing/hiding whole route groups based on the role lookup made Expo Router fail to
  // build a starting screen and re-render forever ("Maximum update depth exceeded").
  // The role question is an overlay instead (see SplashGate).
  useEffect(() => {
    if (sub) void syncRole();
    else resetRole();
  }, [sub]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Reachable only while authenticated. If the session drops (sign-out), these
          become protected and Expo Router falls back to the first available screen,
          which is `login`. */}
      <Stack.Protected guard={isAuthenticated}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="place/[id]" options={{ presentation: 'card' }} />
        {/* Artists and statue commissions. */}
        <Stack.Screen name="artist/[sub]" options={{ presentation: 'card' }} />
        <Stack.Screen name="artist-edit" options={{ presentation: 'card' }} />
        {/* Friends list (visitors only: the screen redirects everyone else). */}
        <Stack.Screen name="friends" options={{ presentation: 'card' }} />
        <Stack.Screen name="commission/new" options={{ presentation: 'card' }} />
        <Stack.Screen name="commission/[id]" options={{ presentation: 'card' }} />
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
  const { isLoading, isAuthenticated } = useAuth();
  const { phase } = useRole();

  // Signed in but this person's role isn't settled yet (still looking it up, none recorded
  // on a first sign-in, or the lookup failed): cover the app with the "who are you joining
  // as?" screen. It is drawn ON TOP of the navigator rather than being a route, so the
  // router's own state never changes because of it. It goes away the moment the role is known.
  const askingRole = isAuthenticated && phase !== 'ready';

  return (
    <>
      <AnimatedSplashOverlay ready={!isLoading} />
      <RootNavigator />
      {askingRole ? (
        <View style={StyleSheet.absoluteFill}>
          <ChooseRole />
        </View>
      ) : null}
    </>
  );
}
