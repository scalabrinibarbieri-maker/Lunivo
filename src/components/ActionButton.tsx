import { Pressable, StyleSheet, Text } from 'react-native';
import type { ViewStyle } from 'react-native';
import { colors } from '../constants/theme';
export function ActionButton({ title, onPress, disabled = false, secondary = false, style }: {
  title: string; onPress: () => void; disabled?: boolean; secondary?: boolean; style?: ViewStyle;
}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ disabled }}
    disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.button, secondary ? styles.secondary : styles.primary,
      disabled && styles.disabled, pressed && !disabled && { opacity: 0.78 }, style]}>
      <Text style={[styles.text, secondary && styles.secondaryText]}>{title}</Text>
    </Pressable>;
}
const styles = StyleSheet.create({
  button: { minHeight: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  primary: { backgroundColor: colors.primary }, secondary: { backgroundColor: colors.primarySoft },
  disabled: { opacity: 0.46 }, text: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' }, secondaryText: { color: colors.primary }
});
