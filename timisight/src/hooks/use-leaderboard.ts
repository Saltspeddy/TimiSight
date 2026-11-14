import { useSyncExternalStore } from 'react';

import { supabase } from '@/lib/supabase';

// Public ranking, read from the `leaderboard_a0` DB view (auth0_sub, display_name,
// lifetime). Same module-level + useSyncExternalStore pattern as use-flowers.ts: renders
// instantly from the last snapshot, then swaps in fresh rows when the fetch resolves.
//
// The view is granted to anon + authenticated and ranks every user by lifetime points
// earned. We keep the stable `auth0_sub` so the screen can highlight the signed-in user.

export type LeaderboardEntry = {
  sub: string;
  name: string;
  lifetime: number;
};

type Row = { auth0_sub: string; display_name: string | null; lifetime: number | null };

let entries: LeaderboardEntry[] = [];
let loaded = false;
let inFlight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((cb) => cb());
}

async function fetchLeaderboard(): Promise<void> {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    try {
      const { data, error } = await supabase
        .from('leaderboard_a0')
        .select('auth0_sub, display_name, lifetime')
        .order('lifetime', { ascending: false, nullsFirst: false })
        .limit(100);

      if (error) throw error;
      entries = ((data ?? []) as Row[]).map((r) => ({
        sub: r.auth0_sub,
        name: r.display_name ?? 'Explorer',
        lifetime: r.lifetime ?? 0,
      }));
    } catch (e) {
      // Network/permission failure: keep the last snapshot (empty on first load) and log.
      console.warn('[useLeaderboard] failed to load:', e);
    } finally {
      loaded = true;
      inFlight = null;
      emit();
    }
  })();
  return inFlight;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  if (!loaded && !inFlight) void fetchLeaderboard();
  return () => {
    listeners.delete(cb);
  };
}

const getSnapshot = () => entries;

/** The live public ranking, highest lifetime points first. Empty until the fetch resolves. */
export function useLeaderboard(): LeaderboardEntry[] {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** Force a refetch (e.g. pull-to-refresh or after earning points). */
export function refreshLeaderboard(): Promise<void> {
  loaded = false;
  return fetchLeaderboard();
}
