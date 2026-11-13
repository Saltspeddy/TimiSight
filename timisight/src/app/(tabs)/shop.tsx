import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BORDER, Brand, hardShadow } from '@/constants/brand';
import { OFFERS, type Offer } from '@/constants/site-data';
import { useLang } from '@/hooks/use-lang';
import {
  canRedeem,
  claimRepeatable,
  deactivate,
  redeemActive,
  usePerks,
} from '@/hooks/use-perks';

export default function ShopScreen() {
  const [lang, t] = useLang();
  const insets = useSafeAreaInsets();

  // Persistent store: balance, active passes and repeatable-claim counts all survive
  // the app closing and reopening (see use-perks.ts — the single backend seam).
  const perks = usePerks();

  // Perks to surface in the "Active perks" banner: active passes the user currently
  // holds, plus repeatable offers (e.g. coffee) they have claimed at least once.
  const activeOffers = OFFERS.filter((o) =>
    o.kind === 'active'
      ? perks.active.includes(o.id)
      : (perks.claims[o.id] ?? 0) > 0
  );

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
            {perks.balance} {t.points}
          </Text>
        </View>

        {/* Active perks — what the user currently holds, at a glance. */}
        <Text style={styles.sectionTitle}>{t.shopActiveTitle}</Text>
        {activeOffers.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>{t.shopActiveEmpty}</Text>
          </View>
        ) : (
          <View style={styles.activeList}>
            {activeOffers.map((o) => {
              const repeatable = o.kind === 'repeatable';
              const claimCount = perks.claims[o.id] ?? 0;
              return (
                <View key={o.id} style={styles.activeCard}>
                  <View style={styles.activeInfo}>
                    <View style={styles.activeBadge}>
                      <Text style={styles.activeBadgeText}>
                        {repeatable
                          ? `${claimCount}× ${t.shopClaimed}`.toUpperCase()
                          : t.shopActive.toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.activeName}>{o.title[lang]}</Text>
                    <Text style={styles.activePartner}>{o.partner}</Text>
                  </View>
                  {/* Only `active` passes can be toggled off; repeatable claims aren't
                      a held state, so they have no Deactivate action. */}
                  {!repeatable ? (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => deactivate(o.id)}
                      style={({ pressed }) => [
                        styles.deactivateBtn,
                        pressed && styles.btnPressed,
                      ]}>
                      <Text style={styles.deactivateText}>{t.shopDeactivate}</Text>
                    </Pressable>
                  ) : null}
                </View>
              );
            })}
          </View>
        )}

        {/* Catalogue */}
        <Text style={styles.sectionTitle}>{t.shopTitle}</Text>
        <View style={styles.list}>
          {OFFERS.map((o) => (
            <OfferCard key={o.id} offer={o} lang={lang} t={t} perks={perks} />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function OfferCard({
  offer,
  lang,
  t,
  perks,
}: {
  offer: Offer;
  lang: ReturnType<typeof useLang>[0];
  t: ReturnType<typeof useLang>[1];
  perks: ReturnType<typeof usePerks>;
}) {
  const soldOut = offer.stock !== null && offer.stock <= 0;
  const isActive = offer.kind === 'active' && perks.active.includes(offer.id);
  const tooPoor = perks.balance < offer.cost;
  const claimCount = perks.claims[offer.id] ?? 0;
  const canAct = canRedeem(offer, perks);

  const meta =
    offer.stock === null ? t.shopUnlimited : `${Math.max(offer.stock, 0)} ${t.shopLeft}`;

  // Button label per state.
  const label = soldOut
    ? t.shopSoldOut
    : isActive
      ? t.shopActive
      : offer.kind === 'repeatable'
        ? t.shopClaim
        : t.shopActivate;

  const onPress = () => {
    if (offer.kind === 'repeatable') claimRepeatable(offer.id);
    else redeemActive(offer.id);
  };

  return (
    <View style={[styles.card, isActive && styles.cardActive]}>
      <View style={styles.cardBody}>
        <Text style={styles.name}>{offer.title[lang]}</Text>
        <Text style={styles.partner}>{offer.partner}</Text>
        <Text style={styles.meta}>
          {offer.cost} {t.points} · {meta}
        </Text>
        {offer.kind === 'repeatable' && claimCount > 0 ? (
          <Text style={styles.claimed}>
            {claimCount}× {t.shopClaimed}
          </Text>
        ) : null}
        {tooPoor && !soldOut && !isActive ? (
          <Text style={styles.warn}>{t.shopNotEnough}</Text>
        ) : null}
      </View>

      <Pressable
        disabled={!canAct}
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [
          styles.btn,
          pressed && canAct && styles.btnPressed,
          !canAct && styles.btnDisabled,
          isActive && styles.btnActive,
        ]}>
        <Text style={styles.btnText}>{label}</Text>
      </Pressable>
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

  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Brand.ink,
    letterSpacing: -0.3,
    marginBottom: 12,
  },

  // Active perks
  emptyBox: {
    borderWidth: 2,
    borderColor: Brand.inkFaint,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  emptyText: { fontSize: 14, color: Brand.inkFaint, fontStyle: 'italic' },
  activeList: { gap: 12, marginBottom: 24 },
  activeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderWidth: BORDER,
    borderColor: Brand.ink,
    borderRadius: 12,
    backgroundColor: Brand.yellow,
    ...hardShadow(4),
  },
  activeInfo: { flex: 1, gap: 4 },
  activeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Brand.ink,
    borderRadius: 6,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  activeBadgeText: { color: Brand.white, fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  activeName: { fontSize: 17, fontWeight: '800', color: Brand.ink },
  activePartner: { fontSize: 14, color: Brand.inkSoft, fontStyle: 'italic' },
  deactivateBtn: {
    backgroundColor: Brand.white,
    borderWidth: 2,
    borderColor: Brand.ink,
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 14,
    ...hardShadow(3),
  },
  deactivateText: { color: Brand.ink, fontWeight: '800', fontSize: 14 },

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
  cardActive: { borderWidth: BORDER, borderColor: Brand.blue },
  cardBody: { flex: 1, gap: 3 },
  name: { fontSize: 17, fontWeight: '800', color: Brand.ink },
  partner: { fontSize: 14, color: Brand.inkSoft, fontStyle: 'italic' },
  meta: { fontSize: 14, color: Brand.inkFaint },
  claimed: { fontSize: 13, fontWeight: '800', color: Brand.blue, marginTop: 2 },
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
  btnActive: { backgroundColor: Brand.blue },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
});
