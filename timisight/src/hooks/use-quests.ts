import { useSyncExternalStore } from 'react';

import { supabase } from '@/lib/supabase';

// Server-derived quest state (flower paths + the daily quest), shared across screens via a
// module-level store + useSyncExternalStore — same pattern as use-leaderboard.ts /
// use-flowers.ts: renders instantly from the last snapshot, swaps in fresh rows when the
// fetch resolves.
//
// This store owns ONLY the server-derived pieces: the path catalogue + stops, the caller's
// per-path activation/completion state, and the daily quest (via the get_daily_quest RPC).
// Per-stop "completed" is NOT stored here — the screen cross-references each stop against the
// collection store's collectedIds() so it stays reactive to scans without a refetch.

export type QuestStop = { flowerId: string; position: number };

export type PathQuest = {
  id: string;
  nameEn: string;
  nameRo: string;
  startFlowerId: string;
  badge: string | null;
  completionBonus: number;
  stops: QuestStop[];
  activated: boolean;
  completedAt: string | null;
};

export type DailyQuest = {
  flowerId: string;
  questDate: string;
  collectedToday: boolean;
} | null;

type QuestsState = {
  paths: PathQuest[];
  daily: DailyQuest;
  hydrated: boolean;
};

type PathRow = {
  id: string;
  name_en: string;
  name_ro: string;
  start_flower_id: string;
  badge: string | null;
  completion_bonus: number | null;
  sort_order: number | null;
};
type StopRow = { path_id: string; flower_id: string; position: number };
type UserPathRow = { path_id: string; completed_at: string | null };

let state: QuestsState = { paths: [], daily: null, hydrated: false };
let inFlight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((cb) => cb());
}

function setState(next: Partial<QuestsState>) {
  state = { ...state, ...next };
  emit();
}

/** Coerce the untyped jsonb from get_daily_quest into a DailyQuest (null on bad/empty data). */
function coerceDaily(raw: unknown): DailyQuest {
  const r = (raw ?? {}) as Record<string, unknown>;
  const flowerId = typeof r.flower_id === 'string' ? r.flower_id : null;
  const questDate = typeof r.quest_date === 'string' ? r.quest_date : null;
  if (!flowerId || !questDate) return null;
  return {
    flowerId,
    questDate,
    collectedToday: r.collected_today === true,
  };
}

async function fetchQuests(): Promise<void> {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    try {
      const [pathsRes, stopsRes, userPathsRes, dailyRes] = await Promise.all([
        supabase
          .from('flower_paths')
          .select('id, name_en, name_ro, start_flower_id, badge, completion_bonus, sort_order')
          .eq('active', true)
          .order('sort_order', { ascending: true }),
        supabase
          .from('flower_path_stops')
          .select('path_id, flower_id, position')
          .order('position', { ascending: true }),
        // RLS read-own: empty for a signed-out (anon) request.
        supabase.from('user_flower_paths').select('path_id, completed_at'),
        supabase.rpc('get_daily_quest'),
      ]);

      if (pathsRes.error) throw pathsRes.error;

      const stopsByPath = new Map<string, QuestStop[]>();
      for (const s of (stopsRes.data ?? []) as StopRow[]) {
        const list = stopsByPath.get(s.path_id) ?? [];
        list.push({ flowerId: s.flower_id, position: s.position });
        stopsByPath.set(s.path_id, list);
      }

      const userByPath = new Map<string, UserPathRow>();
      for (const u of (userPathsRes.data ?? []) as UserPathRow[]) {
        userByPath.set(u.path_id, u);
      }

      const paths: PathQuest[] = ((pathsRes.data ?? []) as PathRow[]).map((p) => {
        const user = userByPath.get(p.id);
        return {
          id: p.id,
          nameEn: p.name_en,
          nameRo: p.name_ro,
          startFlowerId: p.start_flower_id,
          badge: p.badge ?? null,
          completionBonus: p.completion_bonus ?? 0,
          stops: (stopsByPath.get(p.id) ?? []).sort((a, b) => a.position - b.position),
          activated: !!user,
          completedAt: user?.completed_at ?? null,
        };
      });

      // The daily RPC can fail for a signed-out user (it raises 'not signed in'); treat
      // that as "no daily quest" rather than failing the whole fetch.
      let daily: DailyQuest = null;
      if (dailyRes.error) {
        console.warn('[useQuests] daily quest failed:', dailyRes.error);
      } else {
        daily = coerceDaily(dailyRes.data);
      }

      setState({ paths, daily, hydrated: true });
    } catch (e) {
      // Network/permission failure: keep the last snapshot, mark hydrated so the UI stops
      // showing a loading state. Logged for debugging.
      console.warn('[useQuests] failed to load:', e);
      setState({ hydrated: true });
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  if (!state.hydrated && !inFlight) void fetchQuests();
  return () => {
    listeners.delete(cb);
  };
}

const getSnapshot = () => state;

/** Reactive subscription to the quests store. */
export function useQuests(): QuestsState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** Force a refetch (call after a scan and on tab focus). */
export function refreshQuests(): Promise<void> {
  inFlight = null;
  return fetchQuests();
}
