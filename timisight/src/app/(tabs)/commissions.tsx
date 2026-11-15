import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { StatusChip } from '@/components/status-chip';
import { BORDER, Brand, hardShadow } from '@/constants/brand';
import { RC } from '@/constants/roles';
import { useLang } from '@/hooks/use-lang';
import { useQuery } from '@/hooks/use-query';
import { useRole } from '@/hooks/use-role';
import { listMyCommissions } from '@/lib/commissions';

// Commissions for organizations (requests they sent) and artists (requests they received).
// The list is the same query for both: row-level security returns only the caller's own.
export default function CommissionsScreen() {
  const [lang] = useLang();
  const c = RC[lang];
  const insets = useSafeAreaInsets();
  const { role } = useRole();
  const isArtist = role === 'artist';
  const { data, error, loading, reload } = useQuery('commissions', listMyCommissions);

  // Re-read when the tab is shown, so a new request or answer appears without a pull.
  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  return (
    <ScrollView
      style={s.root}
      refreshControl={<RefreshControl refreshing={false} onRefresh={reload} />}
      contentContainerStyle={{ padding: 20, paddingTop: insets.top + 20, paddingBottom: 100, gap: 14 }}
      showsVerticalScrollIndicator={false}>
      <Text style={s.h1}>{c.commissionsTitle}</Text>
      <Text style={s.sub}>{isArtist ? c.commissionsTextArtist : c.commissionsTextOrg}</Text>

      {loading && !data ? <ActivityIndicator color={Brand.ink} style={{ marginTop: 20 }} /> : null}

      {error && !data ? (
        <View style={{ gap: 12 }}>
          <Text style={s.problem}>{c.errGeneric}</Text>
          <Button label={c.retry} onPress={reload} variant="ghost" />
        </View>
      ) : null}

      {data && data.length === 0 ? (
        <Text style={s.empty}>{isArtist ? c.commissionsEmptyArtist : c.commissionsEmptyOrg}</Text>
      ) : null}

      {data?.map((m) => {
        // An artist should notice a request that is waiting for their answer.
        const needsAnswer = isArtist && m.status === 'requested';
        return (
          <Pressable
            key={m.id}
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/commission/[id]', params: { id: m.id } })}
            style={({ pressed }) => [s.card, needsAnswer && s.cardAttention, pressed && s.pressed]}>
            <View style={s.row}>
              <Text style={s.title} numberOfLines={2}>{m.title}</Text>
              <StatusChip status={m.status} />
            </View>
            <Text style={s.who} numberOfLines={1}>
              {isArtist ? m.orgName : `→ ${m.artistName}`}
            </Text>
            <Text style={s.date}>{formatDate(m.updatedAt, lang)}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function formatDate(iso: string, lang: string): string {
  try {
    return new Date(iso).toLocaleDateString(lang, { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return new Date(iso).toDateString();
  }
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Brand.paper },
  h1: { fontSize: 32, fontWeight: '800', color: Brand.ink, letterSpacing: -0.5, paddingRight: 60 },
  sub: { fontSize: 16, color: Brand.inkFaint, fontStyle: 'italic', marginBottom: 6 },
  problem: { fontSize: 15, fontWeight: '800', color: Brand.orange },
  empty: { fontSize: 16, color: Brand.inkSoft, fontStyle: 'italic' },
  card: {
    backgroundColor: Brand.white,
    borderWidth: BORDER,
    borderColor: Brand.ink,
    borderRadius: 14,
    padding: 14,
    gap: 6,
    ...hardShadow(4),
  },
  cardAttention: { backgroundColor: '#fff6d6' },
  pressed: { transform: [{ translateX: 2 }, { translateY: 2 }], ...hardShadow(2) },
  row: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  title: { flex: 1, fontSize: 18, fontWeight: '800', color: Brand.ink },
  who: { fontSize: 15, color: Brand.inkSoft },
  date: { fontSize: 12, color: Brand.inkFaint },
});
