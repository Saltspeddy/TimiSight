# TimiSight

**Discover Timișoara, one flower at a time.**

TimiSight turns Timișoara — *the City of Flowers* — into a living, collectible map. Physical flowers (3D-printed now, sculptures and installations later) are placed around the city, each carrying an NFC tag. Scan a flower with your phone to "pick it up" and add it to your collection, the way you'd catch a Pokémon.

Every flower stands for a place, event, or business in the city. Scan the flower outside the Opera House and you unlock an animated, educational popup about the opera's history. Scan one at a café, a museum, or a festival stall and you learn its story the same way. The city becomes something you explore and collect, not just walk past.

## The idea

- **Collect the city.** Each flower is a real, physical object with an NFC tag. Tapping it captures that flower to your account.
- **Learn as you go.** Capturing a flower opens an animated educational popup about the landmark, event, or business it represents — short, playful, and local.
- **Flowers mean something.** A flower is a symbol for a specific place or partner: the Opera House, a historic square, a local business, a seasonal event.
- **Earn points and perks.** Every scan earns points. Points convert into perks — discounts, free products, and offers from partner businesses.

## Who it's for

**Explorers (users).** Walk the city, scan flowers, build a collection, learn the stories behind the places, and spend points on real-world perks. Children get connected with the Timișoara's history. Parents explore with them. Young adults interact with the community.

**Businesses.** Adopt a flower through a dedicated business experience. A business chooses how its flower looks and what it represents, and manages the perks attached to it. The business flow is a distinct UX from the explorer app.

**Artists.** Artists design the flowers. The platform connects an artist with a business that wants a flower adopted and brought to life.

## How a scan works

1. A user finds a physical flower in the city and taps it with their phone (NFC).
2. The app recognizes the flower and captures it to the user's collection.
3. An animated educational popup tells the story of the place, event, or business the flower represents.
4. The user earns points, which can later be redeemed for partner perks.

## Repository layout

This is a monorepo with two applications plus a shared backend:

| Path         | What it is                                                                 |
| ------------ | -------------------------------------------------------------------------- |
| `timisight/` | The mobile app (Expo / React Native) — the explorer experience: scanning, collection, leaderboard, shop, account. |
| `web/`       | The web app (Next.js) — landing/content pages and the business & account experience. |

Each app has its own README with its tech stack and run instructions:

- Mobile app → [`timisight/README.md`](./timisight/README.md)
- Web app → [`web/README.md`](./web/README.md)

## Technical summary

**Mobile app (`timisight/`)**
- Expo SDK 58 / React Native 0.88, React 19, TypeScript.
- Expo Router for file-based navigation (tabbed explorer UI: home, places, leaderboard, shop, account).
- Authentication via `expo-auth-session` with secure token storage (`expo-secure-store`).
- Reanimated + Gesture Handler for the animated flower/educational popups.
- NFC scanning is the core physical interaction (planned/in-progress).

**Web app (`web/`)**
- Next.js 16 (App Router) with React 19 and Turbopack.
- Tailwind CSS 4 for styling.
- Supabase (`@supabase/supabase-js`, `@supabase/ssr`) for auth and data.
- Content/landing pages for partner locations (e.g. the Opera House, Piața Unirii) and account/profile flows.

**Platform concept**
- Physical flowers carry NFC tags that map to a place/business/event record.
- A points-and-perks system rewards scans and ties users back to partner businesses.
- Three roles — explorer, business, artist — each with a tailored experience.

> This is a UniHack 2026 project and a work in progress; some capabilities described above (NFC capture, perks redemption, business/artist flows) are partially implemented or planned.
