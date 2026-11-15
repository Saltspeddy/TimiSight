import * as Location from 'expo-location';
import { useSyncExternalStore } from 'react';

import type { Coords } from '@/lib/geo';

// THE LOCATION SEAM.
//
// All quest feature code reads the player's position through THIS module — never by
// calling expo-location directly from a screen. That single choke point lets a DEV-ONLY
// simulation override swap in a fake position so the hot/cold flow can be rehearsed
// without physically walking the route. Real and simulated paths run the EXACT same code:
// the override only changes what getPlayerLocation()/watchPlayerLocation() hand back.
//
// In production (__DEV__ === false) the override and its store do nothing — users always
// get real GPS. The dev UI that sets the override is also gated behind __DEV__, so it is
// not shipped.

export type PermissionStatus = 'granted' | 'denied' | 'undetermined';

/** Ask for foreground location permission. Returns a normalized status. */
export async function requestLocationPermission(): Promise<PermissionStatus> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') return 'granted';
    if (status === 'denied') return 'denied';
    return 'undetermined';
  } catch (e) {
    console.warn('[location] permission request failed:', e);
    return 'denied';
  }
}

// ---------------------------------------------------------------------------
// DEV-ONLY simulated position override.
// ---------------------------------------------------------------------------
let simulated: Coords | null = null;
const simListeners = new Set<() => void>();

function emitSim() {
  simListeners.forEach((cb) => cb());
}

/** Set a fake player position (DEV only; no-op in production). */
export function setSimulatedLocation(coords: Coords | null): void {
  if (!__DEV__) return;
  simulated = coords;
  emitSim();
}

/** The current simulated position, or null if none / not in dev. */
export function getSimulatedLocation(): Coords | null {
  return __DEV__ ? simulated : null;
}

/** Reactive hook for the dev simulation UI to reflect the active override. */
export function useSimulatedLocation(): Coords | null {
  return useSyncExternalStore(
    (cb) => {
      simListeners.add(cb);
      return () => simListeners.delete(cb);
    },
    getSimulatedLocation,
    getSimulatedLocation,
  );
}

// ---------------------------------------------------------------------------
// Reads — real GPS, or the dev override when set.
// ---------------------------------------------------------------------------

/**
 * One-shot current position. Returns the simulated position when a dev override is set,
 * otherwise the real device fix. Returns null if unavailable (permission denied, no fix).
 */
export async function getPlayerLocation(): Promise<Coords | null> {
  const sim = getSimulatedLocation();
  if (sim) return sim;
  try {
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
  } catch (e) {
    console.warn('[location] getCurrentPositionAsync failed:', e);
    return null;
  }
}

/**
 * Subscribe to live position updates for the hot/cold hint. When a dev override is active
 * the callback is driven by the simulation store instead of GPS, so the same UI reacts to
 * "teleporting" to a flower in dev. Returns an unsubscribe function.
 *
 * The callback fires immediately with the best currently-known position (sim or null),
 * then on each subsequent update.
 */
export function watchPlayerLocation(onUpdate: (coords: Coords) => void): () => void {
  // Dev simulation mode: feed updates from the simulation store, skip GPS entirely.
  if (__DEV__ && simulated) {
    onUpdate(simulated);
    const cb = () => {
      if (simulated) onUpdate(simulated);
    };
    simListeners.add(cb);
    return () => simListeners.delete(cb);
  }

  let removed = false;
  let subscription: Location.LocationSubscription | null = null;

  // Also watch the sim store so toggling the dev override on mid-watch switches sources.
  const simSwitch = () => {
    if (__DEV__ && simulated) onUpdate(simulated);
  };
  if (__DEV__) simListeners.add(simSwitch);

  (async () => {
    try {
      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          distanceInterval: 5, // metres between updates — enough for a city-walk hint
          timeInterval: 3000,
        },
        (pos) => {
          if (removed) return;
          // A dev override, if set after the watch started, wins.
          if (__DEV__ && simulated) return;
          onUpdate({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        },
      );
    } catch (e) {
      console.warn('[location] watchPositionAsync failed:', e);
    }
  })();

  return () => {
    removed = true;
    if (__DEV__) simListeners.delete(simSwitch);
    subscription?.remove();
  };
}
