import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

import { MY_POINTS, OFFERS, type Offer } from '@/constants/site-data';

// Persistent points + perks store for the shop.
//
// This is the SINGLE seam between the UI and "where perks live". Today it reads and
// writes on-device via AsyncStorage so redemptions and the balance survive the app
// closing and reopening. When a real account/points backend exists, swap the
// `load`/`persist` bodies (and the mutators) for API calls — the hook's shape and the
// shop UI stay the same.
//
// Mirrors the module-level + useSyncExternalStore pattern of use-lang.ts so the state
// is shared across screens without pulling in a state library.

const STORAGE_KEY = 'timisight.perks.v1';

export type PerksState = {
  /** Current spendable points balance. */
  balance: number;
  /** Ids of `kind: 'active'` offers the user currently holds active. */
  active: string[];
  /** Per-offer claim counts for `kind: 'repeatable'` offers. */
  claims: Record<string, number>;
};

const defaultState: PerksState = {
  balance: MY_POINTS,
  active: [],
  claims: {},
};

let state: PerksState = defaultState;
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((cb) => cb());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot(): PerksState {
  return state;
}

function setState(next: PerksState) {
  state = next;
  emit();
  void persist(next);
}

async function persist(next: PerksState) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Non-fatal in a demo: if storage write fails the in-memory state is still correct
    // for this session; it just won't survive a restart.
  }
}

/**
 * Load persisted perks state from disk once, on first mount. Safe to call repeatedly;
 * it only hydrates the first time. Returns nothing — subscribers re-render via the
 * store when hydration completes.
 */
export async function hydratePerks(): Promise<void> {
  if (hydrated) return;
  hydrated = true;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Partial<PerksState>;
    state = {
      balance: typeof parsed.balance === 'number' ? parsed.balance : defaultState.balance,
      active: Array.isArray(parsed.active) ? parsed.active : [],
      claims: parsed.claims && typeof parsed.claims === 'object' ? parsed.claims : {},
    };
    emit();
  } catch {
    // Corrupt/unreadable storage: fall back to defaults already in `state`.
  }
}

function offerById(id: string): Offer | undefined {
  return OFFERS.find((o) => o.id === id);
}

/** Can the user afford, and is it valid to redeem/claim, this offer right now? */
export function canRedeem(offer: Offer, s: PerksState): boolean {
  if (s.balance < offer.cost) return false;
  const soldOut = offer.stock !== null && offer.stock <= 0;
  if (soldOut) return false;
  // An already-active pass cannot be redeemed again (deactivate first).
  if (offer.kind === 'active' && s.active.includes(offer.id)) return false;
  return true;
}

/**
 * Redeem an `active` pass: spend its cost once and mark it active. No-op if it is
 * already active or unaffordable.
 */
export function redeemActive(id: string) {
  const offer = offerById(id);
  if (!offer || offer.kind !== 'active') return;
  if (!canRedeem(offer, state)) return;
  setState({
    ...state,
    balance: state.balance - offer.cost,
    active: [...state.active, id],
  });
}

/**
 * Deactivate an active pass so it returns to the catalogue as redeemable again.
 * Does NOT refund points (the points were spent) — flip this if product wants refunds.
 */
export function deactivate(id: string) {
  if (!state.active.includes(id)) return;
  setState({ ...state, active: state.active.filter((a) => a !== id) });
}

/**
 * Claim a `repeatable` offer (e.g. a free coffee): spend its cost and bump its claim
 * count. Can be done any number of times while the balance allows.
 */
export function claimRepeatable(id: string) {
  const offer = offerById(id);
  if (!offer || offer.kind !== 'repeatable') return;
  if (!canRedeem(offer, state)) return;
  setState({
    ...state,
    balance: state.balance - offer.cost,
    claims: { ...state.claims, [id]: (state.claims[id] ?? 0) + 1 },
  });
}

/** Read-only subscription to the perks store. */
export function usePerks(): PerksState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
