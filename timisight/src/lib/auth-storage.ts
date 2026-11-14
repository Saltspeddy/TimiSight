import { refreshAsync } from 'expo-auth-session';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Persistence seam for the Auth0 session (tokens + the OIDC profile).
//
// Tokens are sensitive, so native platforms use `expo-secure-store` (encrypted
// keychain / SharedPreferences). `expo-secure-store` has no web implementation, so the
// web branch falls back to `window.localStorage`. Both branches are async so callers
// share a single interface regardless of platform.
//
// NOTE: this deliberately does NOT reuse AsyncStorage (used by use-perks.ts) — that
// store is not secure and is fine for points but not for access/id tokens.

const AUTH_STORAGE_KEY = 'timisight.auth.v1';

/** OIDC profile fields we rely on, plus any extra claims the provider returns. */
export type AuthUser = {
  sub: string;
  name?: string;
  email?: string;
  picture?: string;
  [claim: string]: unknown;
};

/** Everything we persist for a signed-in user: tokens + their profile. */
export type StoredSession = {
  tokens: {
    accessToken: string;
    idToken?: string;
    refreshToken?: string;
    expiresIn?: number;
    issuedAt?: number;
  };
  user: AuthUser;
};

const isWeb = Platform.OS === 'web';

async function setItem(value: string): Promise<void> {
  if (isWeb) {
    window.localStorage.setItem(AUTH_STORAGE_KEY, value);
    return;
  }
  await SecureStore.setItemAsync(AUTH_STORAGE_KEY, value);
}

async function getItem(): Promise<string | null> {
  if (isWeb) {
    return window.localStorage.getItem(AUTH_STORAGE_KEY);
  }
  return SecureStore.getItemAsync(AUTH_STORAGE_KEY);
}

async function removeItem(): Promise<void> {
  if (isWeb) {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(AUTH_STORAGE_KEY);
}

/** Persist the signed-in session as JSON. */
export async function saveSession(session: StoredSession): Promise<void> {
  await setItem(JSON.stringify(session));
}

/**
 * Load the persisted session, or `null` if none is stored or the stored value is
 * unreadable. Parse errors are swallowed and treated as "no session" (mirrors the
 * corrupt-storage handling in use-perks.ts).
 */
export async function loadSession(): Promise<StoredSession | null> {
  try {
    const raw = await getItem();
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSession;
    if (!parsed?.tokens?.accessToken || !parsed?.user?.sub) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Remove any persisted session (used on sign-out). */
export async function clearSession(): Promise<void> {
  await removeItem();
}

// ---------------------------------------------------------------------------
// Access-token freshness for the Supabase third-party-auth `accessToken` callback.
//
// Supabase trusts the Auth0 ACCESS token (an RS256 JWT for the Auth0 API audience).
// It expires (Auth0 default ~24h), so DB writes must not silently fail mid-session.
// `getFreshAccessToken` returns a non-expired token, refreshing on demand via the
// refresh token. It lives here (not in auth.tsx) because the supabase.ts module-scope
// callback cannot reach auth.tsx's `discovery` hook; instead we hardcode the Auth0
// token endpoint, which is stable for the tenant.
// ---------------------------------------------------------------------------

const auth0 = Constants.expoConfig?.extra?.auth0 as
  | { domain: string; clientId: string }
  | undefined;

// The Auth0 API Identifier created in the dashboard (see the design's §6.1). Must match
// `extraParams.audience` in auth.tsx and the Supabase Third-Party Auth provider config.
export const SUPABASE_AUTH0_AUDIENCE = 'https://timisight.supabase';

/**
 * Pure near-expiry predicate, extracted so it is unit-testable without a device.
 * `issuedAt` and `expiresIn` are SECONDS (expo-auth-session's TokenResponse units).
 * Returns true when the token is missing timing info, or is within `skewSeconds` of
 * expiry (treat as expired so we refresh pre-emptively).
 */
export function isExpired(
  issuedAt: number | undefined,
  expiresIn: number | undefined,
  skewSeconds: number,
): boolean {
  if (issuedAt == null || expiresIn == null) return true;
  const expiresAtMs = (issuedAt + expiresIn) * 1000;
  return Date.now() >= expiresAtMs - skewSeconds * 1000;
}

// Single-flight guard: if multiple requests ask for a token while a refresh is in
// flight, they all await the same promise rather than racing concurrent refreshes
// (which can invalidate each other under refresh-token rotation).
let refreshInFlight: Promise<string | null> | null = null;

/**
 * Return a non-expired Auth0 access token for Supabase, refreshing it on demand.
 * Returns `null` when there is no session or the refresh fails (e.g. revoked refresh
 * token) — the caller then issues an anonymous request and treats the user as signed out.
 */
export async function getFreshAccessToken(): Promise<string | null> {
  const stored = await loadSession();
  if (!stored) return null;

  const { accessToken, refreshToken, expiresIn, issuedAt } = stored.tokens;

  if (!isExpired(issuedAt, expiresIn, 60)) {
    return accessToken;
  }

  // Expired/near-expiry: refresh (deduped across concurrent callers).
  if (!refreshToken) {
    console.warn('[auth0] access token expired and no refresh token available');
    return null;
  }

  if (refreshInFlight) return refreshInFlight;

  const clientId = auth0?.clientId ?? '';
  const domain = auth0?.domain ?? '';

  refreshInFlight = (async () => {
    try {
      const refreshed = await refreshAsync(
        {
          clientId,
          refreshToken,
          extraParams: { audience: SUPABASE_AUTH0_AUDIENCE },
        },
        { tokenEndpoint: `https://${domain}/oauth/token` },
      );

      const next: StoredSession = {
        user: stored.user,
        tokens: {
          accessToken: refreshed.accessToken,
          // Auth0 may or may not rotate the id/refresh token; preserve the old values
          // when the response omits them so we never lose the id_token_hint for logout.
          idToken: refreshed.idToken ?? stored.tokens.idToken,
          refreshToken: refreshed.refreshToken ?? refreshToken,
          expiresIn: refreshed.expiresIn,
          issuedAt: refreshed.issuedAt,
        },
      };
      await saveSession(next);
      return next.tokens.accessToken;
    } catch {
      // Refresh failed (revoked/expired refresh token, network). Treat as signed out.
      console.warn('[auth0] token refresh failed; treating session as signed out');
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}
