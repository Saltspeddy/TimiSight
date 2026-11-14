import type { Lang } from '@/constants/site-data';

export type BadgeState = { id: string; emoji: string; title: Record<Lang, string>; value: number; goal: number; earned: boolean };

// ✏️ EDIT HERE: names and goals. Badges are calculated from the player's collection and points.
// `totalFlowers` is the size of the (DB-backed) catalogue, passed in by the caller.
export function evaluateBadges(collected: string[], points: number, totalFlowers: number): BadgeState[] {
  const all = totalFlowers;
  const defs = [
    { id: 'first_bloom', emoji: '🌱', title: { en: 'First Bloom', ro: 'Prima floare' }, value: collected.length, goal: 1 },
    { id: 'green_thumb', emoji: '🌿', title: { en: 'Green Thumb', ro: 'Mână verde' }, value: collected.length, goal: Math.min(3, all) },
    { id: 'full_garden', emoji: '🌸', title: { en: 'Full Garden', ro: 'Grădină completă' }, value: collected.length, goal: all },
    { id: 'rose_whisperer', emoji: '🌹', title: { en: 'Rose Whisperer', ro: 'Prietenul trandafirilor' }, value: collected.includes('violinist-rose') ? 1 : 0, goal: 1 },
    { id: 'point_collector', emoji: '⭐', title: { en: 'Point Collector', ro: 'Colecționar de puncte' }, value: points, goal: 200 },
  ];
  return defs.map((d) => ({ ...d, value: Math.min(d.value, d.goal), earned: d.value >= d.goal }));
}