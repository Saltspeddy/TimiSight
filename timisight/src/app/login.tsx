import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BORDER, Brand, hardShadow } from '@/constants/brand';
import { useAuth } from '@/hooks/auth';
import { useLang } from '@/hooks/use-lang';

// Dedicated, standalone login screen (NOT a tab). It is the only route reachable while
// logged out — the `!isAuthenticated` guard in the root layout keeps it shown until a
// session exists. `signIn()` opens the Auth0 flow; the guard swap (not any navigation
// here) moves the user to the tabs once the session is set, so no router.replace is used.
export default function LoginScreen() {
  const [, t] = useLang();
  const insets = useSafeAreaInsets();
  const { signIn, isLoading } = useAuth();

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.card}>
        <Text style={styles.brand}>{t.appName}</Text>
        <Text style={styles.title}>{t.loginTitle}</Text>
        <Text style={styles.text}>{t.loginText}</Text>

        <Pressable
          style={[styles.authBtn, isLoading && styles.authBtnDisabled]}
          disabled={isLoading}
          onPress={() => void signIn()}>
          {isLoading ? (
            <View style={styles.btnRow}>
              <ActivityIndicator color="#fff" />
              <Text style={styles.authBtnText}>{t.authSigningIn}</Text>
            </View>
          ) : (
            <Text style={styles.authBtnText}>{t.authLogin}</Text>
          )}
        </Pressable>

        <Text style={styles.hint}>{t.authSignedOutHint}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Brand.paper,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: { width: '100%', maxWidth: 420, alignItems: 'center', gap: 12 },
  brand: { fontSize: 18, fontWeight: '800', color: Brand.blue, letterSpacing: 1, textTransform: 'uppercase' },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: Brand.ink,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  text: {
    fontSize: 16,
    color: Brand.inkFaint,
    textAlign: 'center',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  authBtn: {
    alignSelf: 'stretch',
    alignItems: 'center',
    backgroundColor: Brand.blue,
    borderWidth: BORDER,
    borderColor: Brand.ink,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 18,
    ...hardShadow(4),
  },
  authBtnDisabled: { opacity: 0.7 },
  btnRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  authBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  hint: { fontSize: 15, color: Brand.inkSoft, textAlign: 'center', marginTop: 4 },
});
