import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { UnityArProvider } from '@/components/unity-ar-host';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        {/*
          UnityArProvider mounts the SINGLE persistent <UnityView> as a sibling of
          the router <Stack>, so the Unity engine boots once and never unmounts
          between AR sessions. The /ar screen reveals/hides it and sends hold/resume
          signals instead of owning (and unloading) it. See
          .agents/tasks/ar-reopen-crash-investigation.md (Option B).
        */}
        <UnityArProvider>
          <AnimatedSplashOverlay />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="place/[id]" options={{ presentation: 'card' }} />
            <Stack.Screen name="ar" options={{ headerShown: false }} />
          </Stack>
        </UnityArProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
