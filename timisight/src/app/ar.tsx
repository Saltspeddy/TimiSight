import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { useUnityAr } from '@/components/unity-ar-host';
import { Brand } from '@/constants/brand';

// AR screen.
//
// IMPORTANT: this screen NO LONGER owns <UnityView>. The single Unity surface (and the
// Close button overlay) live in <UnityArProvider> (mounted once, as a sibling of the
// router <Stack>) and are NEVER unmounted between AR sessions. See
// .agents/tasks/ar-reopen-crash-investigation.md (Option B) — unmounting <UnityView>
// triggered `unloadUnity()` and the second-open crash.
//
// This route is now just a lightweight controller: on focus it REVEALS the persistent
// surface and tells Unity to RESUME; on blur it tells Unity to HOLD (suspend AR /
// release camera, stay warm) and HIDES the surface. No unload/teardown ever happens.
//
// The persistent Unity surface renders ABOVE the router, so on native this screen's own
// view is covered by Unity while focused. On web there is no Unity surface (the provider
// renders nothing there), so we show a fallback message instead.
export default function ArScreen() {
  const { showAndResume, hideAndHold } = useUnityAr();

  // `useFocusEffect` runs the effect when this route is FOCUSED and the cleanup when it
  // is BLURRED (navigated away from) — NOT on unmount. So:
  //   focus -> reveal the persistent Unity surface + send `resume`
  //   blur  -> send `hold` (suspend AR/camera) + hide the surface
  useFocusEffect(
    useCallback(() => {
      showAndResume();
      return () => {
        hideAndHold();
      };
    }, [showAndResume, hideAndHold])
  );

  return (
    <View style={styles.root}>
      {Platform.OS === 'web' ? (
        <View style={styles.webFallback}>
          <Text style={styles.webText}>AR is only available on device.</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Brand.ink },
  webFallback: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  webText: { color: Brand.paper, fontSize: 18, fontWeight: '800', textAlign: 'center' },
});
