import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LangToggle } from '@/components/lang-toggle';
import { BORDER, Brand, hardShadow } from '@/constants/brand';
import { TEAM } from '@/constants/site-data';
import { useLang } from '@/hooks/use-lang';

export default function HomeScreen() {
  const [, t] = useLang();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.root}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}>
        {/* Sticky-style header */}
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <Text style={styles.logo}>{t.appName}</Text>
          <LangToggle />
        </View>

        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.h1}>{t.heroTitle}</Text>
          <Text style={styles.lead}>{t.heroText}</Text>

          {/* Stamp */}
          <View style={styles.stampWrap}>
            <View style={styles.stamp}>
              <Text style={styles.stampCity}>Timișoara</Text>
              <Text style={styles.stampYear}>1989</Text>
              <Text style={styles.stampCity}>2026</Text>
            </View>
          </View>

          <View style={styles.ctaRow}>
            <Pressable
              onPress={() => router.navigate('/places')}
              style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}>
              <Text style={styles.btnText}>{t.cta}</Text>
            </Pressable>

            <Pressable
              onPress={() => router.push('/ar')}
              style={({ pressed }) => [styles.btn, styles.btnAlt, pressed && styles.btnPressed]}>
              <Text style={styles.btnText}>Open AR</Text>
            </Pressable>
          </View>
        </View>

        {/* How it works */}
        <View style={styles.sec}>
          <Text style={styles.h2}>{t.howTitle}</Text>
          <View style={styles.steps}>
            {t.how.map(([title, desc], i) => (
              <View key={title} style={[styles.step, i === 1 && styles.stepYellow]}>
                <Text style={styles.stepH}>{title}</Text>
                <Text style={styles.stepP}>{desc}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Team */}
        <View style={styles.sec}>
          <Text style={styles.h2}>{t.teamTitle}</Text>
          <Text style={styles.sub}>{t.teamText}</Text>
          <View style={styles.team}>
            {TEAM.map((m, i) => (
              <View key={m.name} style={styles.member}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{m.name[0]}</Text>
                </View>
                <Text style={styles.memberName}>{m.name}</Text>
                <Text style={styles.memberRole}>{t.roles[i]}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>{t.footer}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Brand.paper },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingBottom: 12,
    backgroundColor: Brand.paper,
    borderBottomWidth: BORDER,
    borderBottomColor: Brand.ink,
  },
  logo: { fontSize: 22, fontWeight: '800', color: Brand.blue },

  hero: { paddingHorizontal: 20, paddingTop: 28, paddingBottom: 12 },
  h1: { fontSize: 40, lineHeight: 42, fontWeight: '800', color: Brand.ink, letterSpacing: -0.5 },
  lead: { fontSize: 18, lineHeight: 26, color: Brand.inkSoft, marginTop: 16 },

  stampWrap: { alignItems: 'center', marginVertical: 28 },
  stamp: {
    width: 190,
    height: 190,
    borderRadius: 95,
    borderWidth: 6,
    borderColor: Brand.orange,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-12deg' }],
  },
  stampCity: { color: Brand.orange, fontWeight: '800', fontSize: 16 },
  stampYear: { color: Brand.orange, fontWeight: '800', fontSize: 56, lineHeight: 60 },

  btn: {
    alignSelf: 'flex-start',
    backgroundColor: Brand.blue,
    borderWidth: BORDER,
    borderColor: Brand.ink,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    ...hardShadow(4),
  },
  btnPressed: { transform: [{ translateX: 2 }, { translateY: 2 }], ...hardShadow(2) },
  btnAlt: { backgroundColor: Brand.orange },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  ctaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'center' },

  sec: { paddingHorizontal: 20, paddingVertical: 28 },
  h2: { fontSize: 28, lineHeight: 30, fontWeight: '800', color: Brand.ink, letterSpacing: -0.5, marginBottom: 6 },
  sub: { fontSize: 16, color: Brand.inkFaint, marginBottom: 16, fontStyle: 'italic' },

  steps: { gap: 14, marginTop: 10 },
  step: {
    borderWidth: BORDER,
    borderColor: Brand.ink,
    borderRadius: 14,
    backgroundColor: '#fff',
    padding: 16,
  },
  stepYellow: { backgroundColor: Brand.yellow },
  stepH: { fontSize: 18, fontWeight: '800', color: Brand.ink, marginBottom: 4 },
  stepP: { fontSize: 15, lineHeight: 21, color: Brand.inkSoft },

  team: { flexDirection: 'row', flexWrap: 'wrap', gap: 20, marginTop: 10 },
  member: { width: '42%', gap: 2 },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Brand.blue,
    borderWidth: BORDER,
    borderColor: Brand.ink,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  avatarText: { color: '#fff', fontSize: 30, fontWeight: '800' },
  memberName: { fontSize: 15, fontWeight: '800', color: Brand.ink },
  memberRole: { fontSize: 14, color: Brand.inkFaint, fontStyle: 'italic' },

  footer: {
    borderTopWidth: BORDER,
    borderTopColor: Brand.ink,
    padding: 24,
    marginTop: 12,
  },
  footerText: { textAlign: 'center', color: Brand.inkSoft, fontStyle: 'italic' },
});
