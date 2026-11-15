import { useEffect, useSyncExternalStore } from 'react';

import { FLOWERS, rowToFlower, type Flower, type FlowerRow } from '@/constants/flowers';
import { supabase } from '@/lib/supabase';

// Fetches the flower catalogue from the `flowers` table and shares it across
// screens via a module-level store (same pattern as use-lang). Starts from the
// bundled FLOWERS fallback so the UI renders instantly and still works offline;
// swaps in the live DB rows once they arrive.

let flowers: Flower[] = FLOWERS;
let loaded = false;
let inFlight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((cb) => cb());
}

async function fetchFlowers() {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    try {
      const { data, error } = await supabase
        .from('flowers')
        .select('id, name_en, name_ro, latin_name, place_en, place_ro, character_en, character_ro, color, points, lat, lng')
        .eq('active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      const rows = (data ?? []) as FlowerRow[];
      // Keep the bundled fallback if the table is empty, so the garden is never
      // blank just because seeding hasn't happened yet.
      if (rows.length > 0) {
        flowers = rows.map(rowToFlower);
      }
    } catch (e) {
      // Network/permission failure: stay on the fallback data, log for debugging.
      console.warn('[useFlowers] falling back to bundled flowers:', e);
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
  // Kick off the fetch the first time anything subscribes.
  if (!loaded && !inFlight) void fetchFlowers();
  return () => {
    listeners.delete(cb);
  };
}

const getSnapshot = () => flowers;

/** The live flower catalogue, shared across screens. Returns the bundled
 *  fallback until the DB fetch resolves, then the live rows (re-rendering
 *  subscribers). Works offline and before the table is seeded. */
export function useFlowers(): Flower[] {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** Imperatively refetch (e.g. pull-to-refresh). */
export function refreshFlowers() {
  loaded = false;
  return fetchFlowers();
}

/** Re-read on screen focus without re-subscribing. */
export function useFlowersFocus() {
  useEffect(() => {
    if (!loaded && !inFlight) void fetchFlowers();
  }, []);
}
