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

// Subtitle lines written so far in English and Romanian only. German, Hungarian and Serbian
// show the English line until someone translates them.
const enRo = (lines: [number, string, string][]): Cue[] =>
  lines.map(([t, en, ro]) => ({ t, en, ro, de: en, hu: en, sr: en }));

export const STORIES: Record<string, { cues: Cue[] }> = {
  'violinist-rose': { cues: PLACEHOLDER },
  'hop-flower': { cues: PLACEHOLDER },
  'casa-muhle': {
    cues: enRo([
      [0, 'Casa Mühle taught Timișoara to grow roses.', 'Casa Mühle a învățat Timișoara să cultive trandafiri.'],
      [6, 'Every flower path begins here.', 'Fiecare traseu floral începe aici.'],
    ]),
  },
  'opera-rose': {
    cues: enRo([
      [0, 'A rose for the Opera House in Victory Square.', 'Un trandafir pentru Operă, în Piața Victoriei.'],
      [6, 'It carries the music of the stage.', 'Poartă cu el muzica scenei.'],
    ]),
  },
  'miklosi-tulip': {
    cues: enRo([
      [0, 'A tulip for Carol Miklósi, the tram pioneer.', 'O lalea pentru Carol Miklósi, pionierul tramvaielor.'],
      [6, 'His trams still shape the city.', 'Tramvaiele lui încă modelează orașul.'],
    ]),
  },
  'timisoreana-malt': {
    cues: enRo([
      [0, 'Barley malt from the Timișoreana brewery.', 'Malț de orz de la fabrica Timișoreana.'],
      [6, 'The oldest brewing tradition in Romania.', 'Cea mai veche tradiție a berii din România.'],
    ]),
  },
};
