import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LEADERBOARD } from '@/constants/site-data';
import { BORDER, Brand } from '@/constants/brand';
import { useLang } from '@/hooks/use-lang';

export default function LeaderboardScreen() {
  const [, t] = useLang();
  const insets = useSafeAreaInsets();

  const ranked = [...LEADERBOARD].sort((a, b) => b.points - a.points);

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingTop: insets.top + 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}>
        <Text style={styles.h2}>{t.boardTitle}</Text>
        <Text style={styles.sub}>{t.boardText}</Text>

        <View style={styles.list}>
          {ranked.map((row, i) => {
            const me = row.name === 'You';
            return (
              <View key={row.name} style={[styles.row, me && styles.me]}>
                <View style={styles.rank}>
                  <Text style={styles.rankText}>{i + 1}</Text>
                </View>
                <Text style={styles.name}>{row.name}</Text>
                <Text style={styles.points}>
                  {row.points} {t.points}
                </Text>
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
  list: { gap: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderWidth: 2,
    borderColor: Brand.ink,
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  me: { backgroundColor: Brand.yellow },
  rank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Brand.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  name: { flex: 1, fontWeight: '800', color: Brand.ink, fontSize: 15 },
  points: { fontWeight: '800', color: Brand.ink, fontSize: 15 },
});
