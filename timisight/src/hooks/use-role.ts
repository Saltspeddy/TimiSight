import { useSyncExternalStore } from 'react';

import type { Role } from '@/constants/roles';
import { supabase } from '@/lib/supabase';

// The signed-in person's role (visitor / organization / artist), read from the database.
// Same module-level + useSyncExternalStore pattern as use-flowers.ts / use-lang.ts.
//
// The flow: sign in with Auth0 first, then, if the database has no role for this person
// yet, the app shows the "who are you joining as?" screen (phase 'choose') and records the
// answer with set_my_role. Anyone who already has a role goes straight into the app.
//
//   idle / loading  we don't know yet
//   choose          signed in, no role recorded yet: ask
//   ready           role known
//   error           the lookup failed (offline, or the roles SQL hasn't been run). The app
//                   stays usable as a visitor and says so, rather than failing silently.

export type RoleState = {
  phase: 'idle' | 'loading' | 'choose' | 'ready' | 'error';
  role: Role | null;
  /** Organization or artist name; null for visitors. */
  name: string | null;
  error: string | null;
};

const IDLE: RoleState = { phase: 'idle', role: null, name: null, error: null };

let state: RoleState = IDLE;
// Bumped on every sync/reset so a slow answer for a previous sign-in can't overwrite the
// current one.
let generation = 0;
const listeners = new Set<() => void>();

function set(next: RoleState) {
  state = next;
  listeners.forEach((cb) => cb());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useRole(): RoleState {
  return useSyncExternalStore(subscribe, () => state, () => state);
}

/** Forget everything (on sign-out). */
export function resetRole() {
  generation++;
  set(IDLE);
}

type RoleRow = { role: Role; display_name: string | null };

const messageOf = (e: unknown) =>
  e instanceof Error ? e.message : (e as { message?: string })?.message ?? String(e);

/** Give up on a database call that never answers, so nobody waits on a spinner forever. */
function withTimeout<T>(work: PromiseLike<T>, ms = 10000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timed out')), ms);
    Promise.resolve(work).then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); },
    );
  });
}

async function readOwnRole(): Promise<RoleRow | null> {
  // Row-level security returns only the caller's own row.
  const { data, error } = await withTimeout(
    supabase.from('user_roles_a0').select('role, display_name').maybeSingle(),
  );
  if (error) throw error;
  return (data as RoleRow | null) ?? null;
}

/**
 * Look up this person's role. Has one: ready. Has none: ask them to choose.
 * Safe to call again.
 */
export async function syncRole() {
  const mine = ++generation;
  set({ ...IDLE, phase: 'loading' });

  try {
    const row = await readOwnRole();
    if (mine !== generation) return; // signed out or re-synced in the meantime
    if (!row) set({ phase: 'choose', role: null, name: null, error: null });
    else set({ phase: 'ready', role: row.role, name: row.display_name, error: null });
  } catch (e) {
    if (mine !== generation) return;
    console.warn('[role] lookup failed:', messageOf(e));
    set({ phase: 'error', role: null, name: null, error: messageOf(e) });
  }
}

/**
 * Record the choice made on the "who are you joining as?" screen. Resolves to null on
 * success (the app then moves on by itself), or an error message to show.
 * The database refuses a missing name and ignores a second attempt: a role is permanent.
 */
export async function chooseRole(role: Role, name?: string): Promise<string | null> {
  const mine = generation;
  try {
    const { error } = await withTimeout(
      supabase.rpc('set_my_role', { p_role: role, p_name: name?.trim() || null }),
    );
    if (error) throw error;
    const row = await readOwnRole();
    if (mine !== generation) return null; // signed out meanwhile
    set({
      phase: 'ready',
      role: row?.role ?? 'user',
      name: row?.display_name ?? null,
      error: null,
    });
    return null;
  } catch (e) {
    console.warn('[role] could not save the role:', messageOf(e));
    return messageOf(e);
  }
}
