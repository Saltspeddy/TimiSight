import { useEffect, useRef, useState } from 'react';

import {
  bearingDegrees,
  compassFor,
  distanceMeters,
  temperatureFor,
  type Compass,
  type Coords,
  type Temperature,
} from '@/lib/geo';
import {
  requestLocationPermission,
  watchPlayerLocation,
  type PermissionStatus,
} from '@/lib/location';

export type Proximity = {
  permission: PermissionStatus;
  /** True once we have at least one position fix. */
  hasFix: boolean;
  distanceMeters: number | null;
  temperature: Temperature | null;
  bearing: number | null; // degrees clockwise from north toward the target
  compass: Compass | null;
  /** Did the last reading move the user closer than the one before? (for "warmer/colder"). */
  trend: 'warmer' | 'colder' | null;
};

const EMPTY: Proximity = {
  permission: 'undetermined',
  hasFix: false,
  distanceMeters: null,
  temperature: null,
  bearing: null,
  compass: null,
  trend: null,
};

/**
 * Live proximity to a single target coordinate, via the location seam (so the dev
 * simulation override drives it too). Pass `null` as the target to disable (e.g. when the
 * next stop has no coordinates or the path is complete) — the watch is then not started.
 *
 * Returns distance, a coarse temperature band, a bearing/compass toward the target, and a
 * warmer/colder trend. Smoothing: the band comes straight from distance (already coarse);
 * the trend compares against the previous distance with a small dead-zone so GPS jitter
 * does not flicker warmer/colder on every tick.
 */
export function useProximity(target: Coords | null): Proximity {
  const [state, setState] = useState<Proximity>(EMPTY);
  const prevDistance = useRef<number | null>(null);

  // Stable key so the effect only restarts when the target actually changes.
  const targetKey = target ? `${target.latitude},${target.longitude}` : null;

  useEffect(() => {
    if (!target) {
      // No target: nothing to watch. We return EMPTY from the hook body below without
      // calling setState here (synchronous setState in an effect is discouraged); just
      // reset the trend baseline for the next real target.
      prevDistance.current = null;
      return;
    }

    let cancelled = false;
    let unwatch: (() => void) | null = null;

    (async () => {
      const permission = await requestLocationPermission();
      if (cancelled) return;
      if (permission !== 'granted') {
        setState({ ...EMPTY, permission });
        return;
      }
      setState((s) => ({ ...s, permission }));

      unwatch = watchPlayerLocation((coords) => {
        if (cancelled) return;
        const dist = distanceMeters(coords, target);
        const bearing = bearingDegrees(coords, target);

        // Trend with a 3 m dead-zone to absorb jitter.
        let trend: Proximity['trend'] = null;
        const prev = prevDistance.current;
        if (prev != null) {
          if (dist < prev - 3) trend = 'warmer';
          else if (dist > prev + 3) trend = 'colder';
          else trend = null;
        }
        prevDistance.current = dist;

        setState({
          permission: 'granted',
          hasFix: true,
          distanceMeters: dist,
          temperature: temperatureFor(dist),
          bearing,
          compass: compassFor(bearing),
          trend,
        });
      });
    })();

    return () => {
      cancelled = true;
      unwatch?.();
    };
    // targetKey captures a meaningful target change; `target` itself is a fresh object each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetKey]);

  // When there is no target, report EMPTY directly (the effect above has torn down the
  // watch and left `state` stale). This keeps the hook pure for the disabled case without a
  // synchronous setState inside the effect.
  return target ? state : EMPTY;
}
