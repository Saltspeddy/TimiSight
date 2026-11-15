import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackButton } from '@/components/back-button';
import { Button } from '@/components/button';
import { FlowerCard, flowerGridStyle } from '@/components/flower-card';
import { BORDER, Brand } from '@/constants/brand';
import { RC } from '@/constants/roles';
import { useFlowers } from '@/hooks/use-flowers';
import { useLang } from '@/hooks/use-lang';
import { useQuery } from '@/hooks/use-query';
import { useRole } from '@/hooks/use-role';
import { getArtist } from '@/lib/commissions';

// One artist's page. Organizations get the "Request a statue" button here.
export default function ArtistScreen() {
  const { sub } = useLocalSearchParams<{ sub: string }>();
  const [lang] = useLang();
  const c = RC[lang];
  const insets = useSafeAreaInsets();
  const { role } = useRole();
  const { data: artist, error, loading, reload } = useQuery(`artist:${sub}`, () => getArtist(sub));
  const works = useFlowers().filter((f) => f.artistSub === sub);

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={{ padding: 20, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40, gap: 14 }}>
      <BackButton />

      {loading && !artist ? <ActivityIndicator color={Brand.ink} /> : null}

      {error && !artist ? (
        <View style={{ gap: 12 }}>
          <Text style={s.problem}>{c.errGeneric}</Text>
          <Button label={c.retry} onPress={reload} variant="ghost" />
        </View>
      ) : null}

      {artist ? (
        <>
          <View style={s.head}>
            <View style={s.avatar}>
              <Text style={s.avatarText}>{artist.name.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.name}>{artist.name}</Text>
              {artist.city ? <Text style={s.city}>{artist.city}</Text> : null}
            </View>
          </View>

          {artist.headline ? <Text style={s.headline}>{artist.headline}</Text> : null}

          <Text style={[s.avail, artist.available ? s.availYes : s.availNo]}>
            {artist.available ? c.artistOpen : c.artistClosed}
          </Text>

          <Text style={s.body}>{artist.bio || c.artistNoBio}</Text>

          {artist.specialties.length > 0 ? (
            <View style={{ gap: 8 }}>
              <Text style={s.h2}>{c.artistSpecialties}</Text>
              <View style={s.chips}>
                {artist.specialties.map((sp) => (
                  <Text key={sp} style={s.chip}>{sp}</Text>
                ))}
              </View>
            </View>
          ) : null}

          {works.length > 0 ? (
            <View style={{ gap: 10 }}>
              <Text style={s.h2}>{c.artistWorks}</Text>
              <View style={flowerGridStyle}>
                {works.map((f) => (
                  <FlowerCard key={f.id} flower={f} lang={lang} />
                ))}
              </View>
            </View>
          ) : null}

          {artist.isSample ? <Text style={s.sample}>{c.sampleNote}</Text> : null}

          {role === 'organization' ? (
            <Button
              label={c.artistRequest}
              disabled={!artist.available}
              onPress={() => router.push({ pathname: '/commission/new', params: { artist: artist.sub } })}
            />
          ) : null}
        </>
      ) : null}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Brand.paper },
  problem: { fontSize: 15, fontWeight: '800', color: Brand.orange },
  head: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: Brand.orange,
    borderWidth: BORDER,
    borderColor: Brand.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 28, fontWeight: '800', color: Brand.ink },
  name: { fontSize: 26, fontWeight: '800', color: Brand.ink, letterSpacing: -0.5 },
  city: { fontSize: 15, fontWeight: '800', color: Brand.blue },
  headline: { fontSize: 18, color: Brand.inkSoft },
  avail: { fontSize: 13, fontWeight: '800' },
  availYes: { color: '#3d7a12' },
  availNo: { color: Brand.inkFaint },
  body: { fontSize: 16, lineHeight: 24, color: Brand.inkSoft },
  h2: { fontSize: 18, fontWeight: '800', color: Brand.ink },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    fontSize: 13,
    color: Brand.ink,
    borderWidth: 2,
    borderColor: Brand.ink,
    borderRadius: 99,
    paddingHorizontal: 12,
    paddingVertical: 4,
    overflow: 'hidden',
    backgroundColor: Brand.white,
  },
  sample: { fontSize: 14, fontStyle: 'italic', color: Brand.inkFaint },
});
