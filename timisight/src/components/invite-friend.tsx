import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { BORDER, Brand, hardShadow } from '@/constants/brand';
import { FC, fill } from '@/constants/friends';
import { useLang } from '@/hooks/use-lang';
import { useQuery } from '@/hooks/use-query';
import { FriendError, inviteFriendToPath, listFriends, type FriendProblem } from '@/lib/friends';

// "Invite a friend" on a flower path. Both friends must finish the path to earn the bonus;
// the rules are enforced in the database (web/supabase/friends.sql), this only asks.
export function InviteFriendButton({ pathId, pathName }: { pathId: string; pathName: string }) {
  const [lang] = useLang();
  const c = FC[lang];
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button label={c.inviteButton} variant="ghost" onPress={() => setOpen(true)} />
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <InviteSheet pathId={pathId} pathName={pathName} onClose={() => setOpen(false)} />
      </Modal>
    </>
  );
}

function InviteSheet({ pathId, pathName, onClose }: { pathId: string; pathName: string; onClose: () => void }) {
  const [lang] = useLang();
  const c = FC[lang];
  const insets = useSafeAreaInsets();
  // Only rendered while the sheet is open, so the list is fresh each time.
  const friends = useQuery('invite-friends', listFriends);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ text: string; bad: boolean } | null>(null);

  const accepted = (friends.data ?? []).filter((f) => f.status === 'accepted');

  const problemText = (p: FriendProblem): string =>
    ({
      noOne: c.errGeneric, own: c.errGeneric, already: c.errGeneric, sent: c.errGeneric,
      tooMany: c.errTooMany, finished: c.errFinished, invited: c.errInvited, pathFull: c.errPathFull,
      other: c.errGeneric,
    })[p];

  const invite = async (id: string, name: string) => {
    setBusy(id);
    setNotice(null);
    try {
      await inviteFriendToPath(pathId, id);
      setNotice({ text: fill(c.inviteSent, { name }), bad: false });
    } catch (e) {
      setNotice({ text: problemText(e instanceof FriendError ? e.problem : 'other'), bad: true });
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={s.backdrop}>
      <Pressable style={s.backdropTap} onPress={onClose} accessibilityLabel={c.inviteClose} />
      <View style={[s.sheet, { paddingBottom: insets.bottom + 16 }]}>
        <Text style={s.title}>{c.inviteTitle}</Text>
        <Text style={s.path}>{pathName}</Text>
        <Text style={s.hint}>{c.inviteHint}</Text>

        {friends.loading && !friends.data ? <ActivityIndicator color={Brand.ink} /> : null}
        {friends.error && !friends.data ? (
          <View style={{ gap: 10 }}>
            <Text style={s.bad}>{c.loadError}</Text>
            <Button label={c.retry} variant="ghost" onPress={friends.reload} />
          </View>
        ) : null}

        {friends.data && accepted.length === 0 ? (
          <View style={{ gap: 10 }}>
            <Text style={s.hint}>{c.inviteNoFriends}</Text>
            <Button
              label={c.inviteGoFriends}
              onPress={() => {
                onClose();
                router.push('/friends');
              }}
            />
          </View>
        ) : null}

        <ScrollView style={{ maxHeight: 280 }} contentContainerStyle={{ gap: 8 }} keyboardShouldPersistTaps="handled">
          {accepted.map((f) => (
            <Pressable
              key={f.id}
              disabled={busy !== null}
              onPress={() => void invite(f.id, f.name)}
              accessibilityRole="button"
              style={({ pressed }) => [s.friend, pressed && s.pressed]}>
              <Text style={s.name} numberOfLines={1}>{f.name}</Text>
              {busy === f.id ? <ActivityIndicator color={Brand.ink} /> : null}
            </Pressable>
          ))}
        </ScrollView>

        {notice ? <Text style={notice.bad ? s.bad : s.good}>{notice.text}</Text> : null}
        <Button label={c.inviteClose} variant="ghost" onPress={onClose} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(18,20,43,0.45)' },
  backdropTap: { flex: 1 },
  sheet: {
    backgroundColor: Brand.paper,
    borderTopWidth: BORDER,
    borderColor: Brand.ink,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    gap: 12,
  },
  title: { fontSize: 22, fontWeight: '800', color: Brand.ink },
  path: { fontSize: 16, fontWeight: '800', color: Brand.blue },
  hint: { fontSize: 14, lineHeight: 20, color: Brand.inkSoft },
  friend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    backgroundColor: Brand.white,
    borderWidth: 2,
    borderColor: Brand.ink,
    borderRadius: 12,
    padding: 14,
    ...hardShadow(3),
  },
  pressed: { transform: [{ translateX: 2 }, { translateY: 2 }] },
  name: { flex: 1, fontSize: 17, fontWeight: '800', color: Brand.ink },
  good: { fontSize: 14, fontWeight: '800', color: '#3d7a12' },
  bad: { fontSize: 14, fontWeight: '800', color: Brand.orange },
});
