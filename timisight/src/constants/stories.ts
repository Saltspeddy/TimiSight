import type { Lang } from '@/constants/site-data';

export type Cue = { t: number } & Record<Lang, string>;

// t = the second of the video where the line starts. It is only used to highlight the current line.
// ✏️ EDIT HERE: replace the placeholder lines with the real subtitles, one per language.
const PLACEHOLDER: Cue[] = [
  {
    t: 0,
    en: '[Line 1 of the video, in English]',
    ro: '[Prima replică din video, în română]',
    de: '[Zeile 1 des Videos, auf Deutsch]',
    hu: '[A videó 1. sora, magyarul]',
    sr: '[Први ред из видеа, на српском]',
  },
  { t: 6, en: '[Line 2]', ro: '[A doua replică]', de: '[Zeile 2]', hu: '[2. sor]', sr: '[Други ред]' },
];

export const STORIES: Record<string, { cues: Cue[] }> = {
  'violinist-rose': { cues: PLACEHOLDER },
  'hop-flower': { cues: PLACEHOLDER },
};
