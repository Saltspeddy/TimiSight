import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { evaluateBadges } from '@/constants/badges';
import { BORDER, Brand, hardShadow } from '@/constants/brand';
import { collectedIds, totalPoints } from '@/constants/collection';
import { useFlowers } from '@/hooks/use-flowers';
import { useLang } from '@/hooks/use-lang';

const TXT = {
  en: { title: 'Garden', flowers: 'flowers', find: 'Find it in the city', badges: 'Badges' },
  ro: { title: 'Grădina', flowers: 'flori', find: 'Găsește-o în oraș', badges: 'Insigne' },
};

export default function GardenScreen() {
  const [lang] = useLang();
  const x = TXT[lang];
  const insets = useSafeAreaInsets();
  const [, refresh] = useState(0);
  useFocusEffect(useCallback(() => { refresh((n) => n + 1); }, [])); // re-read when the tab is shown
  const flowers = useFlowers();
  const owned = collectedIds();
  const badges = evaluateBadges(owned, totalPoints(), flowers.length);

  return (
    <ScrollView style={{ backgroundColor: Brand.paper }}
      contentContainerStyle={{ padding: 20, paddingTop: insets.top + 24, paddingBottom: 120, gap: 16 }}>
      <Text style={s.h1}>{x.title}</Text>
      <Text style={s.count}>{owned.length} / {flowers.length} {x.flowers}</Text>

      <View style={s.grid}>
        {flowers.map((f) =>
          owned.includes(f.id) ? (
            <Pressable key={f.id} onPress={() => router.push(`/place/${f.id}`)} accessibilityRole="button"
              accessibilityLabel={f.name[lang]} style={({ pressed }) => [s.card, pressed && s.pressed]}>
              <View style={[s.thumb, { backgroundColor: f.color }]}>
                {f.image ? <Image source={f.image} style={StyleSheet.absoluteFill} contentFit="contain" /> : null}
              </View>
              <Text style={s.name} numberOfLines={2}>{f.name[lang]}</Text>
            </Pressable>
          ) : (
            <View key={f.id} style={[s.card, s.locked]}>
              <Text style={s.q}>?</Text>
              <Text style={s.lockText}>{x.find}</Text>
            </View>
          ),
        )}
      </View>

      <Text style={s.h2}>{x.badges}</Text>
      <View style={s.grid}>
        {badges.map((b) => (
          <View key={b.id} style={[s.badge, b.earned ? s.badgeOn : s.badgeOff]}>
            <Text style={s.badgeEmoji}>{b.emoji}</Text>
            <Text style={s.badgeTitle} numberOfLines={2}>{b.title[lang]}</Text>
            <Text style={s.badgeProg}>{b.earned ? '✓' : `${b.value}/${b.goal}`}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  h1: { fontSize: 32, fontWeight: '800', color: Brand.ink, letterSpacing: -0.5, paddingRight: 60 },
  count: { fontSize: 16, fontStyle: 'italic', color: Brand.inkSoft },
  h2: { fontSize: 22, fontWeight: '800', color: Brand.ink, marginTop: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  // Fixed ~half-width so cards tile two-per-row. No flexGrow: a lone card on the
  // last row keeps its size instead of stretching to fill the whole row.
  card: { width: '47%', backgroundColor: Brand.white, borderWidth: BORDER, borderColor: Brand.ink, borderRadius: 16, padding: 10, gap: 8, ...hardShadow(4) },
  pressed: { transform: [{ translateX: 2 }, { translateY: 2 }], ...hardShadow(2) },
  thumb: { aspectRatio: 1, borderRadius: 12, borderWidth: 2, borderColor: Brand.ink, overflow: 'hidden' },
  name: { fontSize: 16, fontWeight: '800', color: Brand.ink },
  locked: { borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', minHeight: 170, shadowOpacity: 0, elevation: 0, backgroundColor: 'transparent' },
  q: { fontSize: 44, fontWeight: '800', color: Brand.inkFaint },
  lockText: { fontSize: 14, fontStyle: 'italic', color: Brand.inkFaint, textAlign: 'center' },
  badge: { width: '31%', alignItems: 'center', gap: 4, borderWidth: 2, borderColor: Brand.ink, borderRadius: 14, padding: 10 },
  badgeOn: { backgroundColor: Brand.yellow },
  badgeOff: { backgroundColor: Brand.white, opacity: 0.6 },
  badgeEmoji: { fontSize: 30 },
  badgeTitle: { fontSize: 12, fontWeight: '800', color: Brand.ink, textAlign: 'center' },
  badgeProg: { fontSize: 12, color: Brand.inkSoft },
});