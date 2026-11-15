import { router } from 'expo-router';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { BORDER, Brand, hardShadow } from '@/constants/brand';
import { RC } from '@/constants/roles';
import { useLang } from '@/hooks/use-lang';
import { useQuery } from '@/hooks/use-query';
import { listArtists } from '@/lib/commissions';

// The artist directory, for organizations: browse artists and open one to request a statue.
export default function ArtistsScreen() {
  const [lang] = useLang();
  const c = RC[lang];
  const insets = useSafeAreaInsets();
  const { data, error, loading, reload } = useQuery('artists', listArtists);

  return (
    <ScrollView
      style={s.root}
      refreshControl={<RefreshControl refreshing={false} onRefresh={reload} />}
      contentContainerStyle={{ padding: 20, paddingTop: insets.top + 20, paddingBottom: 100, gap: 14 }}
      showsVerticalScrollIndicator={false}>
      <Text style={s.h1}>{c.artistsTitle}</Text>
      <Text style={s.sub}>{c.artistsText}</Text>

      {loading && !data ? <ActivityIndicator color={Brand.ink} style={{ marginTop: 20 }} /> : null}

      {error && !data ? (
        <View style={{ gap: 12 }}>
          <Text style={s.problem}>{c.errGeneric}</Text>
          <Button label={c.retry} onPress={reload} variant="ghost" />
        </View>
      ) : null}

      {data && data.length === 0 ? <Text style={s.empty}>{c.artistsEmpty}</Text> : null}

      {data?.map((a) => (
        <Pressable
          key={a.sub}
          accessibilityRole="button"
          onPress={() => router.push({ pathname: '/artist/[sub]', params: { sub: a.sub } })}
          style={({ pressed }) => [s.card, pressed && s.pressed]}>
          <View style={s.row}>
            <Text style={s.name} numberOfLines={1}>{a.name}</Text>
            {a.isSample ? <Text style={s.sample}>{c.artistSample}</Text> : null}
          </View>
          {a.headline ? <Text style={s.headline} numberOfLines={2}>{a.headline}</Text> : null}
          <View style={s.chips}>
            {a.city ? <Text style={s.city}>{a.city}</Text> : null}
            {a.specialties.slice(0, 3).map((sp) => (
              <Text key={sp} style={s.chip}>{sp}</Text>
            ))}
          </View>
          <Text style={[s.avail, a.available ? s.availYes : s.availNo]}>
            {a.available ? c.artistOpen : c.artistClosed}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Brand.paper },
  h1: { fontSize: 32, fontWeight: '800', color: Brand.ink, letterSpacing: -0.5, paddingRight: 60 },
  sub: { fontSize: 16, color: Brand.inkFaint, fontStyle: 'italic', marginBottom: 6 },
  problem: { fontSize: 15, fontWeight: '800', color: Brand.orange },
  empty: { fontSize: 16, color: Brand.inkSoft, fontStyle: 'italic' },
  card: {
    backgroundColor: Brand.white,
    borderWidth: BORDER,
    borderColor: Brand.ink,
    borderRadius: 14,
    padding: 14,
    gap: 6,
    ...hardShadow(4),
  },
  pressed: { transform: [{ translateX: 2 }, { translateY: 2 }], ...hardShadow(2) },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  name: { flex: 1, fontSize: 19, fontWeight: '800', color: Brand.ink },
  sample: {
    fontSize: 11,
    fontWeight: '800',
    color: Brand.ink,
    backgroundColor: '#e6e2d8',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  headline: { fontSize: 15, color: Brand.inkSoft },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  city: { fontSize: 13, fontWeight: '800', color: Brand.blue },
  chip: {
    fontSize: 12,
    color: Brand.ink,
    borderWidth: 1.5,
    borderColor: Brand.ink,
    borderRadius: 99,
    paddingHorizontal: 9,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  avail: { fontSize: 12, fontWeight: '800', marginTop: 2 },
  availYes: { color: '#3d7a12' },
  availNo: { color: Brand.inkFaint },
});
