import { router } from 'expo-router';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlowerIcon, tint } from '@/components/flower-icon';
import { FlowerStory } from '@/components/flower-story';

import { BORDER, Brand, hardShadow } from '@/constants/brand';
import { activateAndComplete, checkIn, useCollection, type CheckInResult } from '@/constants/collection';
import type { Lang } from '@/constants/site-data';
import { useAuth } from '@/hooks/auth';
import { useFlowers } from '@/hooks/use-flowers';
import { useLang } from '@/hooks/use-lang';
import { refreshQuests, useQuests } from '@/hooks/use-quests';

const TXT = {
  en: { watch: '▶ Watch the story', checked: 'Checked in', already: 'You already have it in your garden', alreadySub: 'Each flower pays points once.',
    total: 'Total', pts: 'pts', tap: 'Tap this flower’s NFC tag to check in and earn points.', sim: 'Simulate NFC tap (demo)',
    flower: 'The flower', place: 'The place', rewards: 'Rewards nearby', bouquet: 'Your garden',
    ranking: 'Garden ranking', notFound: 'Flower not found' },
  ro: {watch: '▶ Watch the story', checked: 'Check-in făcut', already: 'O ai deja în grădina ta', alreadySub: 'Fiecare floare oferă puncte o singură dată.',
    total: 'Total', pts: 'puncte', tap: 'Atinge eticheta NFC a acestei flori ca să faci check-in și să câștigi puncte.', sim: 'Simulează atingerea NFC (demo)',
    flower: 'Floarea', place: 'Locul', rewards: 'Recompense în apropiere', bouquet: 'Grădina ta',
    ranking: 'Clasamentul grădinii', notFound: 'Floarea nu a fost găsită' },
  de: { watch: '▶ Geschichte ansehen', checked: 'Blume gesammelt', already: 'Schon in deinem Strauß', alreadySub: 'Jede Blume bringt nur einmal Punkte.',
    total: 'Gesamt', pts: 'Punkte', tap: 'Halte dein Handy an den NFC-Tag dieser Blume, um sie zu sammeln und Punkte zu verdienen.', sim: 'NFC-Berührung simulieren (Demo)',
    flower: 'Die Blume', place: 'Der Ort', rewards: 'Vorteile in der Nähe', bouquet: 'Dein Strauß',
    ranking: 'Garten-Rangliste', notFound: 'Blume nicht gefunden' },
  hu: { watch: '▶ A történet megtekintése', checked: 'Virág összegyűjtve', already: 'Már a csokrodban van', alreadySub: 'Minden virág csak egyszer ad pontot.',
    total: 'Összesen', pts: 'pont', tap: 'Érintsd a telefonod a virág NFC-címkéjéhez, hogy összegyűjtsd, és pontokat szerezz.', sim: 'NFC-érintés szimulálása (demo)',
    flower: 'A virág', place: 'A hely', rewards: 'Közeli kedvezmények', bouquet: 'A csokrod',
    ranking: 'A kert ranglistája', notFound: 'A virág nem található' },
  sr: { watch: '▶ Погледај причу', checked: 'Цвет је сакупљен', already: 'Већ је у твом букету', alreadySub: 'Сваки цвет доноси поене само једном.',
    total: 'Укупно', pts: 'поена', tap: 'Принеси телефон NFC ознаци овог цвета да га сакупиш и зарадиш поене.', sim: 'Симулирај NFC додир (демо)',
    flower: 'Цвет', place: 'Место', rewards: 'Погодности у близини', bouquet: 'Твој букет',
    ranking: 'Ранг-листа врта', notFound: 'Цвет није пронађен' },
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View>
      <Text style={s.h2}>{title}</Text>
      {children}
    </View>
  );
}

export function FlowerView({ id, scanned = false }: { id: string; scanned?: boolean }) {
  const [lang, t] = useLang();
  const x = TXT[lang];
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();
  const flowers = useFlowers();
  const collection = useCollection();
  const quests = useQuests();
  const flower = flowers.find((f) => f.id === id);
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [story, setStory] = useState(false);
  const ran = useRef(false);

  // The check-in happens once, automatically, when the screen is opened from a tag.
  // It is async now (writes to the DB), so the result is applied inside the async body.
  // The `ran` guard ensures the RPC fires exactly once even across re-renders.
  useEffect(() => {
    if (!scanned || !flower || ran.current) return;
    // A signed-out scan cannot write (RLS would reject it); skip the RPC and leave the
    // screen as a normal flower view. The `ran` guard still prevents a retry loop.
    if (!isAuthenticated) return;
    ran.current = true;

    let active = true;
    (async () => {
      try {
        const res = await checkIn(flower.id);
        if (!active) return;
        setResult(res);
        if (!res.already) setStory(true);

        // Quest side-effects (additive, never block the scan UX). Activate any path this
        // flower starts, then check completion for every path that lists it; both RPCs are
        // idempotent server-side. A casa-muhle scan activates the demo path; collecting the
        // last stop triggers the one-time completion bonus.
        const pathIds = quests.paths
          .filter((p) => p.stops.some((st) => st.flowerId === flower.id))
          .map((p) => p.id);
        await activateAndComplete(flower.id, pathIds);
        void refreshQuests();
      } catch (e) {
        // Server rejected the check-in (e.g. transient error / unknown flower).
        // Leave the UI unchanged; the `ran` guard prevents an automatic retry.
        console.warn('[flower-view] check-in failed:', e);
      }
    })();

    return () => {
      active = false;
    };
    // `quests` is intentionally omitted: the `ran` guard makes this a one-shot effect, and
    // re-running it when the quests snapshot changes would re-fire the check-in.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanned, flower, isAuthenticated]);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

  if (!flower) {
    return (
      <View style={[s.root, s.center, { paddingTop: insets.top }]}>
        <Text style={s.h1}>{x.notFound}</Text>
        <Pressable onPress={goBack} style={[s.backBtn, { alignSelf: 'center' }]}><Text style={s.back}>← {t.back}</Text></Pressable>
      </View>
    );
  }

  const other: Lang = lang === 'en' ? 'ro' : 'en';
  const owned = collection.collectedIds
    .map((fid) => flowers.find((f) => f.id === fid))
    .filter((f) => !!f);

  return (
    <View style={s.root}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}>
        <Pressable onPress={goBack} style={s.backBtn} accessibilityRole="button">
          <Text style={s.back}>← {t.back}</Text>
        </Pressable>

        <Animated.View entering={ZoomIn.springify().damping(14)} style={[s.mat, { backgroundColor: flower.color }]}>
          <View style={s.photo}>
            {/* The statue photo if there is one, else the illustrated icon, else a drawn bloom. */}
            <FlowerIcon flower={flower} order={['photo', 'icon']} />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(250)}>
          <Text style={s.h1}>{flower.name[lang]}</Text>
          <Text style={s.sub}>{flower.name[other]}</Text>
          {flower.latinName ? <Text style={s.latin}>{flower.latinName}</Text> : null}
        </Animated.View>

        <Pressable onPress={() => setStory(true)} style={s.watch} accessibilityRole="button">
          <Text style={s.watchText}>{x.watch}</Text>
        </Pressable>

        {scanned && result && (
          <Animated.View
            entering={FadeInDown.delay(450).springify()}
            style={[s.card, result.already ? s.cardAlready : s.cardNew]}>
            <View style={{ flex: 1 }}>
              <Text style={s.cardTitle}>✓ {result.already ? x.already : x.checked}</Text>
              <Text style={s.cardSub}>
                {result.already ? `${x.alreadySub} ` : ''}{x.total}: {result.total} {x.pts}
              </Text>
            </View>
            {!result.already && (
              <Animated.View entering={ZoomIn.delay(750).springify()} style={s.earned}>
                <Text style={s.earnedText}>+{result.earned}</Text>
              </Animated.View>
            )}
          </Animated.View>
        )}

        {!scanned && (
          <>
            <Text style={s.hint}>{x.tap}</Text>
            {/* Demo only: simulates the tag. Delete before the final release. */}
            <Pressable onPress={() => router.push(`/f/${flower.id}`)} style={s.sim} accessibilityRole="button">
              <Text style={s.simText}>{x.sim}</Text>
            </Pressable>
          </>
        )}

        <Section title={x.flower}>
          <Text style={s.body}>{flower.about[lang]}</Text>
        </Section>

        <Section title={x.place}>
          <Text style={s.placeName}>{flower.place.name[lang]}</Text>
          <Text style={s.body}>{flower.place.text[lang]}</Text>
        </Section>

        <Section title={x.rewards}>
          {flower.rewards.map((r) => (
            <View key={r.id} style={s.reward}>
              <View style={{ flex: 1 }}>
                <Text style={s.rTitle}>{r.title[lang]}</Text>
                <Text style={s.rPartner}>{r.partner}</Text>
              </View>
              <View style={s.cost}><Text style={s.costText}>{r.cost} {x.pts}</Text></View>
            </View>
          ))}
        </Section>

        <Section title={x.bouquet}>
          <View style={s.dots}>
            {owned.map((f) => (
              <View key={f!.id} style={[s.dot, { backgroundColor: tint(f!.color) }, f!.id === flower.id && s.dotCurrent]}>
                {/* Icon only (a 1376px statue photo is unreadable at this size). */}
                <FlowerIcon flower={f!} order={['icon']} size={32} />
              </View>
            ))}
          </View>
        </Section>

        <Pressable onPress={() => router.push('/account')} style={s.rank} accessibilityRole="button">
          <Text style={s.rankText}>{x.ranking}</Text>
        </Pressable>
      </ScrollView>

      <FlowerStory flower={flower} lang={lang} visible={story} onClose={() => setStory(false)} />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Brand.paper },
  center: { alignItems: 'center', justifyContent: 'center', gap: 16 },
  backBtn: { alignSelf: 'flex-start', borderWidth: 2, borderColor: Brand.ink, borderRadius: 99, backgroundColor: Brand.white, paddingVertical: 5, paddingHorizontal: 14, marginBottom: 14 },
  back: { color: Brand.blue, fontWeight: '800' },
  mat: { borderWidth: BORDER, borderColor: Brand.ink, borderRadius: 20, padding: 10, ...hardShadow(6) },
  photo: { height: 260, borderRadius: 12, backgroundColor: Brand.white, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  placeholder: { color: Brand.inkFaint, fontWeight: '700' },
  h1: { fontSize: 32, lineHeight: 36, fontWeight: '800', color: Brand.ink, letterSpacing: -0.5, marginTop: 20 },
  sub: { fontSize: 19, fontStyle: 'italic', color: Brand.inkFaint, marginTop: 2 },
  latin: { fontSize: 15, fontStyle: 'italic', color: Brand.inkFaint, marginTop: 2, opacity: 0.8 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: BORDER, borderColor: Brand.ink, borderRadius: 14, padding: 14, marginTop: 20, ...hardShadow(4) },
  cardNew: { backgroundColor: Brand.yellow },
  cardAlready: { backgroundColor: Brand.white },
  cardTitle: { fontSize: 18, fontWeight: '800', color: Brand.ink },
  cardSub: { fontSize: 14, color: Brand.inkSoft, marginTop: 2 },
  earned: { backgroundColor: Brand.orange, borderWidth: 2, borderColor: Brand.ink, borderRadius: 99, paddingHorizontal: 14, paddingVertical: 6 },
  earnedText: { fontSize: 22, fontWeight: '800', color: Brand.ink },
  hint: { color: Brand.inkFaint, fontSize: 14, marginTop: 14 },
  sim: { alignSelf: 'flex-start', marginTop: 10, borderWidth: 2, borderColor: Brand.ink, borderStyle: 'dashed', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12 },
  simText: { color: Brand.ink, fontWeight: '800', fontSize: 14 },
  watch: { alignSelf: 'flex-start', marginTop: 14, backgroundColor: Brand.orange, borderWidth: 2, borderColor: Brand.ink, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14 },
  watchText: { color: Brand.ink, fontWeight: '800' },
  h2: { fontSize: 22, fontWeight: '800', color: Brand.ink, marginTop: 28, marginBottom: 10 },
  body: { fontSize: 17, lineHeight: 26, color: Brand.inkSoft },
  placeName: { fontSize: 17, fontWeight: '800', color: Brand.ink, marginBottom: 4 },
  reward: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Brand.white, borderWidth: 2, borderColor: Brand.ink, borderRadius: 12, padding: 12, marginBottom: 10 },
  rTitle: { fontSize: 16, fontWeight: '800', color: Brand.ink },
  rPartner: { fontSize: 13, color: Brand.inkFaint },
  cost: { backgroundColor: Brand.blue, borderRadius: 99, paddingHorizontal: 12, paddingVertical: 4 },
  costText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  dots: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  dot: { width: 44, height: 44, borderRadius: 22, borderWidth: 3, borderColor: Brand.ink, alignItems: 'center', justifyContent: 'center' },
  dotCurrent: { transform: [{ scale: 1.15 }], borderWidth: 4 },
  dotText: { fontWeight: '800', color: Brand.ink, fontSize: 16 },
  rank: { marginTop: 30, backgroundColor: Brand.blue, borderWidth: BORDER, borderColor: Brand.ink, borderRadius: 10, paddingVertical: 14, alignItems: 'center', ...hardShadow(4) },
  rankText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});