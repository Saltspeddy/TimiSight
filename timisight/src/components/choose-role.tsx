import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ScrollViewInstance,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { BORDER, Brand } from '@/constants/brand';
import { RC, ROLE_STYLE, ROLES, type Role } from '@/constants/roles';
import { useAuth } from '@/hooks/auth';
import { useLang } from '@/hooks/use-lang';
import { chooseRole, saveNickname, syncRole, useRole } from '@/hooks/use-role';

// An overlay (not a route, so the router never has to re-route around it) shown right after Auth0 sign-in for anyone the database doesn't have a role for yet:
// "who are you joining as?" Visitor (default), organization or artist. Someone who already
// has a role never sees it and goes straight into the app.
//
// The same screen also covers the moments around that choice: a spinner while the role is
// being looked up, and a clear message (with retry) if the lookup fails, so a problem is
// shown rather than silently dropping you into the visitor app.
//
// Visitors pick a nickname here too (organizations and artists pick a name), because the
// leaderboard and friends list show it instead of the email. A visitor who signed up before
// nicknames existed has a role already, so they only see the nickname box (`nicknameOnly`).
export function ChooseRole() {
  const [lang, t] = useLang();
  const c = RC[lang];
  const insets = useSafeAreaInsets();
  const { signOut } = useAuth();
  const { phase, error, role: knownRole } = useRole();
  const nicknameOnly = phase === 'choose' && knownRole === 'user';

  const [role, setRole] = useState<Role>('user');
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const scroller = useRef<ScrollViewInstance>(null);

  const label: Record<Role, string> = { user: c.roleUser, organization: c.roleOrg, artist: c.roleArtist };
  const hint: Record<Role, string> = { user: c.roleUserHint, organization: c.roleOrgHint, artist: c.roleArtistHint };

  const validName = (): boolean => {
    const n = name.trim();
    // Same rule as the database: visitors 2 to 24 characters without '@' (so not an email);
    // organizations and artists at least 2.
    return role === 'user' ? n.length >= 2 && n.length <= 24 && !n.includes('@') : n.length >= 2;
  };

  const submit = async () => {
    if (!validName()) {
      setNameError(true);
      return;
    }
    setSaving(true);
    setProblem(null);
    const failure = nicknameOnly ? await saveNickname(name) : await chooseRole(role, name);
    // On success the app moves on by itself (this screen stops being reachable).
    if (failure) {
      setProblem(/could not find|schema cache|timed out|network|fetch/i.test(failure) ? c.roleSetupError : c.errGeneric);
      setSaving(false);
    }
  };

  // Looking the role up: nothing to choose yet.
  if (phase === 'idle' || phase === 'loading') {
    return (
      <View style={[s.root, s.center]}>
        <ActivityIndicator color={Brand.ink} size="large" />
        <Text style={s.muted}>{t.authLoading}</Text>
      </View>
    );
  }

  // The lookup failed (offline, or the roles SQL hasn't been run). Say so, don't hide it.
  if (phase === 'error') {
    return (
      <View style={[s.root, s.center, { padding: 24 }]}>
        <Text style={s.title}>{c.roleSetupError}</Text>
        {/* Development builds only: the real reason, e.g. a table that hasn't been created. */}
        {__DEV__ && error ? <Text style={s.devError}>{error}</Text> : null}
        <View style={s.stack}>
          <Button label={c.retry} onPress={() => void syncRole()} />
          <Button label={t.authLogout} onPress={() => void signOut()} variant="ghost" />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={s.root} behavior="padding">
      <ScrollView
        ref={scroller}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[s.content, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
        <View style={s.card}>
          <Text style={s.brand}>{t.appName}</Text>
          <Text style={s.title}>{nicknameOnly ? c.nicknameTitle : c.roleTitle}</Text>
          {nicknameOnly ? <Text style={s.muted}>{c.nicknameText}</Text> : null}

          {nicknameOnly ? null : (
            <View style={s.roles} accessibilityRole="radiogroup">
              {ROLES.map((r) => {
                const selected = r === role;
                const look = ROLE_STYLE[r];
                return (
                  <Pressable
                    key={r}
                    accessibilityRole="radio"
                    accessibilityState={{ selected, disabled: saving }}
                    disabled={saving}
                    onPress={() => {
                      setRole(r);
                      setNameError(false);
                    }}
                    style={[s.roleCard, selected && { backgroundColor: look.bg, borderWidth: BORDER }]}>
                    <View style={s.roleHead}>
                      <Text style={[s.roleLabel, selected && { color: look.fg }]}>{label[r]}</Text>
                      {selected ? <Text style={[s.tick, { color: look.fg }]}>✓</Text> : null}
                    </View>
                    <Text style={[s.roleHint, selected && { color: look.fg }]}>{hint[r]}</Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          <View style={s.nameBox}>
            <TextInput
              value={name}
              onChangeText={(v) => {
                setName(v);
                setNameError(false);
              }}
              // Keep the box in view above the keyboard while typing.
              onFocus={() => setTimeout(() => scroller.current?.scrollToEnd({ animated: true }), 250)}
              placeholder={role === 'user' ? c.nameUser : role === 'organization' ? c.nameOrg : c.nameArtist}
              placeholderTextColor={Brand.inkFaint}
              autoCapitalize="words"
              maxLength={role === 'user' ? 24 : 120}
              editable={!saving}
              style={[s.input, nameError && s.inputError]}
            />
            {nameError ? <Text style={s.error}>{role === 'user' ? c.nicknameRequired : c.nameRequired}</Text> : null}
            {role === 'user' && !nicknameOnly && !nameError ? <Text style={s.note}>{c.nicknameText}</Text> : null}
          </View>

          {problem ? <Text style={s.error}>{problem}</Text> : null}

          <View style={s.stack}>
            <Button
              label={saving ? c.saving : c.roleContinue}
              onPress={() => void submit()}
              loading={saving}
            />
          </View>

          {nicknameOnly ? null : <Text style={s.note}>{c.roleNote}</Text>}

          <Pressable onPress={() => void signOut()} disabled={saving} accessibilityRole="button">
            <Text style={s.logout}>{t.authLogout}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Brand.paper },
  center: { alignItems: 'center', justifyContent: 'center', gap: 14 },
  muted: { fontSize: 16, color: Brand.inkFaint, textAlign: 'center' },
  devError: { fontSize: 13, color: Brand.orange, textAlign: 'center', fontFamily: 'monospace' },
  content: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  card: { width: '100%', maxWidth: 420, alignItems: 'center', gap: 12 },
  brand: { fontSize: 18, fontWeight: '800', color: Brand.blue, letterSpacing: 1, textTransform: 'uppercase' },
  title: { fontSize: 28, fontWeight: '800', color: Brand.ink, letterSpacing: -0.5, textAlign: 'center' },
  roles: { alignSelf: 'stretch', gap: 8 },
  roleCard: {
    borderWidth: 2,
    borderColor: Brand.ink,
    borderRadius: 12,
    backgroundColor: Brand.white,
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 2,
  },
  roleHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  roleLabel: { fontSize: 17, fontWeight: '800', color: Brand.ink },
  tick: { fontSize: 18, fontWeight: '800' },
  roleHint: { fontSize: 14, color: Brand.inkSoft },
  nameBox: { alignSelf: 'stretch', gap: 6 },
  input: {
    borderWidth: 2,
    borderColor: Brand.ink,
    borderRadius: 10,
    backgroundColor: Brand.white,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    color: Brand.ink,
  },
  inputError: { borderColor: Brand.orange },
  error: { alignSelf: 'stretch', fontSize: 14, fontWeight: '800', color: Brand.orange },
  stack: { alignSelf: 'stretch', gap: 12, marginTop: 4 },
  note: { fontSize: 13, color: Brand.inkFaint, textAlign: 'center', fontStyle: 'italic' },
  logout: { fontSize: 15, fontWeight: '800', color: Brand.blue, paddingVertical: 8 },
});
