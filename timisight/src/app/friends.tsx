import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackButton } from '@/components/back-button';
import { Button } from '@/components/button';
import { Field } from '@/components/field';
import { BORDER, Brand, hardShadow } from '@/constants/brand';
import { collectFriendBonuses } from '@/constants/collection';
import { FC, fill } from '@/constants/friends';
import { useLang } from '@/hooks/use-lang';
import { useQuery } from '@/hooks/use-query';
import { useQuests } from '@/hooks/use-quests';
import { useRole } from '@/hooks/use-role';
import {
  acceptFriendRequest,
  acceptQuestInvite,
  cancelQuestInvite,
  FriendError,
  listFriends,
  listQuestInvites,
  myFriendCode,
  removeFriendship,
  sendFriendRequest,
  type Friend,
  type FriendProblem,
  type QuestInvite,
} from '@/lib/friends';

// Friends list for visitors: your code, add a friend by code, answer requests, see friends.
// The bonus itself is paid by the database (see web/supabase/friends.sql); opening this
// screen just asks it to pay anything that is due.
export default function FriendsScreen() {
  const { role, phase } = useRole();
  // Visitors only. Organizations and artists have no friends list; a visitor whose role is
  // still loading simply waits.
  if (phase === 'ready' && role !== 'user') return <Redirect href="/" />;
  if (phase !== 'ready') return <View style={s.root} />;
  return <FriendsBody />;
}

function FriendsBody() {
  const [lang] = useLang();
  const c = FC[lang];
  const insets = useSafeAreaInsets();
  const code = useQuery('friend-code', myFriendCode);
  const friends = useQuery('friends', listFriends);
  const invites = useQuery('quest-invites', listQuestInvites);
  const { paths } = useQuests();
  const pathName = (id: string): string => {
    const p = paths.find((x) => x.id === id);
    return p ? (lang === 'ro' ? p.nameRo : p.nameEn) : id;
  };
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ text: string; bad: boolean } | null>(null);
  const [bonus, setBonus] = useState(0);

  // Collect any friend bonus that became due while the app was closed.
  useEffect(() => {
    let active = true;
    void collectFriendBonuses().then((n) => {
      if (active && n > 0) setBonus(n);
    });
    return () => {
      active = false;
    };
  }, []);

  const problemText = (p: FriendProblem): string =>
    ({
      noOne: c.errNoOne, own: c.errOwn, already: c.errAlready, sent: c.errSent, tooMany: c.errTooMany,
      finished: c.errFinished, invited: c.errInvited, pathFull: c.errPathFull, other: c.errGeneric,
    })[p];

  async function run(key: string, action: () => Promise<void>) {
    setBusy(key);
    try {
      await action();
    } catch (e) {
      setNotice({ text: problemText(e instanceof FriendError ? e.problem : 'other'), bad: true });
    } finally {
      setBusy(null);
    }
  }

  const send = () =>
    run('send', async () => {
      setNotice(null);
      const r = await sendFriendRequest(typed);
      setNotice({ text: r === 'accepted' ? c.nowFriends : c.requestSent, bad: false });
      setTyped('');
      friends.reload();
    });

  const accept = (f: Friend) =>
    run(f.id, async () => {
      setNotice(null);
      await acceptFriendRequest(f.id);
      friends.reload();
      // Two friends may already have finished the same path: pay out right away.
      void collectFriendBonuses().then((n) => n > 0 && setBonus((b) => b + n));
    });

  const remove = (f: Friend) =>
    run(f.id, async () => {
      setNotice(null);
      await removeFriendship(f.id);
      friends.reload();
      invites.reload();
    });

  const acceptInvite = (q: QuestInvite) =>
    run(q.id, async () => {
      setNotice(null);
      await acceptQuestInvite(q.id);
      invites.reload();
    });

  const dropInvite = (q: QuestInvite) =>
    run(q.id, async () => {
      setNotice(null);
      await cancelQuestInvite(q.id);
      invites.reload();
    });

  const confirmRemove = (f: Friend) =>
    Alert.alert(c.removeTitle, fill(c.removeText, { name: f.name }), [
      { text: c.keep, style: 'cancel' },
      { text: c.remove, style: 'destructive', onPress: () => void remove(f) },
    ]);

  const share = () => {
    if (code.data) void Share.share({ message: fill(c.shareMessage, { code: shown(code.data) }) });
  };

  const list = friends.data ?? [];
  const incoming = list.filter((f) => f.status === 'pending' && !f.outgoing);
  const accepted = list.filter((f) => f.status === 'accepted');
  const waiting = list.filter((f) => f.status === 'pending' && f.outgoing);

  return (
    <KeyboardAvoidingView style={s.root} behavior="padding">
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 20, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 60, gap: 14 }}>
        <BackButton />
        <Text style={s.h1}>{c.title}</Text>
        <Text style={s.text}>{c.intro}</Text>

        {bonus > 0 ? (
          <View style={s.bonus}>
            <Text style={s.bonusText}>{fill(c.bonusEarned, { n: bonus })}</Text>
          </View>
        ) : null}

        <View style={s.card}>
          <Text style={s.label}>{c.yourCode}</Text>
          {code.data ? (
            <Text style={s.code} selectable>{shown(code.data)}</Text>
          ) : code.error ? (
            <Text style={s.problem}>{c.loadError}</Text>
          ) : (
            <ActivityIndicator color={Brand.ink} />
          )}
          <Button label={c.share} variant="ghost" onPress={share} disabled={!code.data} />
        </View>

        <View style={s.card}>
          <Field
            label={c.addTitle}
            hint={c.addHint}
            value={typed}
            onChangeText={setTyped}
            placeholder={c.codePlaceholder}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={9}
            error={notice?.bad ? notice.text : null}
          />
          {notice && !notice.bad ? <Text style={s.good}>{notice.text}</Text> : null}
          <Button label={c.send} onPress={() => void send()} loading={busy === 'send'} disabled={typed.replace(/[^a-zA-Z0-9]/g, '').length !== 8} />
        </View>

        {friends.loading && !friends.data ? <ActivityIndicator color={Brand.ink} /> : null}
        {friends.error && !friends.data ? (
          <View style={{ gap: 10 }}>
            <Text style={s.problem}>{c.loadError}</Text>
            <Button label={c.retry} variant="ghost" onPress={friends.reload} />
          </View>
        ) : null}

        {incoming.length > 0 ? (
          <Section title={c.requestsTitle}>
            {incoming.map((f) => (
              <View key={f.id} style={s.row}>
                <Text style={s.name} numberOfLines={1}>{f.name}</Text>
                <View style={s.actions}>
                  <Button label={c.accept} onPress={() => void accept(f)} loading={busy === f.id} />
                  <Button label={c.decline} variant="danger" onPress={() => void remove(f)} disabled={busy === f.id} />
                </View>
              </View>
            ))}
          </Section>
        ) : null}

        {friends.data ? (
          <Section title={c.friendsTitle}>
            {accepted.length === 0 ? (
              <Text style={s.text}>{c.noFriends}</Text>
            ) : (
              accepted.map((f) => (
                <View key={f.id} style={s.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.name} numberOfLines={1}>{f.name}</Text>
                    <Text style={s.sub}>{fill(c.pathsDone, { n: f.donePaths.length })}</Text>
                  </View>
                  <Button label={c.remove} variant="danger" onPress={() => confirmRemove(f)} disabled={busy === f.id} />
                </View>
              ))
            )}
          </Section>
        ) : null}

        {invites.data ? (
          <Section title={c.questsTitle}>
            {invites.data.length === 0 ? (
              <Text style={s.text}>{c.questsEmpty}</Text>
            ) : (
              invites.data.map((q) => (
                <View key={q.id} style={s.inviteCard}>
                  <Text style={s.name}>
                    {fill(q.outgoing ? c.youInvited : c.invitedYou, { name: q.friendName, path: pathName(q.pathId) })}
                  </Text>
                  {q.status === 'accepted' ? (
                    <View style={s.states}>
                      <Text style={[s.chip, q.meDone && s.chipOn]}>
                        {c.youLabel}: {q.meDone ? `${c.stateDone} ✓` : c.stateNotYet}
                      </Text>
                      <Text style={[s.chip, q.friendDone && s.chipOn]}>
                        {q.friendName}: {q.friendDone ? `${c.stateDone} ✓` : c.stateNotYet}
                      </Text>
                    </View>
                  ) : null}
                  {q.paid ? <Text style={s.good}>{c.paidLabel}</Text> : null}
                  {!q.paid && !(q.meDone && q.friendDone) ? (
                    <View style={s.actions}>
                      {q.status === 'pending' && !q.outgoing ? (
                        <Button label={c.accept} onPress={() => void acceptInvite(q)} loading={busy === q.id} />
                      ) : null}
                      <Button
                        label={q.status === 'accepted' ? c.leave : q.outgoing ? c.withdraw : c.decline}
                        variant="danger"
                        onPress={() => void dropInvite(q)}
                        disabled={busy === q.id}
                      />
                    </View>
                  ) : null}
                </View>
              ))
            )}
          </Section>
        ) : null}

        {waiting.length > 0 ? (
          <Section title={c.waitingTitle}>
            {waiting.map((f) => (
              <View key={f.id} style={s.row}>
                <Text style={s.name} numberOfLines={1}>{f.name}</Text>
                <Button label={c.cancel} variant="danger" onPress={() => void remove(f)} disabled={busy === f.id} />
              </View>
            ))}
          </Section>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 10 }}>
      <Text style={s.h2}>{title}</Text>
      {children}
    </View>
  );
}

/** 'K7MQ2XPA' is easier to read and type as 'K7MQ-2XPA'. */
const shown = (code: string) => (code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code);

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Brand.paper },
  h1: { fontSize: 32, fontWeight: '800', color: Brand.ink, letterSpacing: -0.5 },
  h2: { fontSize: 20, fontWeight: '800', color: Brand.ink },
  text: { fontSize: 15, lineHeight: 22, color: Brand.inkSoft },
  problem: { fontSize: 15, fontWeight: '800', color: Brand.orange },
  good: { fontSize: 14, fontWeight: '800', color: '#3d7a12' },
  card: {
    backgroundColor: Brand.white,
    borderWidth: BORDER,
    borderColor: Brand.ink,
    borderRadius: 14,
    padding: 14,
    gap: 10,
    ...hardShadow(4),
  },
  label: { fontSize: 13, fontWeight: '800', color: Brand.inkFaint, textTransform: 'uppercase', letterSpacing: 0.6 },
  code: { fontSize: 34, fontWeight: '800', color: Brand.ink, letterSpacing: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Brand.white,
    borderWidth: 2,
    borderColor: Brand.ink,
    borderRadius: 12,
    padding: 12,
  },
  name: { flex: 1, fontSize: 17, fontWeight: '800', color: Brand.ink },
  sub: { fontSize: 13, color: Brand.inkFaint, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 8 },
  inviteCard: {
    gap: 8,
    backgroundColor: Brand.white,
    borderWidth: 2,
    borderColor: Brand.ink,
    borderRadius: 12,
    padding: 12,
  },
  states: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    fontSize: 13,
    fontWeight: '800',
    color: Brand.inkFaint,
    borderWidth: 2,
    borderColor: Brand.ink,
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 3,
    overflow: 'hidden',
  },
  chipOn: { backgroundColor: Brand.yellow, color: Brand.ink },
  bonus: {
    backgroundColor: Brand.yellow,
    borderWidth: BORDER,
    borderColor: Brand.ink,
    borderRadius: 12,
    padding: 12,
    ...hardShadow(3),
  },
  bonusText: { fontSize: 16, fontWeight: '800', color: Brand.ink },
});
