import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Brand } from '@/constants/brand';
import type { Flower } from '@/constants/flowers';

// The artwork for one flower, wherever it appears.
//
// It tries the artwork named in `order` and uses the first one the flower has:
//   'icon'  - the illustrated icon (assets/flowers, see constants/flower-icons.ts)
//   'photo' - the photo of the real statue (FLOWER_IMAGES in constants/flowers.ts)
// If the flower has neither, it draws a bloom in code, so a flower that was just added to
// the database never shows a blank tile. Each flower gets a slightly different bloom
// (petal count comes from its id), so they stay tell-apart-able until real icons arrive.
//
//   <FlowerIcon flower={f} />                       fills its parent (the parent must be square or sized)
//   <FlowerIcon flower={f} size={36} />             fixed square, e.g. in the bouquet row
//   <FlowerIcon flower={f} locked size={84} />      outline-only bloom with a "?" (not collected yet)

/**
 * A soft, pale version of a flower's colour, for the tile behind its icon. The full-strength
 * colour swallows icons of a similar hue (a green hop on a green tile). Falls back to white
 * if the colour from the database isn't a #rrggbb value.
 */
export function tint(hex: string, amount = 0.78): string {
  const m = /^#?([0-9a-f]{6})$/i.exec((hex ?? '').trim());
  if (!m) return Brand.white;
  const n = parseInt(m[1], 16);
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  return `rgb(${mix((n >> 16) & 255)}, ${mix((n >> 8) & 255)}, ${mix(n & 255)})`;
}

type Props = {
  flower: Flower;
  order?: ('icon' | 'photo')[];
  size?: number;
  locked?: boolean;
};

export function FlowerIcon({ flower, order = ['icon', 'photo'], size, locked = false }: Props) {
  // Measured only in "fill the parent" mode, so the drawn bloom can be sized to fit.
  const [box, setBox] = useState(0);

  if (!locked) {
    for (const kind of order) {
      const source = kind === 'icon' ? flower.icon : flower.image;
      if (source) {
        return (
          <Image
            source={source}
            style={size ? { width: size, height: size } : StyleSheet.absoluteFill}
            contentFit="contain"
            accessibilityIgnoresInvertColors
          />
        );
      }
    }
  }

  const px = size ?? Math.round(box * 0.8);
  return (
    <View
      style={size ? { width: size, height: size } : styles.fill}
      onLayout={
        size
          ? undefined
          : (e) => setBox(Math.min(e.nativeEvent.layout.width, e.nativeEvent.layout.height))
      }>
      {px > 0 ? <Bloom size={px} petals={petalCount(flower.id)} locked={locked} /> : null}
    </View>
  );
}

/** 5 to 8 petals, the same number every time for a given flower. */
function petalCount(id: string): number {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return 5 + (h % 4);
}

// A flower drawn with plain Views (no SVG library): overlapping round petals around a
// yellow centre. White petals read well on the flower's own coloured tile.
function Bloom({ size, petals, locked }: { size: number; petals: number; locked: boolean }) {
  const line = size < 60 ? 1.5 : 2;
  const ring = size * 0.27; // how far each petal's centre sits from the middle
  const petal = size * 0.38; // petal diameter
  const core = size * 0.3; // centre diameter
  const mid = size / 2;
  const edge = locked ? Brand.inkFaint : Brand.ink;

  return (
    <View style={{ width: size, height: size }}>
      {Array.from({ length: petals }, (_, i) => {
        const angle = (i / petals) * Math.PI * 2 - Math.PI / 2;
        return (
          <View
            key={i}
            style={{
              position: 'absolute',
              width: petal,
              height: petal,
              left: mid + ring * Math.cos(angle) - petal / 2,
              top: mid + ring * Math.sin(angle) - petal / 2,
              borderRadius: petal / 2,
              borderWidth: line,
              borderColor: edge,
              backgroundColor: locked ? 'transparent' : Brand.white,
            }}
          />
        );
      })}
      <View
        style={{
          position: 'absolute',
          width: core,
          height: core,
          left: mid - core / 2,
          top: mid - core / 2,
          borderRadius: core / 2,
          borderWidth: line,
          borderColor: edge,
          backgroundColor: locked ? 'transparent' : Brand.yellow,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        {locked ? (
          <Text style={{ fontSize: core * 0.7, fontWeight: '800', color: Brand.inkFaint }}>?</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
});
