import { Image } from 'expo-image';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { router } from 'expo-router';

import { LanguagePicker } from '@/components/language-picker';
import { BORDER, Brand, hardShadow } from '@/constants/brand';
import { useCollection } from '@/constants/collection';
import { RC, ROLE_STYLE } from '@/constants/roles';
import { ME } from '@/constants/site-data';
import { useAuth } from '@/hooks/auth';
import { useLang } from '@/hooks/use-lang';
import { useLeaderboard } from '@/hooks/use-leaderboard';
import { useRole } from '@/hooks/use-role';

export default function AccountScreen() {
  const [lang, t] = useLang();
  const c = RC[lang];
  const insets = useSafeAreaInsets();
  const { user, isLoading, signOut } = useAuth();
  const { role, name: roleName, phase } = useRole();
  // Points, rank and the leaderboard belong to visitors; organizations and artists have none.
  const isVisitor = role === 'user' || role === null;
  const roleLabel = { user: c.roleUser, organization: c.roleOrg, artist: c.roleArtist };
  // Real balance from the unified ledger (same points earned by scanning flowers).
  const { total } = useCollection();

  // Real rank from the DB leaderboard: the signed-in user's position in the ranking.
  // `useLeaderboard` is ordered by lifetime desc, so the index is the rank. 0 (not found)
  // means the user has no points yet → shown as '—'.
  const ranked = useLeaderboard();
  const rank = user ? ranked.findIndex((r) => r.sub === user.sub) + 1 : 0;

  // The signed-in display name falls back to the demo "You" when the profile omits it.
  // An organization or artist is shown by its own name, not by the email it signed in with.
  const displayName =
    !isVisitor && roleName ? roleName : (user?.name ?? user?.email ?? ME.name);

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
            {/* People are round; an organization is a rounded square. */}
            <View
              style={[
                styles.avatar,
                role === 'organization' && styles.avatarOrg,
                role === 'artist' && { backgroundColor: ROLE_STYLE.artist.bg },
              ]}>
              {user?.picture && isVisitor ? (
                <Image source={{ uri: user.picture }} style={styles.avatarImage} />
              ) : (
                <Text style={[styles.avatarText, role === 'artist' && { color: ROLE_STYLE.artist.fg }]}>
                  {displayName.charAt(0).toUpperCase()}
                </Text>
              )}
            </View>
            <View style={styles.headText}>
              <Text style={styles.name} numberOfLines={2}>{displayName}</Text>
              {isVisitor && user?.email ? <Text style={styles.email}>{user.email}</Text> : null}
              {/* Which kind of account this is, shown only once the database has said so. */}
              {phase === 'ready' && role ? (
                <View style={[styles.rolePill, { backgroundColor: ROLE_STYLE[role].bg }]}>
                  <Text style={[styles.rolePillText, { color: ROLE_STYLE[role].fg }]}>{roleLabel[role]}</Text>
                </View>
              ) : null}
            </View>
          </View>
        )}

        {/* Log out. The account tab is only reachable while authenticated (the root
            layout's guard), so there is no logged-out branch here; signing out flips the
            guard and drops the user back to the login screen. */}
        {!isLoading && (
          <View style={styles.actions}>
            {role === 'artist' ? (
              <Pressable style={styles.editBtn} onPress={() => router.push('/artist-edit')}>
                <Text style={styles.editBtnText}>{c.accountEditArtist}</Text>
              </Pressable>
            ) : null}
            <Pressable style={styles.authBtn} onPress={() => void signOut()}>
              <Text style={styles.authBtnText}>{t.authLogout}</Text>
            </Pressable>
          </View>
        )}

        {/* Points balance banner (visitors only) */}
        {isVisitor ? (
          <View style={styles.banner}>
            <Text style={styles.bannerLabel}>{t.accountBalance}</Text>
            <Text style={styles.bannerValue}>
              {total} {t.points}
            </Text>
          </View>
        ) : null}

        {/* Details */}
        <View style={styles.details}>
          {isVisitor ? (
            <>
              <View style={styles.row}>
                <Text style={styles.dt}>{t.accountLifetime}</Text>
                <Text style={styles.dd}>
                  {total} {t.points}
                </Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.dt}>{t.accountRank}</Text>
                <Text style={styles.dd}>{rank > 0 ? `#${rank}` : '—'}</Text>
              </View>
            </>
          ) : null}
          <View style={[styles.row, styles.rowLast]}>
            <Text style={styles.dt}>{t.accountLanguage}</Text>
            <LanguagePicker />
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
  avatarOrg: { borderRadius: 18 },
  rolePill: {
    alignSelf: 'flex-start',
    marginTop: 8,
    borderWidth: 2,
    borderColor: Brand.ink,
    borderRadius: 99,
    paddingVertical: 3,
    paddingHorizontal: 12,
  },
  rolePillText: { fontSize: 13, fontWeight: '800' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  editBtn: {
    backgroundColor: Brand.yellow,
    borderWidth: BORDER,
    borderColor: Brand.ink,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 18,
    ...hardShadow(4),
  },
  editBtnText: { color: Brand.ink, fontSize: 16, fontWeight: '800' },
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
});
