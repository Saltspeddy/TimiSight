import { useSyncExternalStore } from 'react';

import { supabase } from '@/lib/supabase';

// Per-user flower collection + points, backed by Supabase (Auth0 third-party auth).
//
// Shape mirrors use-flowers.ts: a module-level store shared across screens via
// useSyncExternalStore, hydrated from the DB. Identity is the Auth0 `sub` carried in
// the Supabase access token, so no user id is passed from the client — the server's
// RLS/RPCs resolve it from the JWT.
//
//   collectedIds()  -> flower ids the signed-in user owns (hydrated snapshot)
//   totalPoints()   -> the user's current ledger balance (earned - spent)
//   checkIn(id)     -> async: records a scan + awards points once, returns the result
//   useCollection() -> reactive hook for screens
//
// A new user starts empty (0 flowers, 0 points): there are no demo seeds.

export type CheckInResult = { already: boolean; earned: number; total: number };

type CollectionState = {
  collectedIds: string[];
  total: number;
  lifetime: number;
  hydrated: boolean;
};

let state: CollectionState = { collectedIds: [], total: 0, lifetime: 0, hydrated: false };
let inFlight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((cb) => cb());
}

function setState(next: Partial<CollectionState>) {
  state = { ...state, ...next };
  emit();
}

/**
 * Load the signed-in user's collected flowers and points balance from the DB. Safe to
 * call repeatedly; it dedupes concurrent loads. A signed-out user (anon request) simply
 * reads back no rows, leaving the snapshot empty.
 */
async function loadCollection(): Promise<void> {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    try {
      const [flowersRes, pointsRes] = await Promise.all([
        supabase.from('user_flowers').select('flower_id'),
        supabase.from('user_points_a0').select('balance, lifetime').maybeSingle(),
      ]);

      const ids = (flowersRes.data ?? []).map((r) => r.flower_id as string);
      const balance =
        pointsRes.data && typeof pointsRes.data.balance === 'number'
          ? pointsRes.data.balance
          : 0;
      // lifetime = earned-only total (balance = earned - spent). The DB view exposes both;
      // the account screen binds "Lifetime earned" to this and "Points balance" to total.
      const lifetime =
        pointsRes.data && typeof pointsRes.data.lifetime === 'number'
          ? pointsRes.data.lifetime
          : 0;

      setState({ collectedIds: ids, total: balance, lifetime, hydrated: true });
    } catch (e) {
      // Network/permission failure: keep whatever we had, mark hydrated so the UI
      // stops showing a loading state. Logged for debugging.
      console.warn('[collection] load failed:', e);
      setState({ hydrated: true });
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  // Kick off the first load when anything subscribes (same as use-flowers.ts).
  if (!state.hydrated && !inFlight) void loadCollection();
  return () => {
    listeners.delete(cb);
  };
}

const getSnapshot = () => state;

/** Flower ids the signed-in user currently owns (from the hydrated snapshot). */
export const collectedIds = () => state.collectedIds;

/** The signed-in user's current points balance (earned - spent). */
export const totalPoints = () => state.total;

/**
 * Validate the untyped jsonb returned by `checkin_flower`, falling back to the current
 * snapshot total so the UI never renders NaN.
 */
function coerceResult(raw: unknown): CheckInResult {
  const r = (raw ?? {}) as Record<string, unknown>;
  const already = typeof r.already === 'boolean' ? r.already : false;
  const earned = Number.isFinite(r.earned as number) ? (r.earned as number) : 0;
  const total = Number.isFinite(r.total as number) ? (r.total as number) : state.total;
  return { already, earned, total };
}

/**
 * Record a scanned flower and award its points once. Identity is resolved server-side
 * from the Auth0 token, so only the flower id is sent. On success the local snapshot is
 * updated (owned ids + balance) and the result returned for the scan screen to show.
 * Throws if the server rejects the call (e.g. not signed in / unknown flower); callers
 * handle that and keep the UI unchanged.
 */
export async function checkIn(flowerId: string): Promise<CheckInResult> {
  const { data, error } = await supabase.rpc('checkin_flower', { p_flower: flowerId });
  if (error) throw error;

  const result = coerceResult(data);

  // Reflect the server truth locally without a round-trip. A first-time check-in also
  // raises lifetime (earned-only) by the amount awarded; a repeat scan earns nothing.
  const owned = state.collectedIds.includes(flowerId)
    ? state.collectedIds
    : [...state.collectedIds, flowerId];
  const lifetime = result.already ? state.lifetime : state.lifetime + result.earned;
  setState({ collectedIds: owned, total: result.total, lifetime, hydrated: true });

  return result;
}

/**
 * Clear the snapshot and reload for the current signed-in user. Called by the auth
 * layer on sign-in and sign-out (the collection is user-scoped, unlike the public
 * flower catalogue). On sign-out the reload reads back nothing and the snapshot is empty.
 */
export function resetCollectionForUserChange(): void {
  state = { collectedIds: [], total: 0, lifetime: 0, hydrated: false };
  emit();
  void loadCollection();
}

/**
 * Quest-write helper used by the scan flow (flower-view.tsx) after a successful check-in.
 * Activates any path whose start flower is the scanned one, then checks path completion for
 * each path that lists the flower. Both RPCs are idempotent server-side, so repeat scans are
 * harmless. Each call is isolated in try/catch so a quest write can NEVER break the scan UX.
 * This keeps checkIn's signature/behaviour unchanged and collection.ts free of quest-catalogue
 * knowledge (the caller supplies the relevant pathIds).
 *
 * The completion bonus is granted SERVER-SIDE inside complete_path_if_done (via
 * award_points_a0), so checkIn's optimistic total never sees it. When a path actually
 * completes and awards a bonus, we reconcile the local store from the DB (reloadCollection)
 * so every screen reading the store — Account balance + lifetime, Shop balance — reflects
 * the new total immediately, not just the leaderboard (which re-reads the DB on its own).
 * Returns true when the store was reconciled, so the caller knows points changed.
 */
export async function activateAndComplete(flowerId: string, pathIds: string[]): Promise<boolean> {
  try {
    const { error } = await supabase.rpc('activate_paths_for_flower', { p_flower: flowerId });
    if (error) throw error;
  } catch (e) {
    console.warn('[collection] activate_paths_for_flower failed:', e);
  }

  let awardedBonus = false;
  const bonusLanded = (data: unknown): boolean => {
    const r = (data ?? {}) as Record<string, unknown>;
    return (typeof r.awarded === 'number' && r.awarded > 0) || r.completed === true;
  };

  for (const pathId of pathIds) {
    try {
      const { data, error } = await supabase.rpc('complete_path_if_done', { p_path: pathId });
      if (error) throw error;
      // complete_path_if_done returns { completed, already, awarded }. A positive `awarded`
      // (or completed=true with a bonus) means the DB balance changed under us.
      if (bonusLanded(data)) awardedBonus = true;
    } catch (e) {
      console.warn('[collection] complete_path_if_done failed:', e);
    }
  }

  // Daily-quest completion bonus. Safe to call after ANY check-in: the RPC self-validates
  // that the scanned flower is today's daily quest and pays the flat bonus at most once
  // per Bucharest day. No catalogue knowledge needed here.
  try {
    const { data, error } = await supabase.rpc('complete_daily_if_done');
    if (error) throw error;
    if (bonusLanded(data)) awardedBonus = true;
  } catch (e) {
    console.warn('[collection] complete_daily_if_done failed:', e);
  }

  // Reconcile balance + lifetime from the DB once, only if a bonus landed.
  if (awardedBonus) {
    await reloadCollection();
  }
  return awardedBonus;
}

/**
 * Re-read the current user's collection + balance from the DB without clearing the
 * snapshot first (so the UI does not flash empty). Used after a shop redemption to
 * reflect the new balance.
 */
export function reloadCollection(): Promise<void> {
  inFlight = null;
  return loadCollection();
}

/** Reactive subscription to the collection store. */
export function useCollection(): CollectionState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
