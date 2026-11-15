import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { BORDER, Brand, hardShadow } from '@/constants/brand';

// The app's chunky button: primary (blue), ghost (yellow) and danger (white with an
// orange outline, for decline / cancel).
export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost' | 'danger';
  disabled?: boolean;
  loading?: boolean;
}) {
  const off = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: off, busy: loading }}
      disabled={off}
      onPress={onPress}
      style={({ pressed }) => [
        s.base,
        variant === 'primary' && s.primary,
        variant === 'ghost' && s.ghost,
        variant === 'danger' && s.danger,
        off && s.off,
        pressed && !off && s.pressed,
      ]}>
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#fff' : Brand.ink} />
      ) : (
        <Text style={[s.text, variant === 'primary' && s.textOnBlue, variant === 'danger' && s.textDanger]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const s = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderWidth: BORDER,
    borderColor: Brand.ink,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 18,
    ...hardShadow(4),
  },
  primary: { backgroundColor: Brand.blue },
  ghost: { backgroundColor: Brand.yellow },
  danger: { backgroundColor: Brand.white },
  off: { opacity: 0.55 },
  pressed: { transform: [{ translateX: 2 }, { translateY: 2 }], ...hardShadow(2) },
  text: { fontSize: 16, fontWeight: '800', color: Brand.ink, textAlign: 'center' },
  textOnBlue: { color: '#fff' },
  textDanger: { color: Brand.orange },
});
