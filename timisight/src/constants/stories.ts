export type Cue = { t: number; en: string; ro: string };

// t = the second of the video where the line starts. It is only used to highlight the current line.
// ✏️ EDIT HERE: replace the placeholder lines with the real subtitles.
export const STORIES: Record<string, { cues: Cue[] }> = {
  'violinist-rose': {
    cues: [
      { t: 0, en: '[Line 1 of the video, in English]', ro: '[Prima replică din video, în română]' },
      { t: 6, en: '[Line 2]', ro: '[A doua replică]' },
    ],
  },
  'hop-flower': {
    cues: [
      { t: 0, en: '[Line 1 of the video, in English]', ro: '[Prima replică din video, în română]' },
      { t: 6, en: '[Line 2]', ro: '[A doua replică]' },
    ],
  },
};