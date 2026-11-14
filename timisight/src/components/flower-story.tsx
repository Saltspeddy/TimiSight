import { Image } from 'expo-image';
import { useState, type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BORDER, Brand } from '@/constants/brand';
import type { Flower } from '@/constants/flowers';
import type { Lang } from '@/constants/site-data';
import { STORIES } from '@/constants/stories';

const TXT = {
  en: { subs: 'Subtitles', close: 'Close', video: '[Video goes here]', none: '[Add subtitles in constants/stories.ts]', pts: 'pts' },
  ro: { subs: 'Subtitrare', close: 'Închide', video: '[Aici apare videoul]', none: '[Adaugă subtitrarea în constants/stories.ts]', pts: 'puncte' },
};
const COLLAPSED = 84;

export function FlowerStory({ flower, lang, visible, onClose, video, currentTime }: {
  flower: Flower; lang: Lang; visible: boolean; onClose: () => void;
  video?: ReactNode;      // put the real video player here later
  currentTime?: number;   // optional: video position in seconds, to highlight the current line
}) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const x = TXT[lang];
  const [open, setOpen] = useState(false);
  const [tr, setTr] = useState<Lang>(lang);
  const bottom = insets.bottom;
  const expanded = Math.round(height * 0.5);
  const h = useSharedValue(COLLAPSED);
  const sheet = useAnimatedStyle(() => ({ height: h.value + bottom }));

  const toggle = () => {
    const next = !open;
    setOpen(next);
    h.value = withTiming(next ? expanded : COLLAPSED, { duration: 250 });
  };
  const close = () => { setOpen(false); h.value = COLLAPSED; onClose(); };

  const cues = STORIES[flower.id]?.cues ?? [];
  const active = currentTime == null ? -1 : cues.reduce((a, c, i) => (c.t <= currentTime ? i : a), -1);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={close}>
      <View style={[s.root, { paddingTop: insets.top }]}>
        <View style={s.head}>
          <Text style={s.title} numberOfLines={1}>{flower.name[lang]}</Text>
          <Pressable onPress={close} style={s.close} accessibilityRole="button" accessibilityLabel={x.close}>
            <Text style={s.closeText}>✕</Text>
          </Pressable>
        </View>

        <View style={[s.video, { width, height: (width * 9) / 16 }]}>
          {video ?? <Text style={s.videoText}>{x.video}</Text>}
        </View>

        <View style={s.mid}>
          <View style={[s.mat, { backgroundColor: flower.color }]}>
            {flower.image ? <Image source={flower.image} style={StyleSheet.absoluteFill} contentFit="contain" /> : null}
          </View>
          <View style={s.chip}><Text style={s.chipText}>+{flower.points} {x.pts}</Text></View>
        </View>

        <Animated.View style={[s.sheet, sheet]}>
          <Pressable onPress={toggle} style={s.bar} accessibilityRole="button" accessibilityLabel={x.subs}>
            <View style={s.grip} />
            <View style={s.barRow}>
              <Text style={s.barTitle}>CC · {x.subs}</Text>
              <Text style={s.chev}>{open ? '▼' : '▲'}</Text>
            </View>
            {!open && <Text style={s.preview} numberOfLines={1}>{cues[Math.max(active, 0)]?.[tr] ?? ''}</Text>}
          </Pressable>
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
    </Modal>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Brand.ink },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8 },
  title: { flex: 1, color: '#fff', fontSize: 18, fontWeight: '800' },
  close: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  closeText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  video: { backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  videoText: { color: '#fff', opacity: 0.7 },
  mid: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  mat: { width: '65%', maxWidth: 260, aspectRatio: 1, borderRadius: 20, borderWidth: BORDER, borderColor: Brand.paper, overflow: 'hidden' },
  chip: { marginTop: 14, backgroundColor: Brand.yellow, borderRadius: 99, paddingHorizontal: 16, paddingVertical: 6 },
  chipText: { color: Brand.ink, fontWeight: '800', fontSize: 16 },
  sheet: { backgroundColor: Brand.paper, borderTopLeftRadius: 20, borderTopRightRadius: 20, borderTopWidth: BORDER, borderColor: Brand.paper, overflow: 'hidden' },
  bar: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 6 },
  grip: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: Brand.inkFaint, marginBottom: 8 },
  barRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  barTitle: { fontSize: 16, fontWeight: '800', color: Brand.ink },
  chev: { fontSize: 14, color: Brand.ink },
  preview: { fontSize: 15, fontStyle: 'italic', color: Brand.inkSoft, marginTop: 4 },
  tabs: { flexDirection: 'row', gap: 8, paddingHorizontal: 18, marginBottom: 8 },
  tab: { borderWidth: 2, borderColor: Brand.ink, borderRadius: 99, paddingVertical: 4, paddingHorizontal: 14 },
  tabOn: { backgroundColor: Brand.ink },
  tabText: { fontWeight: '800', color: Brand.ink },
  tabTextOn: { color: Brand.paper },
  cues: { padding: 18, paddingTop: 4, gap: 10 },
  cue: { fontSize: 18, lineHeight: 26, color: Brand.inkSoft },
  cueOn: { color: Brand.ink, fontWeight: '800' },
});