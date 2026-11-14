import { useState, type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Brand } from '@/constants/brand';
import type { Flower } from '@/constants/flowers';
import type { Lang } from '@/constants/site-data';
import { STORIES } from '@/constants/stories';

const TXT = {
  en: { subs: 'Subtitles', close: 'Close', video: '[Video goes here]', none: '[Add subtitles in constants/stories.ts]' },
  ro: { subs: 'Subtitrare', close: 'Închide', video: '[Aici apare videoul]', none: '[Adaugă subtitrarea în constants/stories.ts]' },
};
const COLLAPSED = 84;

export function FlowerStory({ flower, lang, visible, onClose, video, currentTime }: {
  flower: Flower; lang: Lang; visible: boolean; onClose: () => void;
  video?: ReactNode;      // put the real video player here later
  currentTime?: number;   // optional: video position in seconds, to highlight the current line
}) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const x = TXT[lang];
  const [open, setOpen] = useState(false);
  const [tr, setTr] = useState<Lang>(lang);
  const bottom = insets.bottom;
  const expanded = Math.round(height * 0.5);
  const h = useSharedValue(COLLAPSED);
  const sheet = useAnimatedStyle(() => ({ height: h.value + bottom }));

  // Snap the sheet to collapsed/expanded and keep React `open` state in sync.
  const snapTo = (toOpen: boolean) => {
    setOpen(toOpen);
    h.value = withTiming(toOpen ? expanded : COLLAPSED, { duration: 220 });
  };

  // Drag the bar to resize the sheet live; release snaps based on position/flick.
  const pan = Gesture.Pan()
    .onChange((e) => {
      // Dragging up increases height (negative translationY => taller).
      const next = h.value - e.changeY;
      // Clamp between collapsed and expanded so it can't overshoot.
      h.value = Math.min(Math.max(next, COLLAPSED), expanded);
    })
    .onEnd((e) => {
      const midpoint = (COLLAPSED + expanded) / 2;
      // A clear flick wins; otherwise snap to whichever end is nearer.
      const toOpen = e.velocityY < -300 ? true : e.velocityY > 300 ? false : h.value > midpoint;
      runOnJS(snapTo)(toOpen);
    });

  const toggle = () => snapTo(!open);
  const close = () => { setOpen(false); h.value = COLLAPSED; onClose(); };

  // A tap still toggles, but routed through gesture-handler (not a Pressable,
  // which would intercept touches and stop the pan from ever starting). Race:
  // whichever recognizes first wins — a drag pans, a quick tap toggles.
  const tap = Gesture.Tap().onEnd(() => runOnJS(toggle)());
  const barGesture = Gesture.Race(pan, tap);

  const cues = STORIES[flower.id]?.cues ?? [];
  const active = currentTime == null ? -1 : cues.reduce((a, c, i) => (c.t <= currentTime ? i : a), -1);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={close}>
      {/* A Modal mounts a detached native view tree OUTSIDE the app's root
          GestureHandlerRootView, so gestures inside it only work if the modal
          content has its own root view. Without this the drag silently fails
          and the bar behaves like a plain button. */}
      <GestureHandlerRootView style={s.root}>
        <View style={[s.fill, { paddingTop: insets.top }]}>
        <View style={s.head}>
          <Text style={s.title} numberOfLines={1}>{flower.name[lang]}</Text>
          <Pressable onPress={close} style={s.close} accessibilityRole="button" accessibilityLabel={x.close}>
            <Text style={s.closeText}>✕</Text>
          </Pressable>
        </View>

        <View style={s.video}>
          {video ?? <Text style={s.videoText}>{x.video}</Text>}
        </View>

        <Animated.View style={[s.sheet, sheet]}>
          <GestureDetector gesture={barGesture}>
            {/* Plain View (not Pressable) so it doesn't capture touches and block
                the pan. Drag up/down to resize the subtitles; a tap toggles. */}
            <View style={s.bar} accessibilityRole="adjustable" accessibilityLabel={x.subs}>
              <View style={s.grip} />
              <View style={s.barRow}>
                <Text style={s.barTitle}>CC · {x.subs}</Text>
              </View>
              {!open && <Text style={s.preview} numberOfLines={1}>{cues[Math.max(active, 0)]?.[tr] ?? ''}</Text>}
            </View>
          </GestureDetector>
          {open && (
            <>
              <View style={s.tabs}>
                {(['en', 'ro'] as Lang[]).map((l) => (
                  <Pressable key={l} onPress={() => setTr(l)} accessibilityRole="button" style={[s.tab, tr === l && s.tabOn]}>
                    <Text style={[s.tabText, tr === l && s.tabTextOn]}>{l.toUpperCase()}</Text>
                  </Pressable>
                ))}
              </View>
              <ScrollView contentContainerStyle={s.cues}>
                {cues.length === 0 ? <Text style={s.cue}>{x.none}</Text> : cues.map((c, i) => (
                  <Text key={i} style={[s.cue, i === active && s.cueOn]}>{c[tr]}</Text>
                ))}
              </ScrollView>
            </>
          )}
        </Animated.View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Brand.ink },
  fill: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8 },
  title: { flex: 1, color: '#fff', fontSize: 18, fontWeight: '800' },
  close: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  closeText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  // Vertical (portrait) video filling the space above the subtitle sheet.
  video: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  videoText: { color: '#fff', opacity: 0.7 },
  // Translucent dark overlay anchored to the bottom of the video, so the video
  // stays visible behind the subtitles. White text for contrast over it.
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(10,11,22,0.78)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  bar: { paddingHorizontal: 18, paddingTop: 10, paddingBottom: 8 },
  grip: { alignSelf: 'center', width: 48, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.6)', marginBottom: 10 },
  barRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  barTitle: { fontSize: 16, fontWeight: '800', color: '#fff' },
  preview: { fontSize: 15, fontStyle: 'italic', color: 'rgba(255,255,255,0.85)', marginTop: 4 },
  tabs: { flexDirection: 'row', gap: 8, paddingHorizontal: 18, marginBottom: 8 },
  tab: { borderWidth: 2, borderColor: '#fff', borderRadius: 99, paddingVertical: 4, paddingHorizontal: 14 },
  tabOn: { backgroundColor: '#fff' },
  tabText: { fontWeight: '800', color: '#fff' },
  tabTextOn: { color: Brand.ink },
  cues: { padding: 18, paddingTop: 4, gap: 10 },
  cue: { fontSize: 18, lineHeight: 26, color: 'rgba(255,255,255,0.8)' },
  cueOn: { color: '#fff', fontWeight: '800' },
});