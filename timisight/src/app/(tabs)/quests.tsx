import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Constants from 'expo-constants';
import { GoogleMaps } from 'expo-maps';
import { router, useFocusEffect } from 'expo-router';
import { Component, useCallback, useState, type ReactNode } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BORDER, Brand, hardShadow } from '@/constants/brand';
import { useCollection } from '@/constants/collection';
import type { Flower } from '@/constants/flowers';
import type { Lang, Tr } from '@/constants/site-data';
import { useFlowers } from '@/hooks/use-flowers';
import { useLang } from '@/hooks/use-lang';
import { useProximity } from '@/hooks/use-proximity';
import { refreshQuests, useQuests, type PathQuest } from '@/hooks/use-quests';
import type { Temperature } from '@/lib/geo';
import { setSimulatedLocation, useSimulatedLocation } from '@/lib/location';

// Flat daily-quest completion bonus, shown on the daily card. Must match DAILY_BONUS in
// web/supabase/quests.sql (complete_daily_if_done) — the award itself happens server-side.
const DAILY_BONUS = 100;

// Hot/cold band → accent color for the temperature chip. Literal hex (Brand has no
// green/red tokens); warm end = orange/yellow (Brand), cold end = blue/grey.
const TEMP_COLOR: Record<Temperature, string> = {
  arrived: '#1f9d55',
  hot: Brand.orange,
  warm: '#ff9f43',
  cool: '#5aa9e6',
  cold: Brand.blue,
  freezing: '#6b7280',
};

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

/**
 * Hot/cold proximity hint toward one target flower (the next uncollected stop on a path).
 * Shows a temperature chip, a warmer/colder trend, and a compass bearing — never the exact
 * coordinates. When the target is the INDOOR final stop and the user is within "hot" range,
 * it swaps the noisy warmer/colder feedback for a fixed "head inside and scan" message, so
 * flaky indoor GPS doesn't flicker. `isFinalStop` marks that last-stop behavior.
 */
function HotColdHint({
  flower,
  isFinalStop,
  t,
}: {
  flower: Flower;
  isFinalStop: boolean;
  t: Tr;
}) {
  const target =
    flower.lat != null && flower.lng != null
      ? { latitude: flower.lat, longitude: flower.lng }
      : null;
  const prox = useProximity(target);

  // No coordinates for this flower → no hint at all (feature degrades silently).
  if (!target) return null;

  if (prox.permission === 'denied') {
    return (
      <View style={sx.hintBox}>
        <Text style={sx.hintText}>{t.quests.locationDenied}</Text>
      </View>
    );
  }

  if (!prox.hasFix || prox.temperature == null) {
    return (
      <View style={sx.proxCard}>
        <Text style={sx.proxLocating}>{t.quests.locating}</Text>
      </View>
    );
  }

  const nearBuilding = prox.temperature === 'arrived' || prox.temperature === 'hot';
  // Indoor finale: once close, stop the warmer/colder game and just send them inside.
  if (isFinalStop && nearBuilding) {
    return (
      <View style={[sx.proxCard, { borderColor: TEMP_COLOR.arrived }]}>
        <Text style={[sx.proxTemp, { color: TEMP_COLOR.arrived }]}>🚪 {t.quests.headInside}</Text>
      </View>
    );
  }

  const tempLabel = t.quests.temp[prox.temperature];
  const trendLabel =
    prox.trend === 'warmer' ? t.quests.warmer : prox.trend === 'colder' ? t.quests.colder : null;
  const dist = prox.distanceMeters ?? 0;
  const distText = dist >= 1000 ? `${(dist / 1000).toFixed(1)} km` : `${Math.round(dist)} m`;

  return (
    <View style={[sx.proxCard, { borderColor: TEMP_COLOR[prox.temperature] }]}>
      <View style={sx.proxRow}>
        <Text style={[sx.proxTemp, { color: TEMP_COLOR[prox.temperature] }]}>{tempLabel}</Text>
        {prox.compass ? (
          <View style={sx.compass}>
            <MaterialIcons
              name="navigation"
              size={18}
              color={Brand.ink}
              style={{ transform: [{ rotate: `${prox.bearing ?? 0}deg` }] }}
            />
            <Text style={sx.compassText}>{prox.compass}</Text>
          </View>
        ) : null}
      </View>
      <Text style={sx.proxMeta}>
        ~{distText} {t.quests.distanceAway}
        {trendLabel ? ` · ${trendLabel}` : ''}
      </Text>
    </View>
  );
}

// Whether a Google Maps Android key was baked into the build (via app.config.js → .env).
// Read from Constants.expoConfig.extra, which app.config.js sets reliably (the android.config
// block is NOT reliably serialized into the runtime config, so we must NOT read the key path
// directly). Without a key, GoogleMaps.View throws a NATIVE IllegalStateException that a React
// error boundary cannot catch and that crashes the app — so this gate is the real safeguard.
const HAS_MAPS_KEY = (Constants.expoConfig?.extra as any)?.hasGoogleMapsKey === true;

/**
 * Error boundary around the native map. Catches JS-side render errors (e.g. the expo-maps
 * module missing from a dev build) and degrades to a placeholder. NOTE: a missing API key
 * throws a NATIVE IllegalStateException on the UI thread, which React cannot catch — the
 * HAS_MAPS_KEY gate (not this boundary) is what prevents that crash.
 */
class MapErrorBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.warn('[quests] map failed to render:', error);
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/**
 * Daily-quest map pin. Android-only (expo-maps = Google Maps on Android); the project ships
 * Android only. Shows a single marker at the flower's GENERAL location — no hot/cold, no
 * precise guidance.
 *
 * Renders nothing when there are no coordinates or not on Android. When no Maps key is baked
 * in (the pre-setup state), it shows a short hint instead of the map — see docs/maps-setup.md.
 * The native view is wrapped in an error boundary so a maps problem degrades to a placeholder
 * rather than crashing the tab.
 */
function DailyMap({ flower, title, hint }: { flower: Flower; title: string; hint: string }) {
  if (flower.lat == null || flower.lng == null) return null;
  if (Platform.OS !== 'android') return null; // Android-only build; no iOS map today.

  if (!HAS_MAPS_KEY) {
    return (
      <View style={[sx.mapWrap, sx.mapPlaceholder]}>
        <MaterialIcons name="map" size={28} color={Brand.inkFaint} />
        <Text style={sx.mapHint}>{hint}</Text>
      </View>
    );
  }

  const coordinates = { latitude: flower.lat, longitude: flower.lng };
  return (
    <MapErrorBoundary
      fallback={
        <View style={[sx.mapWrap, sx.mapPlaceholder]}>
          <MaterialIcons name="map" size={28} color={Brand.inkFaint} />
          <Text style={sx.mapHint}>{hint}</Text>
        </View>
      }>
      <View style={sx.mapWrap}>
        <GoogleMaps.View
          style={StyleSheet.absoluteFill}
          cameraPosition={{ coordinates, zoom: 15 }}
          markers={[{ coordinates, title }]}
        />
      </View>
    </MapErrorBoundary>
  );
}

/**
 * DEV-ONLY simulation panel. Lets you drop the player's position onto any quest flower (or
 * clear it) so the hot/cold flow can be rehearsed without walking. Rendered only under
 * __DEV__; the location seam ignores the override entirely in production, so this has no
 * effect in a release build even if it somehow rendered.
 */
function DevSimPanel({ flowers, t }: { flowers: Flower[]; t: Tr }) {
  const sim = useSimulatedLocation();
  const withCoords = flowers.filter((f) => f.lat != null && f.lng != null);
  if (withCoords.length === 0) return null;

  return (
    <View style={sx.devPanel}>
      <Text style={sx.devTitle}>{t.quests.devSimTitle}</Text>
      <View style={sx.devRow}>
        {withCoords.map((f) => {
          const on = sim?.latitude === f.lat && sim?.longitude === f.lng;
          return (
            <Pressable
              key={f.id}
              onPress={() => setSimulatedLocation({ latitude: f.lat!, longitude: f.lng! })}
              style={[sx.devChip, on && sx.devChipOn]}>
              <Text style={[sx.devChipText, on && sx.devChipTextOn]}>{f.name.en}</Text>
            </Pressable>
          );
        })}
        <Pressable onPress={() => setSimulatedLocation(null)} style={[sx.devChip, sx.devClear]}>
          <Text style={sx.devChipText}>{t.quests.devSimClear}</Text>
        </Pressable>
      </View>
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

  const flowerById = (flowerId: string): Flower | undefined =>
    flowers.find((f) => f.id === flowerId);
  const flowerName = (flowerId: string): string => flowerById(flowerId)?.name[lang] ?? flowerId;

  const dailyFlower = daily ? flowerById(daily.flowerId) : undefined;
  // The daily map only renders on Android (expo-maps = Google Maps there) and when the
  // flower has coordinates. Gate the section header on the same condition as <DailyMap/>.
  const showDailyMap =
    Platform.OS === 'android' && dailyFlower?.lat != null && dailyFlower?.lng != null;

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
            <>
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
                  <Text style={sx.cardBonus}>{t.quests.dailyBonus}: +{DAILY_BONUS} {t.points}</Text>
                </View>
                <Text style={sx.state}>{daily.collectedToday ? '✓' : '▶'}</Text>
              </Pressable>
              {/* General map pin for the daily flower (no hot/cold — just where to look).
                  Title + map are gated on the SAME condition (Android + coordinates present)
                  so the "Where to look" header never dangles above an empty space. */}
              {showDailyMap && dailyFlower ? (
                <>
                  <Text style={sx.mapTitle}>{t.quests.mapTitle}</Text>
                  <DailyMap
                    flower={dailyFlower}
                    title={flowerName(daily.flowerId)}
                    hint={t.quests.mapUnavailable}
                  />
                </>
              ) : null}
            </>
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
                  t={t}
                  collectedIds={collection.collectedIds}
                  flowerById={flowerById}
                  flowerName={flowerName}
                />
              ))}
            </View>
          )}
        </Section>

        {/* DEV-only: simulate position so hot/cold can be rehearsed without walking. */}
        {__DEV__ ? <DevSimPanel flowers={flowers} t={t} /> : null}
      </ScrollView>
    </View>
  );
}

function PathCard({
  path,
  lang,
  t,
  collectedIds,
  flowerById,
  flowerName,
}: {
  path: PathQuest;
  lang: Lang;
  t: Tr;
  collectedIds: string[];
  flowerById: (flowerId: string) => Flower | undefined;
  flowerName: (flowerId: string) => string;
}) {
  const completed = !!path.completedAt;
  const name = lang === 'ro' ? path.nameRo : path.nameEn;

  // The next uncollected stop (stops are already position-ordered) is the hot/cold target.
  // The final stop in the list is treated as the indoor finale (graceful "head inside").
  const nextStop = path.stops.find((s) => !collectedIds.includes(s.flowerId));
  const lastPosition = path.stops.length ? path.stops[path.stops.length - 1].position : -1;
  const nextFlower = nextStop ? flowerById(nextStop.flowerId) : undefined;

  return (
    <View style={[sx.pathCard, completed && sx.pathCardDone]}>
      <Text style={sx.pathName}>{name}</Text>

      {/* Hot/cold hint toward the next uncollected stop (no hint once the path is done). */}
      {!completed && nextStop && nextFlower ? (
        <View style={{ gap: 6 }}>
          <Text style={sx.nextLabel}>
            {t.quests.nextStop}: {flowerName(nextStop.flowerId)}
          </Text>
          <HotColdHint
            flower={nextFlower}
            isFinalStop={nextStop.position === lastPosition}
            t={t}
          />
        </View>
      ) : null}

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
              {!have ? <Text style={sx.stopTap}>{t.quests.tapToScan}</Text> : null}
            </Pressable>
          );
        })}
      </View>

      <View style={sx.bonusRow}>
        <Text style={sx.bonusLabel}>{t.quests.bonus}</Text>
        <Text style={sx.bonusValue}>{path.completionBonus} {t.points}</Text>
      </View>

      {completed ? (
        <Text style={sx.pathDone}>
          🗺️ {t.quests.pathDone}{path.badge ? ` · ${t.quests.badgeEarned}` : ''}
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
  cardBonus: { fontSize: 12, fontWeight: '800', color: Brand.blue, marginTop: 3 },
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

  // Hot/cold proximity hint.
  nextLabel: { fontSize: 13, fontWeight: '800', color: Brand.inkFaint },
  proxCard: {
    borderWidth: 2,
    borderColor: Brand.ink,
    borderRadius: 12,
    backgroundColor: Brand.paper,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 4,
  },
  proxRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  proxTemp: { fontSize: 17, fontWeight: '800' },
  proxMeta: { fontSize: 13, color: Brand.inkSoft, fontWeight: '700' },
  proxLocating: { fontSize: 13, color: Brand.inkFaint, fontStyle: 'italic' },
  compass: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  compassText: { fontSize: 13, fontWeight: '800', color: Brand.ink },

  // Daily-quest map.
  mapTitle: { fontSize: 13, fontWeight: '800', color: Brand.inkFaint, marginTop: 4 },
  mapWrap: {
    height: 180,
    borderWidth: 2,
    borderColor: Brand.ink,
    borderRadius: 12,
    overflow: 'hidden',
    ...hardShadow(3),
  },
  mapPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    backgroundColor: Brand.white,
  },
  mapHint: { fontSize: 13, color: Brand.inkFaint, fontStyle: 'italic', textAlign: 'center' },

  // DEV-only simulation panel.
  devPanel: {
    borderWidth: 2,
    borderColor: Brand.orange,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 12,
    gap: 8,
    backgroundColor: Brand.white,
  },
  devTitle: { fontSize: 12, fontWeight: '800', color: Brand.orange, letterSpacing: 0.5 },
  devRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  devChip: { borderWidth: 2, borderColor: Brand.ink, borderRadius: 99, paddingVertical: 5, paddingHorizontal: 10, backgroundColor: Brand.paper },
  devChipOn: { backgroundColor: Brand.blue },
  devClear: { backgroundColor: Brand.yellow },
  devChipText: { fontSize: 12, fontWeight: '800', color: Brand.ink },
  devChipTextOn: { color: '#fff' },
});
