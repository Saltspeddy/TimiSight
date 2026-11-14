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
