import type { ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../constants/theme';
export function Page({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return <View style={[styles.page, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12 }]}>{children}</View>;
}
const styles = StyleSheet.create({ page: { flex: 1, backgroundColor: colors.background } });
