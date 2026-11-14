# TimiSight — Web App

The web side of [TimiSight](../README.md): landing and content pages for partner locations in Timișoara, plus the account, login, and business-facing experience. Backed by Supabase.

## Tech stack

- **Next.js 16** (App Router) with **Turbopack**
- **React 19**
- **TypeScript**
- **Tailwind CSS 4**
- **Supabase** — auth and data via `@supabase/supabase-js` and `@supabase/ssr`

## Project structure

```
app/
  page.tsx          # Landing page
  login/ signup/    # Auth pages
  profile/          # Account / profile
  play/             # Play / explorer-style flow
  opera/ unirii/    # Partner location content pages
  auth/ api/        # Auth routes and API handlers
  db-test/          # Supabase connectivity check
lib/
  supabase.ts       # Supabase client
  supabase/         # SSR/server helpers
  site-data.ts      # Content/site data
  shop.ts shop-db.ts# Shop / perks data
public/             # Static assets
supabase/           # Supabase project config
```

## Prerequisites

- [Node.js](https://nodejs.org) (LTS)
- A Supabase project (URL + publishable key)

## Environment

Create `.env.local` in this directory with:

```bash
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-project-url>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<your-supabase-publishable-key>
```

## Getting started

Install dependencies:

```bash
npm install
```

Run the dev server:

```bash
npm run dev
```

Open <http://localhost:3000>.

## Scripts

```bash
npm run dev      # start the dev server (Turbopack)
npm run build    # production build
npm run start    # serve the production build
npm run lint     # lint
```
