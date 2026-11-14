import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BORDER, Brand, hardShadow } from '@/constants/brand';
import { useCollection } from '@/constants/collection';
import type { Lang } from '@/constants/site-data';
import { useFlowers } from '@/hooks/use-flowers';
import { useLang } from '@/hooks/use-lang';
import { refreshQuests, useQuests, type PathQuest } from '@/hooks/use-quests';

/**
 * On-theme collapsible section, styled with the app's neo-brutalist Brand tokens
 * (paper surface, ink border, hard shadow) instead of the generic dark-themed
 * `components/ui/collapsible`. Kept local to this screen so it can match the house
 * style exactly; the header is a comfortable tap target.
 */
function Section({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <View style={sx.section}>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        accessibilityRole="button"
        style={({ pressed }) => [sx.header, pressed && sx.headerPressed]}>
        <MaterialIcons
          name={open ? 'keyboard-arrow-down' : 'chevron-right'}
          size={24}
          color={Brand.ink}
        />
        <Text style={sx.headerTitle}>{title}</Text>
      </Pressable>
      {open ? (
        <Animated.View entering={FadeIn.duration(180)} style={sx.sectionBody}>
          {children}
        </Animated.View>
      ) : null}
    </View>
  );
}

export default function QuestsScreen() {
  const [lang, t] = useLang();
  const insets = useSafeAreaInsets();
  const { paths, daily } = useQuests();
  const collection = useCollection();
  const flowers = useFlowers();

  // Refresh server-derived quest state on focus (same pattern as the old leaderboard screen).
  useFocusEffect(
    useCallback(() => {
      void refreshQuests();
    }, []),
  );

  const flowerName = (flowerId: string): string =>
    flowers.find((f) => f.id === flowerId)?.name[lang] ?? flowerId;

  // Only paths the user has actually activated (by discovering the start flower) are shown.
  // Until then, the section renders a hint prompting discovery of Casa Mühle — not the
  // catalogue of not-yet-unlocked paths.
  const activePaths = paths.filter((p) => p.activated);

  return (
    <View style={sx.root}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingTop: insets.top + 20, paddingBottom: 100, gap: 16 }}
        showsVerticalScrollIndicator={false}>
        <Text style={sx.h1}>{t.quests.title}</Text>

        {/* Daily Quests — on top */}
        <Section title={t.quests.dailyTitle}>
          {daily ? (
            <Pressable
              onPress={() => router.push(`/f/${daily.flowerId}`)}
              accessibilityRole="button"
              style={({ pressed }) => [sx.card, pressed && sx.pressed]}>
              <View style={[sx.dot, { backgroundColor: flowers.find((f) => f.id === daily.flowerId)?.color ?? Brand.blue }]} />
              <View style={{ flex: 1 }}>
                <Text style={sx.cardName} numberOfLines={1}>{flowerName(daily.flowerId)}</Text>
                <Text style={sx.cardMeta}>
                  {daily.collectedToday ? `✓ ${t.quests.dailyDone}` : t.quests.tapToScan}
                </Text>
              </View>
              <Text style={sx.state}>{daily.collectedToday ? '✓' : '▶'}</Text>
            </Pressable>
          ) : (
            <Text style={sx.empty}>{t.quests.dailyEmpty}</Text>
          )}
        </Section>

        {/* Flower Paths — below. Shows a discovery hint until at least one path is activated. */}
        <Section title={t.quests.pathsTitle}>
          {activePaths.length === 0 ? (
            <View style={sx.hintBox}>
              <Text style={sx.hintText}>{t.quests.pathsHint}</Text>
            </View>
          ) : (
            <View style={{ gap: 14 }}>
              {activePaths.map((path) => (
                <PathCard
                  key={path.id}
                  path={path}
                  lang={lang}
                  pointsLabel={t.points}
                  bonusLabel={t.quests.bonus}
                  doneLabel={t.quests.pathDone}
                  badgeLabel={t.quests.badgeEarned}
                  tapLabel={t.quests.tapToScan}
                  collectedIds={collection.collectedIds}
                  flowerName={flowerName}
                />
              ))}
            </View>
          )}
        </Section>
      </ScrollView>
    </View>
  );
}

function PathCard({
  path,
  lang,
  pointsLabel,
  bonusLabel,
  doneLabel,
  badgeLabel,
  tapLabel,
  collectedIds,
  flowerName,
}: {
  path: PathQuest;
  lang: Lang;
  pointsLabel: string;
  bonusLabel: string;
  doneLabel: string;
  badgeLabel: string;
  tapLabel: string;
  collectedIds: string[];
  flowerName: (flowerId: string) => string;
}) {
  const completed = !!path.completedAt;
  const name = lang === 'ro' ? path.nameRo : path.nameEn;

  return (
    <View style={[sx.pathCard, completed && sx.pathCardDone]}>
      <Text style={sx.pathName}>{name}</Text>

      <View style={sx.stops}>
        {path.stops.map((stop) => {
          const have = collectedIds.includes(stop.flowerId);
          return (
            <Pressable
              key={`${path.id}:${stop.position}`}
              onPress={() => router.push(`/f/${stop.flowerId}`)}
              disabled={have}
              accessibilityRole="button"
              style={({ pressed }) => [sx.stopRow, !have && pressed && sx.pressed]}>
              <View style={[sx.stopCheck, have && sx.stopCheckOn]}>
                <Text style={[sx.stopCheckText, have && sx.stopCheckTextOn]}>{have ? '✓' : stop.position}</Text>
              </View>
              <Text style={sx.stopName} numberOfLines={1}>{flowerName(stop.flowerId)}</Text>
              {!have ? <Text style={sx.stopTap}>{tapLabel}</Text> : null}
            </Pressable>
          );
        })}
      </View>

      <View style={sx.bonusRow}>
        <Text style={sx.bonusLabel}>{bonusLabel}</Text>
        <Text style={sx.bonusValue}>{path.completionBonus} {pointsLabel}</Text>
      </View>

      {completed ? (
        <Text style={sx.pathDone}>
          🗺️ {doneLabel}{path.badge ? ` · ${badgeLabel}` : ''}
        </Text>
      ) : null}
    </View>
  );
}

const sx = StyleSheet.create({
  root: { flex: 1, backgroundColor: Brand.paper },
  h1: { fontSize: 32, fontWeight: '800', color: Brand.ink, letterSpacing: -0.5 },
  empty: { fontSize: 14, color: Brand.inkFaint, fontStyle: 'italic' },

  // On-theme collapsible section chrome (replaces the dark generic Collapsible).
  section: {
    borderWidth: BORDER,
    borderColor: Brand.ink,
    borderRadius: 16,
    backgroundColor: Brand.paper,
    overflow: 'hidden',
    ...hardShadow(4),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 54,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: Brand.yellow,
  },
  headerPressed: { opacity: 0.85 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: Brand.ink, letterSpacing: -0.3 },
  sectionBody: { padding: 14, gap: 14 },

  hintBox: {
    borderWidth: 2,
    borderColor: Brand.inkFaint,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 16,
    backgroundColor: Brand.white,
  },
  hintText: { fontSize: 14, color: Brand.inkSoft, fontStyle: 'italic' },

  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Brand.white, borderWidth: 2, borderColor: Brand.ink, borderRadius: 12, padding: 12, ...hardShadow(4) },
  pressed: { transform: [{ translateX: 2 }, { translateY: 2 }], ...hardShadow(2) },
  dot: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: Brand.ink },
  cardName: { fontSize: 15, fontWeight: '800', color: Brand.ink },
  cardMeta: { fontSize: 13, color: Brand.inkFaint, marginTop: 2 },
  state: { fontSize: 16, fontWeight: '800', color: Brand.blue },

  pathCard: { backgroundColor: Brand.white, borderWidth: BORDER, borderColor: Brand.ink, borderRadius: 14, padding: 14, gap: 10, ...hardShadow(4) },
  pathCardDone: { backgroundColor: Brand.yellow },
  pathName: { fontSize: 18, fontWeight: '800', color: Brand.ink },
  stops: { gap: 8 },
  stopRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 2, borderColor: Brand.ink, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10, backgroundColor: Brand.paper },
  stopCheck: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: Brand.ink, alignItems: 'center', justifyContent: 'center', backgroundColor: Brand.white },
  stopCheckOn: { backgroundColor: Brand.blue },
  stopCheckText: { fontSize: 13, fontWeight: '800', color: Brand.ink },
  stopCheckTextOn: { color: '#fff' },
  stopName: { flex: 1, fontSize: 15, fontWeight: '800', color: Brand.ink },
  stopTap: { fontSize: 12, fontWeight: '800', color: Brand.blue },

  bonusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bonusLabel: { fontSize: 14, fontWeight: '800', color: Brand.ink },
  bonusValue: { fontSize: 14, fontWeight: '800', color: Brand.inkSoft },
  pathDone: { fontSize: 15, fontWeight: '800', color: Brand.ink },
});
