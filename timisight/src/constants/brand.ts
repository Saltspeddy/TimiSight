// Brand palette and style tokens ported from the uniprep website (app/site.css).
// Neo-brutalist look: cream paper, dark ink, bold accents, thick borders, hard shadows.

export const Brand = {
  ink: '#12142b',
  blue: '#2437e8',
  orange: '#ff6a2b',
  yellow: '#ffd23f',
  paper: '#f6f4ef',
  sepia: '#8a6a43',
  white: '#ffffff',
  // slightly translucent ink for subdued serif text
  inkSoft: 'rgba(18,20,43,0.85)',
  inkFaint: 'rgba(18,20,43,0.6)',
} as const;

// Hard offset shadow like the website's `box-shadow:4px 4px 0 var(--ink)`.
export const hardShadow = (offset = 4) => ({
  shadowColor: Brand.ink,
  shadowOffset: { width: offset, height: offset },
  shadowOpacity: 1,
  shadowRadius: 0,
  elevation: offset, // Android
});

export const BORDER = 3;
