import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { evaluateBadges } from '@/constants/badges';
import { BORDER, Brand, hardShadow } from '@/constants/brand';
import { useCollection } from '@/constants/collection';
import { useFlowers } from '@/hooks/use-flowers';
import { useLang } from '@/hooks/use-lang';

const TXT = {
  en: {
    title: 'Garden',
    flowers: 'flowers',
    find: 'Find it in the city',
    badges: 'Badges',
    simTitle: 'Simulate a scan (demo)',
    simHint: 'Stands in for tapping a physical NFC tag. Opens the flower as if scanned.',
  },
  ro: {
    title: 'Grădina',
    flowers: 'flori',
    find: 'Găsește-o în oraș',
    badges: 'Insigne',
    simTitle: 'Simulează o scanare (demo)',
    simHint: 'Înlocuiește atingerea unei etichete NFC fizice. Deschide floarea ca și cum ar fi scanată.',
  },
};

export default function GardenScreen() {
  const [lang] = useLang();
  const x = TXT[lang];
  const insets = useSafeAreaInsets();
  // Reactive collection store: re-renders automatically when a scan updates it, so the
  // old useFocusEffect re-read hack is no longer needed.
  const collection = useCollection();
  const flowers = useFlowers();
  const owned = collection.collectedIds;
  const badges = evaluateBadges(owned, collection.total, flowers.length);

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

      {/* Demo-only: stands in for tapping a physical NFC tag. Each button opens the
          flower via the same /f/<id> route a real tag deep-links to, which runs the
          real check-in (writes to the DB, awards points once, auto-plays the story on
          first scan). Safe to leave in for the hackathon; ignore during the pitch. */}
      <Text style={s.h2}>{x.simTitle}</Text>
      <Text style={s.count}>{x.simHint}</Text>
      <View style={s.simList}>
        {flowers.map((f) => {
          const have = owned.includes(f.id);
          return (
            <Pressable
              key={f.id}
              onPress={() => router.push(`/f/${f.id}`)}
              accessibilityRole="button"
              accessibilityLabel={`Simulate scan: ${f.name[lang]}`}
              style={({ pressed }) => [s.simBtn, pressed && s.pressed]}>
              <View style={[s.simDot, { backgroundColor: f.color }]} />
              <Text style={s.simName} numberOfLines={1}>{f.name[lang]}</Text>
              <Text style={s.simState}>{have ? '✓' : '▶'}</Text>
            </Pressable>
          );
        })}
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
  // Demo "simulate scan" controls.
  simList: { gap: 10, marginTop: 4 },
  simBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Brand.white,
    borderWidth: 2,
    borderColor: Brand.ink,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  simDot: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: Brand.ink },
  simName: { flex: 1, fontSize: 15, fontWeight: '800', color: Brand.ink },
  simState: { fontSize: 16, fontWeight: '800', color: Brand.blue },
});