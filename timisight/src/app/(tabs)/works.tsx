import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FlowerCard, flowerGridStyle } from '@/components/flower-card';
import { Brand } from '@/constants/brand';
import { RC } from '@/constants/roles';
import { useAuth } from '@/hooks/auth';
import { useFlowers } from '@/hooks/use-flowers';
import { useLang } from '@/hooks/use-lang';
import { useRole } from '@/hooks/use-role';

// "My works" for an artist (flowers they made) and "My flowers" for an organization
// (flowers made for them). Same cards visitors see in the Garden; the link is
// flowers.artist_sub / flowers.org_sub.
export default function WorksScreen() {
  const [lang] = useLang();
  const c = RC[lang];
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { role } = useRole();
  const isOrg = role === 'organization';

  const mine = useFlowers().filter(
    (f) => !!user && (isOrg ? f.orgSub : f.artistSub) === user.sub,
  );

  return (
    <ScrollView
      style={{ backgroundColor: Brand.paper }}
      contentContainerStyle={{ padding: 20, paddingTop: insets.top + 24, paddingBottom: 120, gap: 16 }}>
      <Text style={s.h1}>{isOrg ? c.flowersTitle : c.worksTitle}</Text>
      <Text style={s.text}>{isOrg ? c.flowersText : c.worksText}</Text>

      {mine.length === 0 ? (
        <Text style={s.text}>{isOrg ? c.flowersEmpty : c.worksEmpty}</Text>
      ) : (
        <View style={flowerGridStyle}>
          {mine.map((f) => (
            <FlowerCard key={f.id} flower={f} lang={lang} />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  h1: { fontSize: 32, fontWeight: '800', color: Brand.ink, letterSpacing: -0.5, paddingRight: 60 },
  text: { fontSize: 16, fontStyle: 'italic', color: Brand.inkSoft },
});
