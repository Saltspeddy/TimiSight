import { supabase } from '@/lib/supabase';

// Everything the app reads and writes for friends. The rules (visitors only, one request per
// pair, the point cap, no double payment) are enforced in the database, see
// web/supabase/friends.sql. Nothing here is a security check; it only shapes the data.

export type Friend = {
  id: string;
  status: 'pending' | 'accepted';
  /** For a pending request: true when YOU sent it, false when it is waiting on you. */
  outgoing: boolean;
  name: string;
  donePaths: string[];
};

/** Why a friend action failed, in terms the screen can explain. */
export type FriendProblem =
  | 'noOne'
  | 'own'
  | 'already'
  | 'sent'
  | 'tooMany'
  | 'finished'
  | 'invited'
  | 'pathFull'
  | 'other';

export class FriendError extends Error {
  /** `problem` is for the screen; the message keeps the database's own words for the log. */
  constructor(readonly problem: FriendProblem, detail?: string) {
    super(detail || problem);
  }
}

function problemOf(message: string): FriendProblem {
  const m = message.toLowerCase();
  if (m.includes('no one has that code')) return 'noOne';
  if (m.includes('own code')) return 'own';
  if (m.includes('already friends')) return 'already';
  if (m.includes('already sent')) return 'sent';
  if (m.includes('too many open')) return 'tooMany';
  if (m.includes('too many invitations')) return 'pathFull';
  if (m.includes('already finished')) return 'finished';
  if (m.includes('already invited')) return 'invited';
  return 'other';
}

async function call<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new FriendError(problemOf(error.message ?? ''), error.message);
  return data as T;
}

/** This visitor's friend code (created on first use), e.g. 'K7MQ2XPA'. */
export const myFriendCode = () => call<string>('my_friend_code');

/** 'sent', or 'accepted' when that person had already asked you. */
export const sendFriendRequest = (code: string) => call<'sent' | 'accepted'>('send_friend_request', { p_code: code });

export const acceptFriendRequest = (id: string) => call<void>('accept_friend_request', { p_id: id });

/** Decline a request, cancel one you sent, or unfriend. */
export const removeFriendship = (id: string) => call<void>('remove_friendship', { p_id: id });

type FriendRow = { id: string; status: 'pending' | 'accepted'; outgoing: boolean; name: string; done_paths: string[] | null };

export async function listFriends(): Promise<Friend[]> {
  const rows = await call<FriendRow[] | null>('list_friends');
  return (rows ?? []).map((r) => ({
    id: r.id,
    status: r.status,
    outgoing: r.outgoing,
    name: r.name,
    donePaths: r.done_paths ?? [],
  }));
}

/**
 * Collect any friend bonuses that are due. Paid once each by the database, so calling this
 * often is harmless. Returns the points just added (0 when nothing was due). Never throws:
 * a failure here must not get in the way of the screen that called it.
 */
export async function claimFriendBonuses(): Promise<number> {
  try {
    const r = await call<{ awarded?: number } | null>('claim_friend_bonuses');
    return typeof r?.awarded === 'number' ? r.awarded : 0;
  } catch (e) {
    console.warn('[friends] claim_friend_bonuses failed:', e);
    return 0;
  }
}

// ------------------------------------------------------------ quest invitations
// "Do this path together": both friends must finish it, then each earns the bonus.

export type QuestInvite = {
  id: string;
  pathId: string;
  status: 'pending' | 'accepted';
  /** True when YOU sent it. */
  outgoing: boolean;
  friendName: string;
  meDone: boolean;
  friendDone: boolean;
  /** The bonus for this shared quest has been paid to you. */
  paid: boolean;
};

type QuestInviteRow = {
  id: string;
  path_id: string;
  status: 'pending' | 'accepted';
  outgoing: boolean;
  friend_name: string;
  me_done: boolean;
  friend_done: boolean;
  paid: boolean;
};

export async function listQuestInvites(): Promise<QuestInvite[]> {
  const rows = await call<QuestInviteRow[] | null>('list_quest_invites');
  return (rows ?? []).map((r) => ({
    id: r.id,
    pathId: r.path_id,
    status: r.status,
    outgoing: r.outgoing,
    friendName: r.friend_name,
    meDone: r.me_done,
    friendDone: r.friend_done,
    paid: r.paid,
  }));
}

/** Invite one of your friends (by the friendship id from listFriends) to a path. */
export const inviteFriendToPath = (pathId: string, friendshipId: string) =>
  call<void>('invite_friend_to_path', { p_path: pathId, p_friendship: friendshipId });

export const acceptQuestInvite = (id: string) => call<void>('accept_quest_invite', { p_id: id });

/** Decline, withdraw, or drop out of a shared quest. */
export const cancelQuestInvite = (id: string) => call<void>('cancel_quest_invite', { p_id: id });
