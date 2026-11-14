import {
  exchangeCodeAsync,
  fetchUserInfoAsync,
  makeRedirectUri,
  useAuthRequest,
  useAutoDiscovery,
} from 'expo-auth-session';
import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import {
  clearSession,
  loadSession,
  saveSession,
  type AuthUser,
  type StoredSession,
} from '@/lib/auth-storage';

// Auth0 OIDC sign-in via Authorization Code + PKCE. No client secret, no server — the
// code is exchanged in-app with the PKCE verifier (Auth0 "Native" application type).
//
// This is the one place the app uses a real React Context rather than the module-level
// + useSyncExternalStore store pattern (see use-lang.ts / use-perks.ts): `useAuthRequest`
// is a hook that must live in the React tree and produces a `request`/`promptAsync` pair
// that cannot be created at module scope.

// Dismiss the auth popup window when the browser redirects back. Must run at module top
// level per the expo-auth-session rules.
WebBrowser.maybeCompleteAuthSession();

const auth0 = Constants.expoConfig?.extra?.auth0 as
  | { domain: string; clientId: string }
  | undefined;

type AuthContextValue = {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const domain = auth0?.domain ?? '';
  const clientId = auth0?.clientId ?? '';

  const discovery = useAutoDiscovery(`https://${domain}`);

  // The redirect URI the user must whitelist in the Auth0 dashboard. Scheme comes from
  // app.json (`timisight`); makeRedirectUri picks the platform-correct form.
  const redirectUri = useMemo(() => makeRedirectUri({ scheme: 'timisight' }), []);

  const [request, response, promptAsync] = useAuthRequest(
    {
      clientId,
      redirectUri,
      scopes: ['openid', 'profile', 'email'],
      usePKCE: true,
    },
    discovery,
  );

  // Log the exact redirect URI once in dev so the user can paste it into Auth0's
  // Allowed Callback/Logout URLs (see .agents/tasks/auth0-callback-urls.md).
  const loggedRedirect = useRef(false);
  useEffect(() => {
    if (__DEV__ && !loggedRedirect.current) {
      loggedRedirect.current = true;
      console.log('[auth0] redirectUri', redirectUri);
    }
  }, [redirectUri]);

  // Rehydrate any stored session on launch so a returning user stays signed in without
  // a network round-trip.
  useEffect(() => {
    let active = true;
    (async () => {
      const stored = await loadSession();
      if (active && stored) setUser(stored.user);
      if (active) setIsLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  // When the auth prompt succeeds, exchange the code for tokens (PKCE), fetch the
  // profile, persist both, and set the user. Cancel/error just clears the loading flag.
  useEffect(() => {
    if (!response) return;

    let active = true;
    (async () => {
      // A cancelled/failed prompt, or a success we can't complete (no PKCE verifier /
      // discovery not ready), just clears the in-flight loading flag. Done inside this
      // async callback so it is not a synchronous setState in the effect body.
      if (response.type !== 'success' || !request?.codeVerifier || !discovery) {
        if (active) setIsLoading(false);
        return;
      }
      try {
        const tokenResponse = await exchangeCodeAsync(
          {
            clientId,
            code: response.params.code,
            redirectUri,
            extraParams: { code_verifier: request.codeVerifier as string },
          },
          discovery,
        );

        const profile = await fetchUserInfoAsync(
          { accessToken: tokenResponse.accessToken },
          discovery,
        );

        const session: StoredSession = {
          tokens: {
            accessToken: tokenResponse.accessToken,
            idToken: tokenResponse.idToken,
            refreshToken: tokenResponse.refreshToken,
            expiresIn: tokenResponse.expiresIn,
            issuedAt: tokenResponse.issuedAt,
          },
          user: profile as AuthUser,
        };

        await saveSession(session);
        if (active) setUser(session.user);
      } catch {
        // Exchange or profile fetch failed: leave the user signed out. The button
        // stays available for a retry.
      } finally {
        if (active) setIsLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [response, request, discovery, clientId, redirectUri]);

  const signIn = useCallback(async () => {
    if (!request) return; // Not ready until the PKCE verifier is generated.
    setIsLoading(true);
    const result = await promptAsync();
    // A dismissed/cancelled prompt never reaches the response effect, so clear loading
    // here. A success is handled by the response effect above.
    if (result.type !== 'success') setIsLoading(false);
  }, [request, promptAsync]);

  const signOut = useCallback(async () => {
    await clearSession();
    setUser(null);
    // Also clear the Auth0 session cookie so the next sign-in isn't silently
    // re-authenticated. Browser errors are non-fatal — local state is already cleared.
    try {
      if (discovery?.endSessionEndpoint) {
        const logoutUrl =
          `${discovery.endSessionEndpoint}?client_id=${encodeURIComponent(clientId)}` +
          `&returnTo=${encodeURIComponent(redirectUri)}`;
        await WebBrowser.openAuthSessionAsync(logoutUrl, redirectUri);
      }
    } catch {
      // Ignore: the user is already signed out locally.
    }
  }, [discovery, clientId, redirectUri]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAuthenticated: user !== null,
      signIn,
      signOut,
    }),
    [user, isLoading, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Access the auth context. Throws if used outside an `AuthProvider`. */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
