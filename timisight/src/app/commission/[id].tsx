import { useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
 
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ScrollViewInstance,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackButton } from '@/components/back-button';
import { Button } from '@/components/button';
import { StatusChip } from '@/components/status-chip';
import { BORDER, Brand } from '@/constants/brand';
import { RC, type CommissionStatus } from '@/constants/roles';
import { useAuth } from '@/hooks/auth';
import { useLang } from '@/hooks/use-lang';
import { useQuery } from '@/hooks/use-query';
import { friendlyError, getCommission, listMessages, sendMessage, setCommissionStatus } from '@/lib/commissions';

// One statue commission: the brief the organization wrote, the status, and the chat where
// the two sides pin down the requirements. The chat only opens once the artist accepts.
export default function CommissionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [lang] = useLang();
  const c = RC[lang];
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  // Both refresh every few seconds, so the other person's reply or decision shows up.
  const commission = useQuery(`commission:${id}`, () => getCommission(id), 5000);
  const messages = useQuery(`messages:${id}`, () => listMessages(id), 4000);

  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [acting, setActing] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const scroller = useRef<ScrollViewInstance>(null);
  // How many messages were on screen the last time we scrolled, so the view jumps to the
  // newest message only when one arrives (not on every refresh while someone reads the brief).
  const seen = useRef(0);

  const m = commission.data;
  const isOrg = !!m && user?.sub === m.orgSub;
  const isArtist = !!m && user?.sub === m.artistSub;
  const chatOpen = m?.status === 'discussing' || m?.status === 'agreed';

  const run = async (status: CommissionStatus) => {
    setActing(true);
    setProblem(null);
    try {
      await setCommissionStatus(id, status);
      commission.reload();
    } catch (e) {
      setProblem(friendlyError(e, c));
    } finally {
      setActing(false);
    }
  };

  // Accepting is harmless; every other change ends or settles the commission, so confirm it.
  const act = (status: CommissionStatus, confirm: boolean) => {
    if (!confirm) return void run(status);
    Alert.alert(c.confirmTitle, undefined, [
      { text: c.confirmNo, style: 'cancel' },
      { text: c.confirmYes, onPress: () => void run(status) },
    ]);
  };

  const send = async () => {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setProblem(null);
    try {
      await sendMessage(id, body);
      setDraft('');
      messages.reload();
    } catch (e) {
      setProblem(friendlyError(e, c));
    } finally {
      setSending(false);
    }
  };

  if (!m) {
    return (
      <View style={[s.root, { padding: 20, paddingTop: insets.top + 16 }]}>
        <BackButton />
        {commission.loading ? (
          <ActivityIndicator color={Brand.ink} />
        ) : (
          <View style={{ gap: 12 }}>
            <Text style={s.problem}>{c.errGeneric}</Text>
            <Button label={c.retry} onPress={commission.reload} variant="ghost" />
          </View>
        )}
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={s.root} behavior="padding">
      <ScrollView
        ref={scroller}
        onContentSizeChange={() => {
          const count = messages.data?.length ?? 0;
          if (count > seen.current) {
            seen.current = count;
            scroller.current?.scrollToEnd({ animated: true });
          }
        }}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 20, paddingTop: insets.top + 16, gap: 14 }}>
        <BackButton />

        <View style={{ gap: 8 }}>
          <Text style={s.h1}>{m.title}</Text>
          <Text style={s.who}>{isOrg ? m.artistName : m.orgName}</Text>
          <StatusChip status={m.status} />
        </View>

        {/* The requirements the organization wrote. */}
        <View style={s.card}>
          <Text style={s.h2}>{c.threadBrief}</Text>
          <Text style={s.body}>{m.brief}</Text>
          {m.budget ? <Detail label={c.threadBudget} value={m.budget} /> : null}
          {m.deadline ? <Detail label={c.threadDeadline} value={m.deadline} /> : null}
          {m.location ? <Detail label={c.threadLocation} value={m.location} /> : null}
        </View>

        {/* What each side can do right now. */}
        {isArtist && m.status === 'requested' ? (
          <View style={{ gap: 10 }}>
            <Text style={s.note}>{c.threadWaitingArtist}</Text>
            <Button label={c.actAccept} onPress={() => act('discussing', false)} loading={acting} />
            <Button label={c.actDecline} onPress={() => act('declined', true)} variant="danger" disabled={acting} />
          </View>
        ) : null}
        {isArtist && m.status === 'discussing' ? (
          <Button label={c.actDecline} onPress={() => act('declined', true)} variant="danger" disabled={acting} />
        ) : null}
        {isOrg && m.status === 'requested' ? (
          <View style={{ gap: 10 }}>
            <Text style={s.note}>{c.threadWaitingOrg}</Text>
            <Button label={c.actCancel} onPress={() => act('cancelled', true)} variant="danger" loading={acting} />
          </View>
        ) : null}
        {isOrg && m.status === 'discussing' ? (
          <View style={{ gap: 10 }}>
            <Button label={c.actAgree} onPress={() => act('agreed', true)} variant="ghost" loading={acting} />
            <Button label={c.actCancel} onPress={() => act('cancelled', true)} variant="danger" disabled={acting} />
          </View>
        ) : null}
        {m.status === 'declined' || m.status === 'cancelled' ? <Text style={s.note}>{c.threadClosed}</Text> : null}

        {problem ? <Text style={s.problem}>{problem}</Text> : null}

        {/* The conversation. */}
        {chatOpen || (messages.data && messages.data.length > 0) ? (
          <View style={{ gap: 8 }}>
            <Text style={s.h2}>{c.threadMessages}</Text>
            {messages.data && messages.data.length === 0 ? <Text style={s.note}>{c.threadEmpty}</Text> : null}
            {messages.data?.map((msg) => {
              const mine = msg.sender === user?.sub;
              return (
                <View key={msg.id} style={[s.bubble, mine ? s.bubbleMine : s.bubbleTheirs]}>
                  <Text style={s.bubbleText}>{msg.body}</Text>
                </View>
              );
            })}
          </View>
        ) : null}
      </ScrollView>

      {chatOpen ? (
        <View style={[s.composer, { paddingBottom: insets.bottom + 10 }]}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={c.threadPlaceholder}
            placeholderTextColor={Brand.inkFaint}
            multiline
            maxLength={2000}
            style={s.input}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={c.threadSend}
            disabled={sending || draft.trim().length === 0}
            onPress={() => void send()}
            style={[s.send, (sending || draft.trim().length === 0) && s.sendOff]}>
            <Text style={s.sendText}>{c.threadSend}</Text>
          </Pressable>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.detail}>
      <Text style={s.detailLabel}>{label}</Text>
      <Text style={s.detailValue}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Brand.paper },
  h1: { fontSize: 28, fontWeight: '800', color: Brand.ink, letterSpacing: -0.5 },
  h2: { fontSize: 18, fontWeight: '800', color: Brand.ink },
  who: { fontSize: 16, color: Brand.inkSoft },
  body: { fontSize: 16, lineHeight: 23, color: Brand.inkSoft },
  note: { fontSize: 15, color: Brand.inkFaint, fontStyle: 'italic' },
  problem: { fontSize: 15, fontWeight: '800', color: Brand.orange },
  card: {
    backgroundColor: Brand.white,
    borderWidth: 2,
    borderColor: Brand.ink,
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  detail: { flexDirection: 'row', gap: 8 },
  detailLabel: { fontSize: 14, fontWeight: '800', color: Brand.ink },
  detailValue: { flex: 1, fontSize: 14, color: Brand.inkSoft },
  bubble: {
    maxWidth: '82%',
    borderWidth: 2,
    borderColor: Brand.ink,
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  bubbleMine: { alignSelf: 'flex-end', backgroundColor: Brand.yellow },
  bubbleTheirs: { alignSelf: 'flex-start', backgroundColor: Brand.white },
  bubbleText: { fontSize: 16, color: Brand.ink },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: BORDER,
    borderTopColor: Brand.ink,
    backgroundColor: Brand.paper,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    borderWidth: 2,
    borderColor: Brand.ink,
    borderRadius: 12,
    backgroundColor: Brand.white,
    paddingVertical: 9,
    paddingHorizontal: 12,
    fontSize: 16,
    color: Brand.ink,
  },
  send: {
    backgroundColor: Brand.blue,
    borderWidth: 2,
    borderColor: Brand.ink,
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 16,
  },
  sendOff: { opacity: 0.5 },
  sendText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
