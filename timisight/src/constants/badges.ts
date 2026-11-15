import type { Lang } from '@/constants/site-data';

export type BadgeState = { id: string; emoji: string; title: Record<Lang, string>; value: number; goal: number; earned: boolean };

// ✏️ EDIT HERE: names and goals. Badges are calculated from the player's collection and points.
// `totalFlowers` is the size of the (DB-backed) catalogue, passed in by the caller.
export function evaluateBadges(
  collected: string[],
  points: number,
  totalFlowers: number,
  completedPathCount = 0,
): BadgeState[] {
  const all = totalFlowers;
  const defs = [
    {
      id: 'first_bloom', emoji: '🌱', value: collected.length, goal: 1,
      title: { en: 'First Bloom', ro: 'Prima floare', de: 'Erste Blüte', hu: 'Első virág', sr: 'Први цвет' },
    },
    {
      id: 'green_thumb', emoji: '🌿', value: collected.length, goal: Math.min(3, all),
      title: { en: 'Green Thumb', ro: 'Mână verde', de: 'Grüner Daumen', hu: 'Zöld hüvelykujj', sr: 'Зелени палац' },
    },
    {
      id: 'full_garden', emoji: '🌸', value: collected.length, goal: all,
      title: { en: 'Full Garden', ro: 'Grădină completă', de: 'Voller Garten', hu: 'Teljes kert', sr: 'Пун врт' },
    },
    {
      id: 'rose_whisperer', emoji: '🌹', value: collected.includes('violinist-rose') ? 1 : 0, goal: 1,
      title: { en: 'Rose Whisperer', ro: 'Prietenul trandafirilor', de: 'Rosenflüsterer', hu: 'Rózsasuttogó', sr: 'Шаптач ружа' },
    },
    {
      id: 'point_collector', emoji: '⭐', value: points, goal: 200,
      title: { en: 'Point Collector', ro: 'Colecționar de puncte', de: 'Punktesammler', hu: 'Pontgyűjtő', sr: 'Сакупљач поена' },
    },
    // Client-derived from flower-path completion state (badge id matches flower_paths.badge
    // = 'first_path' seeded in web/supabase/quests.sql).
    {
      id: 'first_path', emoji: '🗺', value: completedPathCount, goal: 1,
      title: { en: 'Pathfinder', ro: 'Cercetaș', de: 'Pfadfinder', hu: 'Útkereső', sr: 'Трагач' },
    },
  ];
  return defs.map((d) => ({ ...d, value: Math.min(d.value, d.goal), earned: d.value >= d.goal }));
}
