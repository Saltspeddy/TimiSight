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
      [0, 'This is Casa Mühle, the historic house of the Mühle family of florists.', 'Aceasta este Casa Mühle, casa istorică a familiei de florari Mühle.'],
      [6, 'Horticulturist Wilhelm Mühle settled here in the 1870s and turned his gardens into famous rose nurseries.', 'Horticultorul Wilhelm Mühle s-a stabilit aici în anii 1870 și și-a transformat grădinile în faimoase pepiniere de trandafiri.'],
      [13, 'He bred his own rose varieties and earned fame across the Austro-Hungarian Empire.', 'A creat propriile soiuri de trandafiri și a devenit faimos în tot Imperiul Austro-Ungar.'],
      [20, 'His family helped design the Roses Park and gave Timișoara its name: the City of Roses.', 'Familia sa a ajutat la amenajarea Parcului Rozelor și a dat Timișoarei numele de Orașul Trandafirilor.'],
      [27, 'Every flower route in the city begins from here.', 'Fiecare traseu floral al orașului începe de aici.'],
    ]),
  },
  'opera-rose': {
    cues: enRo([
      [0, 'In front of you stands the Opera House in Victory Square, the heart of Timișoara.', 'În fața ta se află clădirea Operei din Piața Victoriei, inima Timișoarei.'],
      [6, 'The building was raised between 1871 and 1875 by the Viennese architects Fellner and Helmer.', 'Clădirea a fost ridicată între 1871 și 1875 de arhitecții vienezi Fellner și Helmer.'],
      [13, 'Under one roof it holds the Romanian Opera and three national theatres.', 'Sub același acoperiș găzduiește Opera Română și trei teatre naționale.'],
      [20, 'From its balcony in December 1989, Timișoara was declared the first city free of communism.', 'De la balconul ei, în decembrie 1989, Timișoara a fost declarată primul oraș liber de comunism.'],
      [27, 'This rose carries the music and history of that stage.', 'Acest trandafir poartă muzica și istoria acelei scene.'],
    ]),
  },
  'miklosi-tulip': {
    cues: enRo([
      [0, 'This tulip honours the Miklósi tram museum and the city’s transport pioneers.', 'Această lalea cinstește muzeul tramvaielor Miklósi și pionierii transportului din oraș.'],
      [6, 'Timișoara’s first horse-drawn tram set off on 8 July 1869.', 'Primul tramvai cu cai din Timișoara a pornit la 8 iulie 1869.'],
      [13, 'It was the third such line in the world, after New York and Paris.', 'A fost a treia linie de acest fel din lume, după New York și Paris.'],
      [20, 'The horse trams were electrified in 1899 and still shape the city today.', 'Tramvaiele cu cai au fost electrificate în 1899 și modelează orașul și astăzi.'],
      [27, 'The museum keeps that story and its old carriages alive.', 'Muzeul păstrează vie această poveste și vechile sale vagoane.'],
    ]),
  },
  'timisoreana-malt': {
    cues: enRo([
      [0, 'This flower is made of barley malt from the Timișoreana brewery.', 'Această floare este făcută din malț de orz de la fabrica Timișoreana.'],
      [6, 'Founded in 1718 in the Fabric district, it is the oldest brewery in Romania.', 'Fondată în 1718 în cartierul Fabric, este cea mai veche fabrică de bere din România.'],
      [13, 'It was built soon after the Habsburgs took the city from the Ottomans.', 'A fost construită la scurt timp după ce habsburgii au luat orașul de la otomani.'],
      [20, 'Barley malt, roasted and mashed, gives the beer its colour and flavour.', 'Malțul de orz, prăjit și plămădit, dă berii culoarea și aroma.'],
      [27, 'Nearly three hundred years later, that brewing tradition still lives on.', 'Aproape trei sute de ani mai târziu, această tradiție a berii este încă vie.'],
    ]),
  },
};
