import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BORDER, Brand, hardShadow } from '@/constants/brand';
import { MY_POINTS, OFFERS, type Offer } from '@/constants/site-data';
import { useLang } from '@/hooks/use-lang';

export default function ShopScreen() {
  const [lang, t] = useLang();
  const insets = useSafeAreaInsets();

  // Demo-only local state: a real build would spend points via the backend.
  const [balance, setBalance] = useState(MY_POINTS);
  const [redeemed, setRedeemed] = useState<Record<string, boolean>>({});

  const onRedeem = (offer: Offer) => {
    if (balance < offer.cost || redeemed[offer.id]) return;
    setBalance((b) => b - offer.cost);
    setRedeemed((r) => ({ ...r, [offer.id]: true }));
  };

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingTop: insets.top + 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}>
        <Text style={styles.h2}>{t.shopTitle}</Text>
        <Text style={styles.sub}>{t.shopText}</Text>

        {/* Balance banner */}
        <View style={styles.banner}>
          <Text style={styles.bannerLabel}>{t.shopBalance}</Text>
          <Text style={styles.bannerValue}>
            {balance} {t.points}
          </Text>
        </View>

        <View style={styles.list}>
          {OFFERS.map((o) => {
            const soldOut = o.stock !== null && o.stock <= 0;
            const tooPoor = balance < o.cost;
            const done = !!redeemed[o.id];
            const disabled = soldOut || tooPoor || done;
            const meta =
              o.stock === null ? t.shopUnlimited : `${Math.max(o.stock, 0)} ${t.shopLeft}`;

            return (
              <View key={o.id} style={styles.card}>
                <View style={styles.cardBody}>
                  <Text style={styles.name}>{o.title[lang]}</Text>
                  <Text style={styles.partner}>{o.partner}</Text>
                  <Text style={styles.meta}>
                    {o.cost} {t.points} · {meta}
                  </Text>
                  {tooPoor && !soldOut && !done ? (
                    <Text style={styles.warn}>{t.shopNotEnough}</Text>
                  ) : null}
                </View>

                <Pressable
                  disabled={disabled}
                  onPress={() => onRedeem(o)}
                  style={({ pressed }) => [
                    styles.btn,
                    pressed && !disabled && styles.btnPressed,
                    disabled && styles.btnDisabled,
                  ]}>
                  <Text style={styles.btnText}>
                    {soldOut ? t.shopSoldOut : done ? '✓' : t.shopRedeem}
                  </Text>
                </Pressable>
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

  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Brand.yellow,
    borderWidth: BORDER,
    borderColor: Brand.ink,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 20,
    ...hardShadow(4),
  },
  bannerLabel: { fontSize: 15, fontWeight: '800', color: Brand.ink },
  bannerValue: { fontSize: 26, fontWeight: '800', color: Brand.ink, letterSpacing: -0.5 },

  list: { gap: 14 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderWidth: 2,
    borderColor: Brand.ink,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  cardBody: { flex: 1, gap: 3 },
  name: { fontSize: 17, fontWeight: '800', color: Brand.ink },
  partner: { fontSize: 14, color: Brand.inkSoft, fontStyle: 'italic' },
  meta: { fontSize: 14, color: Brand.inkFaint },
  warn: { fontSize: 13, fontWeight: '800', color: Brand.orange, marginTop: 2 },

  btn: {
    backgroundColor: Brand.blue,
    borderWidth: 2,
    borderColor: Brand.ink,
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 16,
    ...hardShadow(3),
  },
  btnPressed: { transform: [{ translateX: 2 }, { translateY: 2 }], ...hardShadow(1) },
  btnDisabled: { backgroundColor: Brand.inkFaint, ...hardShadow(2) },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
});
