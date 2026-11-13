import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Brand } from '@/constants/brand';
import type { Lang } from '@/constants/site-data';
import { useLang } from '@/hooks/use-lang';

const LANGS: Lang[] = ['en', 'ro'];

export function LangToggle() {
  const [lang, , setLang] = useLang();

  return (
    <View style={styles.wrap}>
      {LANGS.map((l) => {
        const selected = lang === l;
        return (
          <Pressable
            key={l}
            onPress={() => setLang(l)}
            style={[styles.btn, selected && styles.btnSelected]}>
            <Text style={[styles.text, selected && styles.textSelected]}>{l.toUpperCase()}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    borderWidth: 2,
    borderColor: Brand.ink,
    borderRadius: 8,
    overflow: 'hidden',
  },
  btn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: Brand.paper },
  btnSelected: { backgroundColor: Brand.ink },
  text: { fontWeight: '800', color: Brand.ink, fontSize: 13 },
  textSelected: { color: Brand.paper },
});
