import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Collapsible } from '@/components/ui/collapsible';
import { BORDER, Brand, hardShadow } from '@/constants/brand';
import { useCollection } from '@/constants/collection';
import type { Lang } from '@/constants/site-data';
import { useFlowers } from '@/hooks/use-flowers';
import { useLang } from '@/hooks/use-lang';
import { refreshQuests, useQuests, type PathQuest } from '@/hooks/use-quests';

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

  return (
    <View style={s.root}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingTop: insets.top + 20, paddingBottom: 100, gap: 16 }}
        showsVerticalScrollIndicator={false}>
        <Text style={s.h1}>{t.quests.title}</Text>

        {/* Daily Quests — on top */}
        <Collapsible title={t.quests.dailyTitle}>
          {daily ? (
            <Pressable
              onPress={() => router.push(`/f/${daily.flowerId}`)}
              accessibilityRole="button"
              style={({ pressed }) => [s.card, pressed && s.pressed]}>
              <View style={[s.dot, { backgroundColor: flowers.find((f) => f.id === daily.flowerId)?.color ?? Brand.blue }]} />
              <View style={{ flex: 1 }}>
                <Text style={s.cardName} numberOfLines={1}>{flowerName(daily.flowerId)}</Text>
                <Text style={s.cardMeta}>
                  {daily.collectedToday ? `✓ ${t.quests.dailyDone}` : t.quests.tapToScan}
                </Text>
              </View>
              <Text style={s.state}>{daily.collectedToday ? '✓' : '▶'}</Text>
            </Pressable>
          ) : (
            <Text style={s.empty}>{t.quests.dailyEmpty}</Text>
          )}
        </Collapsible>

        {/* Flower Paths — below */}
        <Collapsible title={t.quests.pathsTitle}>
          {paths.length === 0 ? (
            <Text style={s.empty}>{t.quests.pathsEmpty}</Text>
          ) : (
            <View style={{ gap: 14 }}>
              {paths.map((path) => (
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
        </Collapsible>
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
    <View style={[s.pathCard, completed && s.pathCardDone]}>
      <Text style={s.pathName}>{name}</Text>

      <View style={s.stops}>
        {path.stops.map((stop) => {
          const have = collectedIds.includes(stop.flowerId);
          return (
            <Pressable
              key={`${path.id}:${stop.position}`}
              onPress={() => router.push(`/f/${stop.flowerId}`)}
              disabled={have}
              accessibilityRole="button"
              style={({ pressed }) => [s.stopRow, !have && pressed && s.pressed]}>
              <View style={[s.stopCheck, have && s.stopCheckOn]}>
                <Text style={[s.stopCheckText, have && s.stopCheckTextOn]}>{have ? '✓' : stop.position}</Text>
              </View>
              <Text style={s.stopName} numberOfLines={1}>{flowerName(stop.flowerId)}</Text>
              {!have ? <Text style={s.stopTap}>{tapLabel}</Text> : null}
            </Pressable>
          );
        })}
      </View>

      <View style={s.bonusRow}>
        <Text style={s.bonusLabel}>{bonusLabel}</Text>
        <Text style={s.bonusValue}>{path.completionBonus} {pointsLabel}</Text>
      </View>

      {completed ? (
        <Text style={s.pathDone}>
          🗺️ {doneLabel}{path.badge ? ` · ${badgeLabel}` : ''}
        </Text>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Brand.paper },
  h1: { fontSize: 32, fontWeight: '800', color: Brand.ink, letterSpacing: -0.5 },
  empty: { fontSize: 14, color: Brand.inkFaint, fontStyle: 'italic' },

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
