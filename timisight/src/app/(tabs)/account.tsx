import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LangToggle } from '@/components/lang-toggle';
import { BORDER, Brand, hardShadow } from '@/constants/brand';
import { LEADERBOARD, ME } from '@/constants/site-data';
import { useLang } from '@/hooks/use-lang';

export default function AccountScreen() {
  const [, t] = useLang();
  const insets = useSafeAreaInsets();

  // Derive this player's rank from the shared leaderboard data (demo).
  const ranked = [...LEADERBOARD].sort((a, b) => b.points - a.points);
  const rank = ranked.findIndex((r) => r.name === ME.name) + 1;

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingTop: insets.top + 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}>
        <Text style={styles.h2}>{t.accountTitle}</Text>
        <Text style={styles.sub}>{t.accountText}</Text>

        {/* Identity header */}
        <View style={styles.head}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{ME.name.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.name}>{ME.name}</Text>
        </View>

        {/* Points balance banner */}
        <View style={styles.banner}>
          <Text style={styles.bannerLabel}>{t.accountBalance}</Text>
          <Text style={styles.bannerValue}>
            {ME.points} {t.points}
          </Text>
        </View>

        {/* Details */}
        <View style={styles.details}>
          <View style={styles.row}>
            <Text style={styles.dt}>{t.accountLifetime}</Text>
            <Text style={styles.dd}>
              {ME.lifetime} {t.points}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.dt}>{t.accountRank}</Text>
            <Text style={styles.dd}>{rank > 0 ? `#${rank}` : '—'}</Text>
          </View>
          <View style={[styles.row, styles.rowLast]}>
            <Text style={styles.dt}>{t.accountLanguage}</Text>
            <LangToggle />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Brand.paper },
  h2: { fontSize: 28, fontWeight: '800', color: Brand.ink, letterSpacing: -0.5, marginBottom: 6 },
  sub: { fontSize: 16, color: Brand.inkFaint, marginBottom: 20, fontStyle: 'italic' },

  head: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20 },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Brand.blue,
    borderWidth: BORDER,
    borderColor: Brand.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 30, fontWeight: '800' },
  name: { fontSize: 22, fontWeight: '800', color: Brand.ink },

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

  details: {
    borderWidth: 2,
    borderColor: Brand.ink,
    borderRadius: 12,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(18,20,43,0.12)',
  },
  rowLast: { borderBottomWidth: 0 },
  dt: { fontSize: 15, fontWeight: '800', color: Brand.ink },
  dd: { fontSize: 15, color: Brand.inkSoft },
});
