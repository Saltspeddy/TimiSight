import { router } from 'expo-router';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BORDER, Brand, hardShadow } from '@/constants/brand';

// Persistent Unity-as-a-Library host for the AR screen.
//
// WHY THIS EXISTS (see .agents/tasks/ar-reopen-crash-investigation.md, Option B):
// Unity-as-a-Library can only boot ONCE per process. The old `/ar` screen owned
// <UnityView> and let it unmount on navigation, which calls `unloadUnity()` ->
// `UnityPlayer.unload()`. For this ARCore/geospatial build Unity never reports
// `onUnityPlayerUnloaded`, so the wrapper's `_isUnityUnloading` flag stays set; the
// second open is deferred (blank) then, after a 5s safety-net timeout, the wrapper
// replays the request and boots a SECOND UnityPlayer in the same process -> crash.
//
// Fix: mount a SINGLE <UnityView> ONCE, high in the tree (a sibling of the router
// <Stack>), so it NEVER unmounts between AR sessions. The `/ar` route reveals/hides
// this persistent surface instead of owning it, and sends explicit hold/resume
// signals to Unity (the wrapper's automatic window-focus pause does NOT fire when RN
// merely covers the Unity surface with another screen).
//
// `@azesmway/react-native-unity` is a NATIVE module with no web implementation, so it
// is only required on native platforms (a top-level import would crash under
// react-native-web).
const UnityView =
  Platform.OS === 'web'
    ? null
    : // Native-only module: a static top-level import would be evaluated under
      // react-native-web and crash. A guarded require() is the supported way to skip it.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      (require('@azesmway/react-native-unity').default as typeof import('@azesmway/react-native-unity').default);

type UnityViewInstance = InstanceType<NonNullable<typeof UnityView>>;

// RN <-> Unity bridge contract. These strings MUST match the Unity-side handler
// (Assets/ReactNativeBridge.cs) EXACTLY — see
// Unihack_2026_AR_QR_AND_DISTANCE/REACT_NATIVE_BRIDGE_CONTRACT.md.
const BRIDGE_GAME_OBJECT = 'ReactNativeBridge';
const BRIDGE_METHOD = 'OnHostMessage';
const MSG_HOLD = 'hold';
const MSG_RESUME = 'resume';

type UnityArContextValue = {
  /**
   * Reveal the persistent Unity surface and resume the AR session. Call when the
   * AR screen gains focus.
   */
  showAndResume: () => void;
  /**
   * Hide the persistent Unity surface and tell Unity to suspend the AR session /
   * release the camera (but stay warm). Call when the AR screen loses focus.
   */
  hideAndHold: () => void;
};

const UnityArContext = createContext<UnityArContextValue | null>(null);

/**
 * Hook used by the `/ar` screen to drive the persistent Unity surface. The
 * <UnityView> itself lives in <UnityArProvider> and is never unmounted by the
 * screen.
 */
export function useUnityAr(): UnityArContextValue {
  const ctx = useContext(UnityArContext);
  if (!ctx) {
    throw new Error('useUnityAr must be used within <UnityArProvider>');
  }
  return ctx;
}

/**
 * Provides the Unity AR control context AND renders the single persistent
 * <UnityView>. Place this ABOVE the router <Stack> (as a sibling) so the Unity
 * surface persists across every route change and is never re-created.
 *
 * The surface is kept MOUNTED at all times but is only VISIBLE while the AR
 * screen is focused. When hidden it is pushed off-screen, zeroed out, and made
 * non-interactive so it neither shows nor intercepts touches on other screens —
 * it is NOT unmounted (unmounting would trigger `unloadUnity()` and the crash
 * path). The Close button is rendered here, layered above the native Unity
 * surface, so it stays tappable (a button drawn by the /ar screen would sit
 * BENEATH the surface and be unreachable).
 */
export function UnityArProvider({ children }: PropsWithChildren) {
  const unityRef = useRef<UnityViewInstance | null>(null);
  const [visible, setVisible] = useState(false);
  const insets = useSafeAreaInsets();

  const showAndResume = useCallback(() => {
    setVisible(true);
    unityRef.current?.postMessage(BRIDGE_GAME_OBJECT, BRIDGE_METHOD, MSG_RESUME);
  }, []);

  const hideAndHold = useCallback(() => {
    // Signal Unity to suspend the session/camera BEFORE hiding the surface.
    unityRef.current?.postMessage(BRIDGE_GAME_OBJECT, BRIDGE_METHOD, MSG_HOLD);
    setVisible(false);
  }, []);

  const value = useMemo<UnityArContextValue>(
    () => ({ showAndResume, hideAndHold }),
    [showAndResume, hideAndHold]
  );

  return (
    <UnityArContext.Provider value={value}>
      {children}
      {/*
        Persistent Unity surface. Rendered AFTER `children` so that, when visible,
        it sits above the router content. When hidden it is translated fully
        off-screen, given zero opacity, and marked non-interactive so it neither
        shows nor intercepts touches, yet stays MOUNTED.
        `androidKeepPlayerMounted` makes Android window-blur PAUSE the player
        instead of tearing it down.
      */}
      {UnityView ? (
        <View
          pointerEvents={visible ? 'auto' : 'none'}
          style={visible ? styles.surfaceVisible : styles.surfaceHidden}>
          <UnityView ref={unityRef} androidKeepPlayerMounted fullScreen style={styles.fill} />

          {/* AR overlay controls, layered above the Unity surface. Shown only while
              the surface is visible (i.e. the /ar screen is focused). */}
          {visible ? (
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
          ) : null}
        </View>
      ) : null}
    </UnityArContext.Provider>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  surfaceVisible: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  // Keep mounted but off-screen + zero-opacity when not on /ar.
  surfaceHidden: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0,
    // Push fully off-screen as a second guard so nothing bleeds through.
    transform: [{ translateX: 100000 }],
  },
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
