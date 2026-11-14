import { Image } from 'expo-image';
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
        {/* Full-width banner header with the language toggle overlaid */}
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <Image
            style={styles.banner}
            source={require('@/assets/images/timisight-banner.png')}
            contentFit="contain"
            accessibilityLabel={t.appName}
          />
          <View style={[styles.langOverlay, { top: insets.top + 8 }]}>
            <LangToggle />
          </View>
        </View>

        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.h1}>{t.heroTitle}</Text>
          <Text style={styles.lead}>{t.heroText}</Text>

          {/* Stamp */}
          <View style={styles.stampWrap}>
            <View style={styles.stamp}>
              <Text style={styles.stampCity}>{t.stamp[0]}</Text>
              <Text style={styles.stampYear} numberOfLines={1} adjustsFontSizeToFit>
                {t.stamp[1]}
              </Text>
              <Text style={styles.stampCity}>{t.stamp[2]}</Text>
            </View>
          </View>

          <View style={styles.ctaRow}>
            <Pressable
              onPress={() => router.navigate('/places')}
              style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}>
              <Text style={styles.btnText}>{t.cta}</Text>
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
            {TEAM.map((m) => (
              <View key={m.name} style={styles.member}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{m.name[0]}</Text>
                </View>
                <Text style={styles.memberName}>{m.name}</Text>
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
    backgroundColor: Brand.paper,
    borderBottomWidth: BORDER,
    borderBottomColor: Brand.ink,
  },
  banner: {
    width: '100%',
    aspectRatio: 1084 / 310,
  },
  langOverlay: { position: 'absolute', right: 14 },

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
  stampYear: { color: Brand.orange, fontWeight: '800', fontSize: 44, lineHeight: 50, maxWidth: 140, textAlign: 'center' },

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

  footer: {
    borderTopWidth: BORDER,
    borderTopColor: Brand.ink,
    padding: 24,
    marginTop: 12,
  },
  footerText: { textAlign: 'center', color: Brand.inkSoft, fontStyle: 'italic' },
});
