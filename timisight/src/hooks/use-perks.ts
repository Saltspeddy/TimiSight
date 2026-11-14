import { useSyncExternalStore } from 'react';

import type { Offer } from '@/constants/site-data';
import {
  reloadCollection,
  totalPoints,
  useCollection,
} from '@/constants/collection';
import { refreshOffers } from '@/hooks/use-offers';
import { supabase } from '@/lib/supabase';

// Points + perks store for the shop.
//
// POINTS ARE UNIFIED: the spendable balance is the SAME ledger as the points earned by
// scanning flowers. There is no separate balance counter — `balance` is read from the
// collection store's `totalPoints()` (which reflects the DB `user_points_a0` view). This
// is what makes "earned == spendable" true rather than cosmetic.
//
// Redemption goes through the `redeem_offer_a0` RPC (atomic, double-spend-safe, decrements
// real stock). The returned one-time code is discarded this milestone (no code UI yet).
//
// The per-offer `active` passes and `claims` counts remain CLIENT-SIDE presentation state
// for the demo (they drive the "Active perks" banner). Only the points are DB-backed; the
// DB does write a redemptions_a0 row per redeem, but we do not read those back to
// reconstruct the banner here.

export type RedeemResult = { ok: true; code: string } | { ok: false; error: string };

export type PerksState = {
  /** Ids of `kind: 'active'` offers the user currently holds active (client-side). */
  active: string[];
  /** Per-offer claim counts for `kind: 'repeatable'` offers (client-side). */
  claims: Record<string, number>;
};

let state: PerksState = { active: [], claims: {} };
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((cb) => cb());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function getSnapshot(): PerksState {
  return state;
}

function setState(next: PerksState) {
  state = next;
  emit();
}

/** Can the user afford, and is it valid to redeem/claim, this offer right now? */
export function canRedeem(offer: Offer, balance: number, s: PerksState): boolean {
  if (balance < offer.cost) return false;
  const soldOut = offer.stock !== null && offer.stock <= 0;
  if (soldOut) return false;
  // An already-active pass cannot be redeemed again (deactivate first).
  if (offer.kind === 'active' && s.active.includes(offer.id)) return false;
  return true;
}

/** Map a redeem RPC error message to an i18n key the shop already has copy for. */
function mapRedeemError(message: string | undefined): string {
  switch (message) {
    case 'not enough points':
      return 'notEnough';
    case 'sold out':
      return 'soldOut';
    default:
      // 'offer not available', 'not signed in', or anything unexpected.
      return 'generic';
  }
}

/**
 * Spend points for an `active` pass via the DB. On success marks it active locally and
 * refreshes the balance + stock. `offerId` is the DB offer UUID (from use-offers.ts).
 */
export async function redeemActive(offer: Offer): Promise<RedeemResult> {
  if (offer.kind !== 'active') return { ok: false, error: 'generic' };
  const { data, error } = await supabase.rpc('redeem_offer_a0', { p_offer: offer.id });
  if (error) {
    console.warn('[perks] redeemActive failed:', error.message);
    return { ok: false, error: mapRedeemError(error.message) };
  }
  setState({ ...state, active: [...state.active, offer.id] });
  await Promise.all([reloadCollection(), refreshOffers()]);
  return { ok: true, code: String(data ?? '') };
}

/**
 * Claim a `repeatable` offer via the DB. On success bumps the local claim count and
 * refreshes the balance + stock.
 */
export async function claimRepeatable(offer: Offer): Promise<RedeemResult> {
  if (offer.kind !== 'repeatable') return { ok: false, error: 'generic' };
  const { data, error } = await supabase.rpc('redeem_offer_a0', { p_offer: offer.id });
  if (error) {
    console.warn('[perks] claimRepeatable failed:', error.message);
    return { ok: false, error: mapRedeemError(error.message) };
  }
  setState({
    ...state,
    claims: { ...state.claims, [offer.id]: (state.claims[offer.id] ?? 0) + 1 },
  });
  await Promise.all([reloadCollection(), refreshOffers()]);
  return { ok: true, code: String(data ?? '') };
}

/**
 * Deactivate an active pass so it returns to the catalogue as redeemable again.
 * Client-side only; does NOT refund points (they were spent in the ledger).
 */
export function deactivate(id: string) {
  if (!state.active.includes(id)) return;
  setState({ ...state, active: state.active.filter((a) => a !== id) });
}

/** Read-only subscription to the client-side perks presentation state. */
export function usePerks(): PerksState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** The unified spendable balance (same ledger as earned points). */
export function usePointsBalance(): number {
  // Subscribe to the collection store so the balance re-renders on change.
  useCollection();
  return totalPoints();
}
