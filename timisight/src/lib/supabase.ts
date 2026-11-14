import { createClient } from '@supabase/supabase-js';

// Supabase client for the mobile app. Uses the same project as the web app.
//
// Config comes from EXPO_PUBLIC_* env vars (see .env in the project root). The
// EXPO_PUBLIC_ prefix is what makes a value available in the client bundle via
// process.env — without it the value is stripped at build time.
//
// NOTE: we intentionally do NOT configure AsyncStorage here. The app currently
// only READS public catalogue data (flowers), with no auth/session to persist.
// AsyncStorage is a native module; requiring it at import time would crash the
// app ("[runtime not ready]: Cannot read property 'EventEmitter' of undefined")
// on any binary built before it was added — i.e. until a native rebuild.
// When auth is added, install a dev build and re-enable session persistence:
//   import AsyncStorage from '@react-native-async-storage/async-storage';
//   auth: { storage: AsyncStorage, persistSession: true, autoRefreshToken: true }
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  // Fail loudly in development rather than silently returning no data.
  console.warn(
    '[supabase] Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY. ' +
      'Add them to timisight/.env and restart the dev server.'
  );
}

export const supabase = createClient(url ?? '', key ?? '', {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    // React Native has no URL bar; disable the web-only session detection.
    detectSessionInUrl: false,
  },
});
