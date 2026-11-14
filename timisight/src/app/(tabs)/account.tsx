import { Image } from 'expo-image';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LangToggle } from '@/components/lang-toggle';
import { BORDER, Brand, hardShadow } from '@/constants/brand';
import { useCollection } from '@/constants/collection';
import { ME } from '@/constants/site-data';
import { useAuth } from '@/hooks/auth';
import { useLang } from '@/hooks/use-lang';
import { refreshLeaderboard, useLeaderboard } from '@/hooks/use-leaderboard';

const BOARD_EMPTY = {
  en: 'No points yet. Scan a flower to get on the board.',
  ro: 'Încă niciun punct. Scanează o floare ca să apari în clasament.',
};

export default function AccountScreen() {
  const [lang, t] = useLang();
  const insets = useSafeAreaInsets();
  const { user, isLoading, signOut } = useAuth();
  // Real balance + lifetime from the unified ledger. balance = earned - spent (spendable);
  // lifetime = earned-only, so "Lifetime earned" no longer wrongly drops after a redemption.
  const { total, lifetime } = useCollection();

  // Real rank from the DB leaderboard: the signed-in user's position in the ranking.
  // `useLeaderboard` is ordered by lifetime desc, so the index is the rank. 0 (not found)
  // means the user has no points yet → shown as '—'.
  const ranked = useLeaderboard();
  const rank = user ? ranked.findIndex((r) => r.sub === user.sub) + 1 : 0;

  // Re-read the ranking when the tab is focused so points earned elsewhere show up promptly
  // (the leaderboard now lives here instead of its own tab).
  useFocusEffect(
    useCallback(() => {
      void refreshLeaderboard();
    }, []),
  );

  // The signed-in display name falls back to the demo "You" when the profile omits it.
  const displayName = user?.name ?? user?.email ?? ME.name;

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingTop: insets.top + 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}>
        <Text style={styles.h2}>{t.accountTitle}</Text>
        <Text style={styles.sub}>{t.accountText}</Text>

        {/* Identity header — reflects the Auth0 session once signed in. */}
        {isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={Brand.ink} />
            <Text style={styles.loadingText}>{t.authLoading}</Text>
          </View>
        ) : (
          <View style={styles.head}>
            <View style={styles.avatar}>
              {user?.picture ? (
                <Image source={{ uri: user.picture }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>{displayName.charAt(0).toUpperCase()}</Text>
              )}
            </View>
            <View style={styles.headText}>
              <Text style={styles.name}>{displayName}</Text>
              {user?.email ? <Text style={styles.email}>{user.email}</Text> : null}
            </View>
          </View>
        )}

        {/* Log out. The account tab is only reachable while authenticated (the root
            layout's guard), so there is no logged-out branch here; signing out flips the
            guard and drops the user back to the login screen. */}
        {!isLoading && (
          <Pressable style={styles.authBtn} onPress={() => void signOut()}>
            <Text style={styles.authBtnText}>{t.authLogout}</Text>
          </Pressable>
        )}

        {/* Points balance banner */}
        <View style={styles.banner}>
          <Text style={styles.bannerLabel}>{t.accountBalance}</Text>
          <Text style={styles.bannerValue}>
            {total} {t.points}
          </Text>
        </View>

        {/* Details */}
        <View style={styles.details}>
          <View style={styles.row}>
            <Text style={styles.dt}>{t.accountLifetime}</Text>
            <Text style={styles.dd}>
              {lifetime} {t.points}
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

        {/* Leaderboard — relocated here from its own tab. Same useLeaderboard() ranking,
            highlighting the signed-in row. */}
        <Text style={styles.boardTitle}>{t.boardTitle}</Text>
        <Text style={styles.boardSub}>{t.boardText}</Text>
        {ranked.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>{BOARD_EMPTY[lang]}</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {ranked.map((row, i) => {
              const me = !!user && row.sub === user.sub;
              return (
                <View key={row.sub} style={[styles.boardRow, me && styles.me]}>
                  <View style={styles.boardRank}>
                    <Text style={styles.boardRankText}>{i + 1}</Text>
                  </View>
                  <Text style={styles.boardName} numberOfLines={1}>{row.name}</Text>
                  <Text style={styles.boardPoints}>
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

  head: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20 },
  headText: { flex: 1 },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Brand.blue,
    borderWidth: BORDER,
    borderColor: Brand.ink,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { color: '#fff', fontSize: 30, fontWeight: '800' },
  name: { fontSize: 22, fontWeight: '800', color: Brand.ink },
  email: { fontSize: 14, color: Brand.inkFaint, marginTop: 2 },

  loading: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  loadingText: { fontSize: 16, color: Brand.inkFaint },

  authBtn: {
    alignSelf: 'flex-start',
    backgroundColor: Brand.blue,
    borderWidth: BORDER,
    borderColor: Brand.ink,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 18,
    marginBottom: 20,
    ...hardShadow(4),
  },
  authBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },

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

  // Relocated leaderboard section.
  boardTitle: { fontSize: 22, fontWeight: '800', color: Brand.ink, letterSpacing: -0.5, marginTop: 28, marginBottom: 6 },
  boardSub: { fontSize: 15, color: Brand.inkFaint, marginBottom: 16, fontStyle: 'italic' },
  list: { gap: 10 },
  emptyBox: { borderWidth: 2, borderColor: Brand.inkFaint, borderStyle: 'dashed', borderRadius: 12, padding: 16 },
  emptyText: { fontSize: 14, color: Brand.inkFaint, fontStyle: 'italic' },
  boardRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderWidth: 2, borderColor: Brand.ink, borderRadius: 10, backgroundColor: '#fff' },
  me: { backgroundColor: Brand.yellow },
  boardRank: { width: 28, height: 28, borderRadius: 14, backgroundColor: Brand.blue, alignItems: 'center', justifyContent: 'center' },
  boardRankText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  boardName: { flex: 1, fontWeight: '800', color: Brand.ink, fontSize: 15 },
  boardPoints: { fontWeight: '800', color: Brand.ink, fontSize: 15 },
});
