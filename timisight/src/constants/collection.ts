import type { Flower } from './flowers';

export type CheckInResult = { already: boolean; earned: number; total: number };

// DEMO STATE: lives in memory and resets when the app reloads.
// TODO: replace with the real backend (verify the scan, add points on the server, read the totals).
const collected = new Set<string>(['hop-flower']);
let total = 120;

export const collectedIds = () => Array.from(collected);

export function checkIn(flower: Flower): CheckInResult {
  if (collected.has(flower.id)) return { already: true, earned: 0, total };
  collected.add(flower.id);
  total += flower.points;
  return { already: false, earned: flower.points, total };
}

export const totalPoints = () => total;