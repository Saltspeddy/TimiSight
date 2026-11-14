import { createClient } from '@supabase/supabase-js';

import { getFreshAccessToken } from '@/lib/auth-storage';

// Supabase client for the mobile app. Uses the same project as the web app.
//
// Config comes from EXPO_PUBLIC_* env vars (see .env in the project root). The
// EXPO_PUBLIC_ prefix is what makes a value available in the client bundle via
// process.env — without it the value is stripped at build time.
//
// IDENTITY: this client runs in Supabase THIRD-PARTY AUTH mode. There is no
// Supabase GoTrue session (persistSession:false); instead the `accessToken`
// callback supplies the Auth0 access token on every request, which Supabase
// validates against the Auth0 JWKS and from which RLS reads auth.jwt()->>'sub'.
// Because there is no GoTrue session, no AsyncStorage adapter is needed here —
// the Auth0 token already persists in SecureStore via auth-storage.ts. Do NOT
// also call supabase.auth.setSession(): `accessToken` mode is mutually exclusive
// with a managed session.
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
  // Supabase invokes this before every request to get the bearer token. Returns a
  // non-expired Auth0 access token (refreshing on demand), or '' => anonymous
  // request (public reads still work; per-user RLS rejects as `anon`).
  //
  // Guard: only hand Supabase a token that is a well-formed JWS (header.payload.sig,
  // i.e. exactly 3 dot-separated parts). If Auth0 is misconfigured (e.g. the custom
  // API audience is not authorized), it issues an OPAQUE or ENCRYPTED (JWE, 5-part)
  // access token; passing that to Supabase yields "Expected 3 parts in JWT; got 5"
  // and breaks even public reads. Treating a non-JWS token as "no token" keeps the
  // catalogue (flowers/offers) working and surfaces the auth problem only on per-user
  // calls, which is the correct degradation.
  accessToken: async () => {
    const token = await getFreshAccessToken();
    if (!token) return '';
    return token.split('.').length === 3 ? token : '';
  },
});
