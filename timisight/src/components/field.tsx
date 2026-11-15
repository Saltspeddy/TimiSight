import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { Brand } from '@/constants/brand';

// A labelled text box in the app's style. Used by the commission request form and the
// artist profile editor.
export function Field({
  label,
  hint,
  error,
  multiline,
  style,
  ...input
}: { label: string; hint?: string; error?: string | null } & TextInputProps) {
  return (
    <View style={s.wrap}>
      <Text style={s.label}>{label}</Text>
      {hint ? <Text style={s.hint}>{hint}</Text> : null}
      <TextInput
        {...input}
        multiline={multiline}
        placeholderTextColor={Brand.inkFaint}
        style={[s.input, multiline && s.multi, error ? s.inputError : null, style]}
      />
      {error ? <Text style={s.error}>{error}</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: 6 },
  label: { fontSize: 15, fontWeight: '800', color: Brand.ink },
  hint: { fontSize: 13, color: Brand.inkFaint, fontStyle: 'italic' },
  input: {
    borderWidth: 2,
    borderColor: Brand.ink,
    borderRadius: 10,
    backgroundColor: Brand.white,
    paddingVertical: 11,
    paddingHorizontal: 14,
    fontSize: 16,
    color: Brand.ink,
  },
  multi: { minHeight: 120, textAlignVertical: 'top' },
  inputError: { borderColor: Brand.orange },
  error: { fontSize: 13, fontWeight: '800', color: Brand.orange },
});
