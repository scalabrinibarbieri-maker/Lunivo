import { View, StyleSheet } from 'react-native';
import { colors } from '../constants/theme';
export function ProgressBar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(1, value));
  return <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(pct * 100) }} style={styles.track}>
    <View style={[styles.fill, { width: `${pct * 100}%` as `${number}%` }]} />
  </View>;
}
const styles = StyleSheet.create({ track: { height: 11, backgroundColor: colors.line, borderRadius: 20, overflow: 'hidden', flex: 1 }, fill: { height: 11, backgroundColor: colors.primary, borderRadius: 20 } });
