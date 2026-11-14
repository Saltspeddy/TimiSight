import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BORDER, Brand, hardShadow } from '@/constants/brand';
import { collectedIds } from '@/constants/collection';
import { FLOWERS } from '@/constants/flowers';
import { useLang } from '@/hooks/use-lang';

const TXT = {
  en: { title: 'Flowers', sub: 'Tap a flower’s NFC tag on the street to check in and earn points.',
    open: 'Open', pts: 'pts', collected: 'Collected', soon: 'More flowers coming soon' },
  ro: { title: 'Flori', sub: 'Atinge eticheta NFC a unei flori pe stradă ca să faci check-in și să câștigi puncte.',
    open: 'Deschide', pts: 'puncte', collected: 'Colecționată', soon: 'Alte flori în curând' },
};

export default function PlacesScreen() {
  const [lang] = useLang();
  const x = TXT[lang];
  const insets = useSafeAreaInsets();
  const [, refresh] = useState(0);
  // Re-read the collection each time the tab is shown, so new flowers appear as collected.
  useFocusEffect(useCallback(() => { refresh((n) => n + 1); }, []));
  const owned = new Set(collectedIds());

  return (
    <ScrollView
      style={{ backgroundColor: Brand.paper }}
      contentContainerStyle={{ padding: 20, paddingTop: insets.top + 24, paddingBottom: 120, gap: 14 }}>
      <Text style={s.h1}>{x.title}</Text>
      <Text style={s.sub}>{x.sub}</Text>

      {FLOWERS.map((f) => (
        <Pressable
          key={f.id}
          onPress={() => router.push(`/place/${f.id}`)}
          accessibilityRole="button"
          accessibilityLabel={f.name[lang]}
          style={({ pressed }) => [s.card, pressed && s.cardPressed]}>
          <View style={[s.thumb, { backgroundColor: f.color }]}>
            {f.image ? <Image source={f.image} style={StyleSheet.absoluteFill} contentFit="contain" /> : null}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.name}>{f.name[lang]}</Text>
            <Text style={s.small}>{owned.has(f.id) ? `✓ ${x.collected}` : `+${f.points} ${x.pts}`}</Text>
          </View>
          <View style={s.open}><Text style={s.openText}>{x.open}</Text></View>
        </Pressable>
      ))}

      <View style={s.soon}><Text style={s.soonText}>{x.soon}</Text></View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  h1: { fontSize: 32, fontWeight: '800', color: Brand.ink, letterSpacing: -0.5, paddingRight: 60 },
  sub: { fontSize: 16, lineHeight: 22, fontStyle: 'italic', color: Brand.inkSoft, marginBottom: 6 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: Brand.white, borderWidth: BORDER, borderColor: Brand.ink, borderRadius: 16, padding: 12, ...hardShadow(4) },
  cardPressed: { transform: [{ translateX: 2 }, { translateY: 2 }], ...hardShadow(2) },
  thumb: { width: 64, height: 64, borderRadius: 14, borderWidth: 2, borderColor: Brand.ink, overflow: 'hidden' },
  name: { fontSize: 18, fontWeight: '800', color: Brand.ink },
  small: { fontSize: 14, color: Brand.inkFaint, marginTop: 2 },
  open: { backgroundColor: Brand.blue, borderWidth: 2, borderColor: Brand.ink, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 16 },
  openText: { color: '#fff', fontWeight: '800' },
  soon: { borderWidth: 3, borderColor: Brand.ink, borderStyle: 'dashed', borderRadius: 16, padding: 22, alignItems: 'center' },
  soonText: { fontStyle: 'italic', color: Brand.inkFaint, fontSize: 16 },
});