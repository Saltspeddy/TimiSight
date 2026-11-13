import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PLACES } from '@/constants/site-data';
import { BORDER, Brand, hardShadow } from '@/constants/brand';
import { useLang } from '@/hooks/use-lang';

export default function PlacesScreen() {
  const [lang, t] = useLang();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingTop: insets.top + 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}>
        <Text style={styles.h2}>{t.placesTitle}</Text>
        <Text style={styles.sub}>{t.placesText}</Text>

        <View style={styles.list}>
          {PLACES.map((p) => {
            const c = p[lang];
            return (
              <View key={p.id} style={[styles.ticket, p.live ? styles.live : styles.dashed]}>
                <View style={styles.ticketBody}>
                  <Text style={styles.name}>{c.name}</Text>
                  {c.era ? <Text style={styles.era}>{c.era}</Text> : null}
                </View>
                {p.live ? (
                  <Pressable
                    onPress={() => router.navigate(`/place/${p.id}`)}
                    style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}>
                    <Text style={styles.btnText}>{t.open}</Text>
                  </Pressable>
                ) : (
                  <Text style={styles.soon}>{t.soon}</Text>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Brand.paper },
  h2: { fontSize: 28, fontWeight: '800', color: Brand.ink, letterSpacing: -0.5, marginBottom: 6 },
  sub: { fontSize: 16, color: Brand.inkFaint, marginBottom: 20, fontStyle: 'italic' },
  list: { gap: 16 },
  ticket: {
    borderWidth: BORDER,
    borderColor: Brand.ink,
    borderRadius: 6,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 90,
  },
  dashed: { borderStyle: 'dashed', backgroundColor: '#fff' },
  live: { borderStyle: 'solid', backgroundColor: Brand.yellow },
  ticketBody: { flex: 1, gap: 4 },
  name: { fontSize: 17, fontWeight: '800', color: Brand.ink },
  era: { fontSize: 14, color: Brand.inkSoft, fontStyle: 'italic' },
  soon: { fontStyle: 'italic', color: Brand.inkFaint, fontSize: 15 },
  btn: {
    backgroundColor: Brand.blue,
    borderWidth: BORDER,
    borderColor: Brand.ink,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    ...hardShadow(3),
  },
  btnPressed: { transform: [{ translateX: 2 }, { translateY: 2 }], ...hardShadow(1) },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
});
