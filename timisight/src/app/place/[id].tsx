import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector, ScrollView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PLACES } from '@/constants/site-data';
import { BORDER, Brand, hardShadow } from '@/constants/brand';
import { useLang } from '@/hooks/use-lang';

function Compare({
  thenImg,
  nowImg,
  then,
  now,
}: {
  thenImg: string;
  nowImg: string;
  then: string;
  now: string;
}) {
  const { width } = useWindowDimensions();
  const frameWidth = width - 40;
  const frameHeight = frameWidth * 0.62;

  const pos = useSharedValue(frameWidth / 2);
  const start = useSharedValue(frameWidth / 2);

  const pan = Gesture.Pan()
    .onBegin(() => {
      start.value = pos.value;
    })
    .onUpdate((e) => {
      const next = start.value + e.translationX;
      pos.value = Math.max(0, Math.min(frameWidth, next));
    });

  const clipStyle = useAnimatedStyle(() => ({ width: pos.value }));
  const barStyle = useAnimatedStyle(() => ({ left: pos.value - 2 }));
  const handleStyle = useAnimatedStyle(() => ({ left: pos.value - 18 }));

  return (
    <GestureDetector gesture={pan}>
      <View style={[styles.frame, { width: frameWidth, height: frameHeight }]}>
        {/* NOW (bottom) */}
        <Image source={{ uri: nowImg }} style={StyleSheet.absoluteFill} contentFit="cover" />
        {/* THEN (clipped, sepia) */}
        <Animated.View style={[styles.clip, clipStyle]}>
          <Image
            source={{ uri: thenImg }}
            style={{ width: frameWidth, height: frameHeight }}
            contentFit="cover"
          />
          <View style={styles.sepia} />
        </Animated.View>

        <View style={[styles.tag, styles.tagL]}>
          <Text style={styles.tagText}>{then}</Text>
        </View>
        <View style={[styles.tag, styles.tagR]}>
          <Text style={styles.tagText}>{now}</Text>
        </View>

        <Animated.View style={[styles.bar, barStyle]} />
        <Animated.View style={[styles.handle, handleStyle]}>
          <Text style={styles.handleText}>⇆</Text>
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

export default function PlaceDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [lang, t] = useLang();
  const insets = useSafeAreaInsets();
  const [checked, setChecked] = useState(false);

  const place = PLACES.find((p) => p.id === id && p.live);

  if (!place) {
    return (
      <View style={[styles.root, styles.center, { paddingTop: insets.top }]}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>← {t.back}</Text>
        </Pressable>
      </View>
    );
  }

  const c = place[lang];

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.back}>← {t.back}</Text>
        </Pressable>

        {c.era ? <Text style={styles.era}>{c.era}</Text> : null}
        <Text style={styles.h1}>{c.name}</Text>
        <Text style={styles.body}>{c.text}</Text>

        <Text style={styles.h2}>{t.history}</Text>
        {place.thenImg && place.nowImg ? (
          <Compare thenImg={place.thenImg} nowImg={place.nowImg} then={t.then} now={t.now} />
        ) : null}
        <Text style={styles.hint}>{t.drag}</Text>

        <Pressable
          onPress={() => setChecked(true)}
          style={({ pressed }) => [styles.checkin, pressed && styles.checkinPressed]}>
          <Text style={styles.checkinText}>{t.checkin}</Text>
        </Pressable>
        {checked ? <Text style={styles.ok}>{t.checked}</Text> : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Brand.paper },
  center: { alignItems: 'center', justifyContent: 'center' },
  backBtn: {
    alignSelf: 'flex-start',
    borderWidth: 2,
    borderColor: Brand.ink,
    borderRadius: 99,
    backgroundColor: '#fff',
    paddingVertical: 5,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  back: { color: Brand.blue, fontWeight: '800' },
  era: { color: Brand.orange, fontStyle: 'italic', fontSize: 18, marginBottom: 4 },
  h1: { fontSize: 30, lineHeight: 34, fontWeight: '800', color: Brand.ink, letterSpacing: -0.5 },
  body: { fontSize: 17, lineHeight: 26, color: Brand.inkSoft, marginTop: 14 },
  h2: { fontSize: 22, fontWeight: '800', color: Brand.ink, marginTop: 28, marginBottom: 14 },

  frame: {
    borderWidth: BORDER,
    borderColor: Brand.ink,
    borderRadius: 10,
    overflow: 'hidden',
    alignSelf: 'center',
    backgroundColor: '#dfe6ff',
  },
  clip: { position: 'absolute', top: 0, left: 0, bottom: 0, overflow: 'hidden' },
  sepia: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(138,106,67,0.35)' },
  bar: { position: 'absolute', top: 0, bottom: 0, width: 4, backgroundColor: '#fff' },
  handle: {
    position: 'absolute',
    top: '50%',
    marginTop: -18,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: Brand.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handleText: { fontWeight: '800', color: Brand.ink },
  tag: {
    position: 'absolute',
    top: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 99,
    backgroundColor: Brand.ink,
  },
  tagL: { left: 10 },
  tagR: { right: 10 },
  tagText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  hint: { textAlign: 'center', color: Brand.inkFaint, fontSize: 14, marginTop: 10 },

  checkin: {
    marginTop: 20,
    backgroundColor: Brand.blue,
    borderWidth: BORDER,
    borderColor: Brand.ink,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    ...hardShadow(4),
  },
  checkinPressed: { transform: [{ translateX: 2 }, { translateY: 2 }], ...hardShadow(2) },
  checkinText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  ok: { marginTop: 14, fontWeight: '800', color: Brand.blue, fontSize: 15, textAlign: 'center' },
});
