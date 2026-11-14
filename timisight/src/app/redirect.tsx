import { Redirect } from 'expo-router';

// Auth0 returns to `timisight://redirect?...` after login, logout (`returnTo`), and the
// authorize-app accept/decline screens. The code exchange / logout are finalized by the
// `expo-auth-session` Linking listener inside `@/hooks/auth` — this screen exists only so
// Expo Router's parallel navigation to `/redirect` resolves to a real route instead of
// rendering "Unmatched Route". It shows nothing and immediately bounces back to the
// account tab, so the in-app browser / custom tab closes and the user never sees a 404.
export default function AuthRedirect() {
  return <Redirect href="/(tabs)/account" />;
}
