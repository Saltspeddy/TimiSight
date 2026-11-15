import type { CommissionStatus } from '@/constants/roles';
import { supabase } from '@/lib/supabase';

// Everything the app reads and writes for artists and statue commissions. All access goes
// through the Auth0-verified Supabase client, so row-level security (see
// web/supabase/roles-commissions.sql) decides who may see or change what; nothing here is a
// security check, it only shapes the data.

// ---------------------------------------------------------------- artists

export type Artist = {
  sub: string;
  name: string;
  headline: string | null;
  bio: string | null;
  city: string | null;
  specialties: string[];
  available: boolean;
  isSample: boolean;
};

type ArtistRow = {
  auth0_sub: string;
  name: string;
  headline: string | null;
  bio: string | null;
  city: string | null;
  specialties: string[] | null;
  available: boolean;
  is_sample: boolean;
};

const toArtist = (r: ArtistRow): Artist => ({
  sub: r.auth0_sub,
  name: r.name,
  headline: r.headline,
  bio: r.bio,
  city: r.city,
  specialties: r.specialties ?? [],
  available: r.available,
  isSample: r.is_sample,
});

/** The public artist directory. Real artists first, sample listings last. */
export async function listArtists(): Promise<Artist[]> {
  const { data, error } = await supabase
    .from('artists_a0')
    .select('*')
    .order('is_sample', { ascending: true })
    .order('name', { ascending: true });
  if (error) throw error;
  return ((data ?? []) as ArtistRow[]).map(toArtist);
}

export async function getArtist(sub: string): Promise<Artist | null> {
  const { data, error } = await supabase
    .from('artists_a0')
    .select('*')
    .eq('auth0_sub', sub)
    .maybeSingle();
  if (error) throw error;
  return data ? toArtist(data as ArtistRow) : null;
}

export type ArtistPatch = {
  name: string;
  headline: string | null;
  bio: string | null;
  city: string | null;
  specialties: string[];
  available: boolean;
};

/** Update the signed-in artist's own profile. Row-level security stops edits to anyone else's. */
export async function updateMyArtist(sub: string, patch: ArtistPatch): Promise<void> {
  const { data, error } = await supabase
    .from('artists_a0')
    .update(patch)
    .eq('auth0_sub', sub)
    .select('auth0_sub');
  if (error) throw error;
  // A blocked update is not an error in Postgres, it just changes nothing.
  if (!data || data.length === 0) throw new Error('not allowed');
}

// ---------------------------------------------------------------- commissions

export type Commission = {
  id: string;
  orgSub: string;
  orgName: string;
  artistSub: string;
  artistName: string;
  title: string;
  brief: string;
  budget: string | null;
  deadline: string | null;
  location: string | null;
  status: CommissionStatus;
  createdAt: string;
  updatedAt: string;
};

type CommissionRow = {
  id: string;
  org_sub: string;
  org_name: string;
  artist_sub: string;
  title: string;
  brief: string;
  budget: string | null;
  deadline: string | null;
  location: string | null;
  status: CommissionStatus;
  created_at: string;
  updated_at: string;
  artist: { name: string } | { name: string }[] | null;
};

const toCommission = (r: CommissionRow): Commission => {
  const artist = Array.isArray(r.artist) ? r.artist[0] : r.artist;
  return {
    id: r.id,
    orgSub: r.org_sub,
    orgName: r.org_name,
    artistSub: r.artist_sub,
    artistName: artist?.name ?? '',
    title: r.title,
    brief: r.brief,
    budget: r.budget,
    deadline: r.deadline,
    location: r.location,
    status: r.status,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
};

const COMMISSION_SELECT = '*, artist:artists_a0(name)';

/** The signed-in person's commissions (as organization or as artist), newest activity first. */
export async function listMyCommissions(): Promise<Commission[]> {
  const { data, error } = await supabase
    .from('commissions_a0')
    .select(COMMISSION_SELECT)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as unknown as CommissionRow[]).map(toCommission);
}

export async function getCommission(id: string): Promise<Commission | null> {
  const { data, error } = await supabase
    .from('commissions_a0')
    .select(COMMISSION_SELECT)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? toCommission(data as unknown as CommissionRow) : null;
}

export type NewCommission = {
  artist: string;
  title: string;
  brief: string;
  budget?: string;
  deadline?: string;
  location?: string;
};

/** Send a request to an artist. Returns the new commission's id. */
export async function createCommission(input: NewCommission): Promise<string> {
  const { data, error } = await supabase.rpc('create_commission', {
    p_artist: input.artist,
    p_title: input.title,
    p_brief: input.brief,
    p_budget: input.budget || null,
    p_deadline: input.deadline || null,
    p_location: input.location || null,
  });
  if (error) throw error;
  return data as string;
}

export async function setCommissionStatus(id: string, status: CommissionStatus): Promise<void> {
  const { error } = await supabase.rpc('set_commission_status', { p_id: id, p_status: status });
  if (error) throw error;
}

// ---------------------------------------------------------------- messages

export type Message = { id: number; sender: string; body: string; createdAt: string };

type MessageRow = { id: number; sender_sub: string; body: string; created_at: string };

export async function listMessages(commissionId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('commission_messages_a0')
    .select('id, sender_sub, body, created_at')
    .eq('commission_id', commissionId)
    .order('id', { ascending: true });
  if (error) throw error;
  return ((data ?? []) as MessageRow[]).map((m) => ({
    id: m.id,
    sender: m.sender_sub,
    body: m.body,
    createdAt: m.created_at,
  }));
}

export async function sendMessage(commissionId: string, body: string): Promise<void> {
  const { error } = await supabase
    .from('commission_messages_a0')
    .insert({ commission_id: commissionId, body });
  if (error) throw error;
}

// ---------------------------------------------------------------- errors

/**
 * The database raises plain-English errors for rule violations. Turn the two a person can
 * actually run into into their own language; everything else gets a generic message.
 */
export function friendlyError(
  e: unknown,
  copy: { errNotTaking: string; errTooMany: string; errGeneric: string },
): string {
  const message = e instanceof Error ? e.message : (e as { message?: string })?.message ?? '';
  if (/not taking requests/i.test(message)) return copy.errNotTaking;
  if (/too many open requests/i.test(message)) return copy.errTooMany;
  return copy.errGeneric;
}
