// Pure geo helpers for the location-based quests (hot/cold mini-game + map).
// No React, no side effects — trivially testable and reused by the location seam
// and the Quests screen.

export type Coords = { latitude: number; longitude: number };

const EARTH_RADIUS_M = 6_371_000; // mean Earth radius in metres
const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;

/**
 * Great-circle distance between two points in METRES (haversine).
 * Accurate to well within a metre at city scale, which is all we need.
 */
export function distanceMeters(a: Coords, b: Coords): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Initial bearing FROM `a` TO `b`, in degrees clockwise from north (0 = N, 90 = E).
 * Used to point a direction arrow at the next flower without revealing its position.
 */
export function bearingDegrees(a: Coords, b: Coords): number {
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const dLng = toRad(b.longitude - a.longitude);

  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

// Proximity "temperature" for the hot/cold hint. Buckets are deliberately coarse and
// forgiving so normal outdoor GPS jitter (±5–15 m) does not flip the label every reading.
// `arrived` means the user is effectively at the flower (scan it); for an INDOOR final
// stop the screen maps `arrived`/`hot` to a "head inside and scan" message instead of
// noisy warmer/colder feedback.
export type Temperature = 'arrived' | 'hot' | 'warm' | 'cool' | 'cold' | 'freezing';

// Distance thresholds in metres (upper bound of each band, walking outdoors).
export const TEMPERATURE_THRESHOLDS: { t: Temperature; maxMeters: number }[] = [
  { t: 'arrived', maxMeters: 15 },
  { t: 'hot', maxMeters: 40 },
  { t: 'warm', maxMeters: 90 },
  { t: 'cool', maxMeters: 180 },
  { t: 'cold', maxMeters: 400 },
  { t: 'freezing', maxMeters: Infinity },
];

/** Map a distance (metres) to a coarse temperature band. */
export function temperatureFor(distanceM: number): Temperature {
  for (const band of TEMPERATURE_THRESHOLDS) {
    if (distanceM <= band.maxMeters) return band.t;
  }
  return 'freezing';
}

// Eight-point compass label for a bearing, for an optional textual direction cue.
const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const;
export type Compass = (typeof COMPASS)[number];

export function compassFor(bearing: number): Compass {
  const idx = Math.round(((bearing % 360) / 45)) % 8;
  return COMPASS[idx];
}
