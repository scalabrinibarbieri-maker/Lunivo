import { useEffect, useRef } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PremiumEmblem } from './PremiumEmblem';

export type InsightKind = 'xp' | 'streak';
export function PremiumInsightSheet({ kind, onClose, totalXp, streak, studiedToday }: {
  kind: InsightKind | null; onClose: () => void; totalXp: number; streak: number; studiedToday: boolean;
}) {
  const insets = useSafeAreaInsets();
  const backdrop = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(450)).current;
  useEffect(() => {
    if (!kind) return;
    backdrop.setValue(0); slide.setValue(450);
    Animated.parallel([
      Animated.timing(backdrop, { toValue: 1, duration: 230, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.spring(slide, { toValue: 0, damping: 22, stiffness: 205, mass: 0.85, useNativeDriver: true }),
    ]).start();
  }, [kind, backdrop, slide]);
  const dismiss = () => {
    Animated.parallel([
      Animated.timing(backdrop, { toValue: 0, duration: 160, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 450, duration: 210, easing: Easing.in(Easing.quad), useNativeDriver: true }),
    ]).start(({ finished }) => { if (finished) onClose(); });
  };
  const isStreak = kind === 'streak';
  return <Modal visible={kind !== null} transparent animationType="none" onRequestClose={dismiss} statusBarTranslucent>
    <View style={styles.root}>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: backdrop }]} />
      <Pressable accessibilityRole="button" accessibilityLabel="Fechar detalhes" style={StyleSheet.absoluteFill} onPress={dismiss} />
      <Animated.View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 18) + 18, transform: [{ translateY: slide }] }]}>
        <View style={styles.grabber} />
        <View style={styles.emblem}><PremiumEmblem kind={isStreak ? 'streak' : 'xp'} size={64} /></View>
        <Text style={styles.eyebrow}>{isStreak ? 'CONSISTÊNCIA' : 'SUA EXPERIÊNCIA'}</Text>
        <Text style={styles.heading}>{isStreak ? `${streak} ${streak === 1 ? 'dia seguido' : 'dias seguidos'}` : `${totalXp} XP`}</Text>
        <Text style={styles.copy}>{isStreak
          ? studiedToday ? 'Seu estudo de hoje já está registrado. Continue amanhã para ampliar sua sequência.' : 'Uma lição concluída hoje mantém sua sequência. Todo avanço conta.'
          : 'A experiência é conquistada ao concluir lições. Continue avançando para ampliar seu resultado.'}</Text>
        <View style={styles.detail}><View style={[styles.indicator, { backgroundColor: isStreak ? '#E6A86E' : '#83BDFF' }]} />
          <Text style={styles.detailText}>{isStreak ? studiedToday ? 'Atividade de hoje concluída' : 'Pronto para estudar hoje' : 'Seu total de experiência atual'}</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Voltar ao estudo" onPress={dismiss} style={styles.action}>
          <Text style={styles.actionText}>Continuar aprendendo</Text>
          <Text style={styles.arrow}>→</Text>
        </Pressable>
      </Animated.View>
    </View>
  </Modal>;
}
const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { backgroundColor: 'rgba(8,23,37,0.64)' },
  sheet: { backgroundColor: '#F8FAFD', borderTopLeftRadius: 32, borderTopRightRadius: 32,
    paddingHorizontal: 26, paddingTop: 11, alignItems: 'center', borderWidth: 1, borderColor: '#DDE7F2' },
  grabber: { height: 4, width: 43, borderRadius: 4, backgroundColor: '#C8D4DF', marginBottom: 19 },
  emblem: { width: 88, height: 88, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: '#102D4C', marginBottom: 20 },
  eyebrow: { fontSize: 10, fontWeight: '900', letterSpacing: 2.2, color: '#4D7AAB' },
  heading: { fontSize: 29, fontWeight: '900', color: '#10283E', marginTop: 10, letterSpacing: -0.6 },
  copy: { fontSize: 15, lineHeight: 24, textAlign: 'center', color: '#627995', marginTop: 12 },
  detail: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EAF1F8', borderRadius: 15,
    marginTop: 26, width: '100%', paddingVertical: 17, paddingHorizontal: 18, gap: 11 },
  indicator: { width: 8, height: 8, borderRadius: 4 },
  detailText: { color: '#375573', fontSize: 13, fontWeight: '800', flex: 1 },
  action: { width: '100%', backgroundColor: '#102D4C', borderRadius: 17, marginTop: 20,
    height: 57, justifyContent: 'center', alignItems: 'center' },
  actionText: { color: '#FFFFFF', fontWeight: '900', fontSize: 15 },
  arrow: { position: 'absolute', right: 20, color: '#FFFFFF', fontSize: 21, fontWeight: '800' },
});
