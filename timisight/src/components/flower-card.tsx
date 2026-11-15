import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FlowerIcon, tint } from '@/components/flower-icon';
import { BORDER, Brand, hardShadow } from '@/constants/brand';
import type { Flower } from '@/constants/flowers';
import type { Lang } from '@/constants/site-data';

/** The flower tile used in the Garden grid. Tapping it opens the flower's page.
 *  Meant to sit inside a `flexDirection: 'row', flexWrap: 'wrap'` grid. */
export function FlowerCard({ flower, lang }: { flower: Flower; lang: Lang }) {
  return (
    <Pressable
      onPress={() => router.push(`/place/${flower.id}`)}
      accessibilityRole="button"
      accessibilityLabel={flower.name[lang]}
      style={({ pressed }) => [s.card, pressed && s.pressed]}>
      <View style={[s.thumb, { backgroundColor: tint(flower.color) }]}>
        <FlowerIcon flower={flower} />
      </View>
      <Text style={s.name} numberOfLines={2}>{flower.name[lang]}</Text>
    </Pressable>
  );
}

export const flowerGridStyle = { flexDirection: 'row', flexWrap: 'wrap', gap: 12 } as const;

const s = StyleSheet.create({
  // Fixed ~half-width so cards tile two-per-row. No flexGrow: a lone card on the
  // last row keeps its size instead of stretching to fill the whole row.
  card: { width: '47%', backgroundColor: Brand.white, borderWidth: BORDER, borderColor: Brand.ink, borderRadius: 16, padding: 10, gap: 8, ...hardShadow(4) },
  pressed: { transform: [{ translateX: 2 }, { translateY: 2 }], ...hardShadow(2) },
  thumb: { aspectRatio: 1, borderRadius: 12, borderWidth: 2, borderColor: Brand.ink, overflow: 'hidden' },
  name: { fontSize: 16, fontWeight: '800', color: Brand.ink },
});
