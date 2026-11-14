import {
  exchangeCodeAsync,
  makeRedirectUri,
  useAuthRequest,
  useAutoDiscovery,
} from 'expo-auth-session';
import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { resetCollectionForUserChange } from '@/constants/collection';
import {
  clearSession,
  loadSession,
  saveSession,
  SUPABASE_AUTH0_AUDIENCE,
  type AuthUser,
  type StoredSession,
} from '@/lib/auth-storage';

/**
 * Decode the payload of a JWT (no signature verification). Used to read the OIDC
 * profile claims (`sub`, `name`, `email`, `picture`) out of the Auth0 id token, so we
 * do not depend on the /userinfo endpoint — once we request an access token for a
 * custom API audience, that endpoint's behavior is tenant-dependent. The id token
 * came straight from the Auth0 token endpoint over TLS, and Supabase re-verifies the
 * *access* token server-side, so a client-side decode is safe here. Returns null on
 * any malformed input.
 */
function decodeJwtPayload(jwt: string | undefined): Record<string, unknown> | null {
  if (!jwt) return null;
  const parts = jwt.split('.');
  if (parts.length < 2) return null;
  try {
    // base64url -> base64, then decode. atob is available in the RN/Hermes runtime.
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    const json = decodeURIComponent(
      atob(padded)
        .split('')
        .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join(''),
    );
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

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
  // app.json (`timisight`); the explicit `path` ensures a non-empty host/path segment so
  // the URI is `timisight://redirect` rather than a bare `timisight://` — Auth0's
  // callback-URL validator rejects a scheme with an empty authority.
  const redirectUri = useMemo(
    () => makeRedirectUri({ scheme: 'timisight', path: 'redirect' }),
    [],
  );

  const [request, response, promptAsync] = useAuthRequest(
    {
      clientId,
      redirectUri,
      // `offline_access` yields a refresh token so we can keep the Supabase access
      // token fresh (see auth-storage.ts#getFreshAccessToken).
      scopes: ['openid', 'profile', 'email', 'offline_access'],
      usePKCE: true,
      // `audience` makes Auth0 issue a signed RS256 access token for the Supabase
      // API (instead of an opaque /userinfo token), which Supabase Third-Party Auth
      // can validate. Must match the Auth0 API Identifier and the Supabase provider.
      extraParams: { audience: SUPABASE_AUTH0_AUDIENCE },
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
      if (active && stored) {
        setUser(stored.user);
        // Returning signed-in user: hydrate their collection/perks from the server.
        resetCollectionForUserChange();
      }
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

        // Read the profile from the id token's claims rather than /userinfo (see
        // decodeJwtPayload above). `openid profile email` populate sub/name/email/picture.
        const claims = decodeJwtPayload(tokenResponse.idToken) ?? {};
        const profile: AuthUser = {
          sub: String(claims.sub ?? ''),
          name: typeof claims.name === 'string' ? claims.name : undefined,
          email: typeof claims.email === 'string' ? claims.email : undefined,
          picture: typeof claims.picture === 'string' ? claims.picture : undefined,
        };

        // Without a sub we cannot key anything per-user; treat as a failed sign-in.
        if (!profile.sub) {
          if (active) setIsLoading(false);
          return;
        }

        const session: StoredSession = {
          tokens: {
            accessToken: tokenResponse.accessToken,
            idToken: tokenResponse.idToken,
            refreshToken: tokenResponse.refreshToken,
            expiresIn: tokenResponse.expiresIn,
            issuedAt: tokenResponse.issuedAt,
          },
          user: profile,
        };

        await saveSession(session);
        if (active) {
          setUser(session.user);
          // The collection/perks stores are user-scoped: reload them for the new user.
          resetCollectionForUserChange();
        }
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
    // Open the Auth0 end-session flow FIRST, and only clear the local session once it
    // actually completed. The browser returns to `redirectUri` (timisight://redirect),
    // which resolves to the `/redirect` route and bounces back to the account tab, so the
    // "You have successfully logged out" page closes automatically.
    //
    // The discovery `endSessionEndpoint` is the OIDC logout endpoint, so it must be given
    // the OIDC parameters `post_logout_redirect_uri` + `id_token_hint` — NOT the legacy
    // `/v2/logout` parameter `returnTo`. With the wrong (legacy) parameter Auth0 ignores
    // the redirect, parks the user on the "successfully logged out" page, and never fires
    // the `returnTo`, so the browser never auto-closes and the result is `dismiss` rather
    // than `success`. Using the OIDC params makes Auth0 redirect back, which both closes
    // the browser and yields a `success` result. `id_token_hint` (the stored id_token)
    // lets Auth0 honor the redirect without prompting.
    //
    // Local state is cleared ONLY on a `success` result. If the user dismisses the logout
    // page, or discovery/the id_token is unavailable, or the browser throws, the session
    // is left intact — a cancelled logout must NOT log the user out locally.
    if (!discovery?.endSessionEndpoint) return;

    const stored = await loadSession();
    const idTokenHint = stored?.tokens.idToken;

    const params = new URLSearchParams({
      client_id: clientId,
      post_logout_redirect_uri: redirectUri,
    });
    if (idTokenHint) params.set('id_token_hint', idTokenHint);
    const logoutUrl = `${discovery.endSessionEndpoint}?${params.toString()}`;

    try {
      const result = await WebBrowser.openAuthSessionAsync(logoutUrl, redirectUri);
      if (result.type === 'success') {
        await clearSession();
        setUser(null);
        // Clear the previous user's collection/perks so nothing leaks into a later session.
        resetCollectionForUserChange();
      }
    } catch {
      // Browser error: leave the local session intact so the user is not stranded in a
      // half-logged-out state.
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
