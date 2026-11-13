import { router } from 'expo-router';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BORDER, Brand, hardShadow } from '@/constants/brand';

// Full-screen Unity AR view.
//
// `@azesmway/react-native-unity` is a NATIVE module — it has no web implementation, so
// importing/mounting it under react-native-web would crash. We only pull it in on
// native platforms and render a graceful message on web.
//
// Returning to the RN app simply pops this route. Unmounting <UnityView> triggers its
// `componentWillUnmount`, which calls `Commands.unloadUnity(...)` and tears the engine
// down — so the Close button and the Android hardware back button both unload Unity.
const UnityView =
  Platform.OS === 'web'
    ? null
    : // Native-only module: a static top-level import would be evaluated under
      // react-native-web and crash. A guarded require() is the supported way to skip it.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      (require('@azesmway/react-native-unity').default as typeof import('@azesmway/react-native-unity').default);

export default function ArScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      {UnityView ? (
        <UnityView fullScreen style={{ flex: 1 }} />
      ) : (
        <View style={styles.webFallback}>
          <Text style={styles.webText}>AR is only available on device.</Text>
        </View>
      )}

      {/* Minimal way back: overlay Close button, safe-area aware. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close AR"
        onPress={() => router.back()}
        style={({ pressed }) => [
          styles.close,
          { top: insets.top + 12 },
          pressed && styles.closePressed,
        ]}>
        <Text style={styles.closeText}>Close</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Brand.ink },
  webFallback: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  webText: { color: Brand.paper, fontSize: 18, fontWeight: '800', textAlign: 'center' },
  close: {
    position: 'absolute',
    right: 16,
    backgroundColor: Brand.blue,
    borderWidth: BORDER,
    borderColor: Brand.ink,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 18,
    ...hardShadow(4),
  },
  closePressed: { transform: [{ translateX: 2 }, { translateY: 2 }], ...hardShadow(2) },
  closeText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
