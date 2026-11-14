import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Brand } from '@/constants/brand';
import { useAuth } from '@/hooks/auth';
import { useLang } from '@/hooks/use-lang';
import { refreshLeaderboard, useLeaderboard } from '@/hooks/use-leaderboard';

const EMPTY = {
  en: 'No points yet. Scan a flower to get on the board.',
  ro: 'Încă niciun punct. Scanează o floare ca să apari în clasament.',
};

export default function LeaderboardScreen() {
  const [lang, t] = useLang();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const ranked = useLeaderboard();

  // Re-read when the tab is focused so points earned elsewhere show up promptly.
  useFocusEffect(
    useCallback(() => {
      void refreshLeaderboard();
    }, []),
  );

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingTop: insets.top + 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}>
        <Text style={styles.h2}>{t.boardTitle}</Text>
        <Text style={styles.sub}>{t.boardText}</Text>

        {ranked.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>{EMPTY[lang]}</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {ranked.map((row, i) => {
              const me = !!user && row.sub === user.sub;
              return (
                <View key={row.sub} style={[styles.row, me && styles.me]}>
                  <View style={styles.rank}>
                    <Text style={styles.rankText}>{i + 1}</Text>
                  </View>
                  <Text style={styles.name} numberOfLines={1}>{row.name}</Text>
                  <Text style={styles.points}>
                    {row.lifetime} {t.points}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
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
  emptyBox: {
    borderWidth: 2,
    borderColor: Brand.inkFaint,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 16,
  },
  emptyText: { fontSize: 14, color: Brand.inkFaint, fontStyle: 'italic' },
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
