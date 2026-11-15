import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text } from 'react-native';

import { BORDER, Brand, hardShadow } from '@/constants/brand';
import { LANGUAGES } from '@/constants/site-data';
import { useLang } from '@/hooks/use-lang';

// Language selector. A button shows the current language by its own name; tapping it opens
// a list of every supported language, also by its own name, so each community can find
// theirs without knowing another language first. Replaces the old two-button EN/RO toggle,
// which could not grow past two languages.
export function LanguagePicker() {
  const [lang, t, setLang] = useLang();
  const [open, setOpen] = useState(false);
  const current = LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES[0];

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${t.accountLanguage}: ${current.label}`}
        style={({ pressed }) => [s.button, pressed && s.pressed]}>
        <Text style={s.buttonText}>{current.label}</Text>
        <Text style={s.caret}>▾</Text>
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setOpen(false)}>
        {/* Tapping the dimmed area closes the list; the card swallows its own taps. */}
        <Pressable style={s.backdrop} onPress={() => setOpen(false)} accessibilityLabel={t.back}>
          <Pressable style={s.card} onPress={() => {}} accessibilityViewIsModal>
            <Text style={s.title}>{t.accountLanguage}</Text>
            {LANGUAGES.map((l) => {
              const selected = l.code === lang;
              return (
                <Pressable
                  key={l.code}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  onPress={() => {
                    setLang(l.code);
                    setOpen(false);
                  }}
                  style={({ pressed }) => [s.option, selected && s.optionOn, pressed && s.optionPressed]}>
                  <Text style={[s.optionText, selected && s.optionTextOn]}>{l.label}</Text>
                  {selected ? <Text style={s.check}>✓</Text> : null}
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 2,
    borderColor: Brand.ink,
    borderRadius: 8,
    backgroundColor: Brand.paper,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  pressed: { backgroundColor: Brand.yellow },
  buttonText: { fontWeight: '800', color: Brand.ink, fontSize: 14 },
  caret: { color: Brand.ink, fontSize: 13 },

  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(18,20,43,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#fff',
    borderWidth: BORDER,
    borderColor: Brand.ink,
    borderRadius: 16,
    padding: 16,
    gap: 8,
    ...hardShadow(5),
  },
  title: { fontSize: 18, fontWeight: '800', color: Brand.ink, marginBottom: 4 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: Brand.ink,
    borderRadius: 10,
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  optionOn: { backgroundColor: Brand.yellow },
  optionPressed: { opacity: 0.7 },
  optionText: { fontSize: 17, fontWeight: '800', color: Brand.ink },
  optionTextOn: { color: Brand.ink },
  check: { fontSize: 18, fontWeight: '800', color: Brand.ink },
});
