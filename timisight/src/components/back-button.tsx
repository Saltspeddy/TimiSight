import { router } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';

import { Brand } from '@/constants/brand';
import { useLang } from '@/hooks/use-lang';

// "← Back" pill used at the top of the screens that are not tabs.
export function BackButton() {
  const [, t] = useLang();
  return (
    <Pressable
      onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      accessibilityRole="button"
      style={s.btn}>
      <Text style={s.text}>← {t.back}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  btn: {
    alignSelf: 'flex-start',
    borderWidth: 2,
    borderColor: Brand.ink,
    borderRadius: 99,
    backgroundColor: Brand.white,
    paddingVertical: 5,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  text: { color: Brand.blue, fontWeight: '800' },
});
