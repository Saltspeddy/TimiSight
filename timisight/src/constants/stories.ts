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
  'casa-muhle': {
    cues: [
      { t: 0, en: 'Casa Mühle taught Timișoara to grow roses.', ro: 'Casa Mühle a învățat Timișoara să cultive trandafiri.' },
      { t: 6, en: 'Every flower path begins here.', ro: 'Fiecare traseu floral începe aici.' },
    ],
  },
  'opera-rose': {
    cues: [
      { t: 0, en: 'A rose for the Opera House in Victory Square.', ro: 'Un trandafir pentru Operă, în Piața Victoriei.' },
      { t: 6, en: 'It carries the music of the stage.', ro: 'Poartă cu el muzica scenei.' },
    ],
  },
  'miklosi-tulip': {
    cues: [
      { t: 0, en: 'A tulip for Carol Miklósi, the tram pioneer.', ro: 'O lalea pentru Carol Miklósi, pionierul tramvaielor.' },
      { t: 6, en: 'His trams still shape the city.', ro: 'Tramvaiele lui încă modelează orașul.' },
    ],
  },
  'timisoreana-malt': {
    cues: [
      { t: 0, en: 'Barley malt from the Timișoreana brewery.', ro: 'Malț de orz de la fabrica Timișoreana.' },
      { t: 6, en: 'The oldest brewing tradition in Romania.', ro: 'Cea mai veche tradiție a berii din România.' },
    ],
  },
};