import { useSyncExternalStore } from 'react';

import { OFFERS, type Offer, type OfferKind } from '@/constants/site-data';
import { supabase } from '@/lib/supabase';

// Shop catalogue, fetched from the shared `offers` table (same pattern as use-flowers.ts).
//
// The offers are seeded into the DB by web/supabase/auth0-migration.sql with stable
// UUIDs and `kind` in the mobile vocabulary ('repeatable' | 'active'). Unlike the bundled
// OFFERS constant (slug ids), these rows have real UUIDs, so redeem_offer_a0(uuid) can be
// called with `offer.id` and decrements real stock against the shared ledger.
//
// The DB `offers.title` is a scalar string; the mobile UI expects a bilingual
// Record<Lang, string>. We map the scalar to both languages (the seed titles are English);
// the bundled OFFERS constant remains the source of bilingual copy where a matching row
// exists, keyed by title, so RO text is preserved for the seeded offers.

type OfferRow = {
  id: string;
  title: string;
  partner: string | null;
  kind: string | null;
  cost: number;
  stock: number | null;
  active: boolean;
};

const KINDS: OfferKind[] = ['repeatable', 'active'];
const isOfferKind = (k: string | null): k is OfferKind => KINDS.includes(k as OfferKind);

// Bilingual copy fallback: match a DB row to the bundled offer by its English title so
// the Romanian translation is not lost (the DB stores only a scalar title).
function bilingualTitle(enTitle: string): Record<'en' | 'ro', string> {
  const match = OFFERS.find((o) => o.title.en === enTitle);
  return match ? match.title : { en: enTitle, ro: enTitle };
}

function rowToOffer(row: OfferRow): Offer {
  return {
    id: row.id,
    partner: row.partner ?? '',
    cost: row.cost,
    stock: row.stock,
    kind: isOfferKind(row.kind) ? row.kind : 'active',
    title: bilingualTitle(row.title),
  };
}

let offers: Offer[] = [];
let loaded = false;
let inFlight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((cb) => cb());
}

async function fetchOffers(): Promise<void> {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    try {
      const { data, error } = await supabase
        .from('offers')
        .select('id, title, partner, kind, cost, stock, active')
        .eq('active', true)
        .order('cost', { ascending: true });

      if (error) throw error;
      offers = ((data ?? []) as OfferRow[]).map(rowToOffer);
    } catch (e) {
      // Fetch failed: leave the list empty (the shop renders no catalogue rather than
      // stale slug-keyed offers that can't be redeemed). Logged for debugging.
      console.warn('[useOffers] failed to load offers:', e);
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
  if (!loaded && !inFlight) void fetchOffers();
  return () => {
    listeners.delete(cb);
  };
}

const getSnapshot = () => offers;

/** The live shop catalogue (DB-backed, UUID-keyed). Empty until the fetch resolves. */
export function useOffers(): Offer[] {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** Imperatively refetch (e.g. after a redemption changes stock). */
export function refreshOffers(): Promise<void> {
  loaded = false;
  return fetchOffers();
}
