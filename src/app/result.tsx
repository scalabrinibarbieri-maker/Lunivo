import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { Page } from '../components/Page';
import { ActionButton } from '../components/ActionButton';
import { PremiumEmblem } from '../components/PremiumEmblem';
import { PremiumLoopAura } from '../components/PremiumLoopAura';
import { colors, sizes } from '../constants/theme';
import { useCourses } from '../features/courses/CourseProvider';
import { useProgress } from '../features/progress/ProgressProvider';
import { computeStreak, daysFromLegacy, localStudyDay } from '../features/progress/streak';

export default function Result() {
  const { lessonId, correct, xp, streakCelebration } = useLocalSearchParams<{ lessonId: string; correct: string; xp: string; streakCelebration?: string }>();
  const {lesson: findLesson} = useCourses();
  const {progress} = useProgress();
  const lesson = lessonId ? findLesson(lessonId) : undefined;
  const celebration = streakCelebration === '1';
  const burst = useRef(new Animated.Value(celebration ? 0 : 1)).current;
  useEffect(() => {
    if (!celebration) return;
    const animation = Animated.sequence([
      Animated.timing(burst, { toValue: 1, duration: 560, easing: Easing.out(Easing.back(1.3)), useNativeDriver: true }),
      Animated.timing(burst, { toValue: 0.92, duration: 920, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]);
    animation.start();
  }, [burst, celebration]);
  if (!lesson) return <Page><View style={styles.layout}><Text style={styles.title}>Resultado indisponível</Text><ActionButton title="Voltar" onPress={() => router.replace('/')} /></View></Page>;
  const gradedCount = lesson.exercises.filter(exercise => exercise.type !== 'info').length;
  const correctCount = Math.min(gradedCount, Math.max(0, Number(correct) || 0));
  const earned = Math.max(0, Number(xp) || 0);
  const streak = computeStreak(daysFromLegacy(progress.lastStudiedAt, progress.studyDays), localStudyDay(new Date()));
  return <Page><View style={styles.layout}>
    <View style={styles.medal}><PremiumEmblem kind="xp" size={94}/></View><Text style={styles.kicker}>LIÇÃO CONCLUÍDA</Text>
    <Text style={styles.title}>Bravissimo!</Text><Text style={styles.subtitle}>Você terminou “{lesson.title}”. Continue avançando!</Text>
    <View style={styles.stats}><View style={styles.stat}><Text style={styles.number}>{correctCount}/{gradedCount}</Text><Text style={styles.legend}>Respostas certas</Text></View>
      <View style={styles.stat}><Text style={styles.number}>+{earned}</Text><Text style={styles.legend}>XP conquistados</Text></View></View>
    {earned === 0 && <Text style={styles.note}>Ao repetir uma lição, o XP não é contado novamente.</Text>}
    <View style={[styles.streakCard, celebration && styles.streakCardCelebration]} accessibilityLiveRegion="polite">
      {celebration && <PremiumLoopAura variant="streak" opacity={1} />}
      <Animated.View style={[styles.streakMedal, { transform: [{ scale: burst.interpolate({ inputRange: [0, 1], outputRange: [0.84, 1.1] }) }] }]}>
        <PremiumEmblem kind="streak" size={44} />
      </Animated.View>
      <View style={styles.streakCopy}>
        {celebration && <Text style={styles.streakCelebrationKicker}>Sequência garantida hoje</Text>}
        <Text style={styles.streakTitle}>{streak.current} {streak.current === 1 ? 'dia seguido' : 'dias seguidos'}</Text>
        <Text style={styles.streakText}>{streak.studiedToday ? 'Parabéns! Mais uma conquista na sua jornada. Continue evoluindo!' : 'Continue praticando para manter sua sequência.'}</Text>
      </View>
    </View>
    <View style={styles.bottom}><ActionButton title="Continuar aprendendo" onPress={() => router.replace('/')} /></View>
  </View></Page>;
}
const styles = StyleSheet.create({
  layout: { flex: 1, paddingHorizontal: sizes.page, alignItems: 'center', justifyContent: 'center' },
  medal: { width: 134, height: 134, borderRadius: 36, backgroundColor: '#102E4F', alignItems: 'center', justifyContent: 'center', marginBottom: 25, borderWidth: 1, borderColor: '#3D668D' },
  kicker: { color: colors.primary, letterSpacing: 1.5, fontSize: 12, fontWeight: '900' },
  title: { fontSize: 38, fontWeight: '900', color: colors.ink, marginTop: 10 },
  subtitle: { color: colors.muted, fontSize: 16, lineHeight: 24, textAlign: 'center', marginTop: 12, maxWidth: 300 },
  stats: { flexDirection: 'row', gap: 12, marginTop: 25, width: '100%' },
  stat: { flex: 1, backgroundColor: '#FFFFFF', padding: 17, borderRadius: 17, borderWidth: 1, borderColor: colors.line, alignItems: 'center' },
  number: { fontSize: 23, fontWeight: '900', color: colors.primary },
  legend: { fontSize: 12, color: colors.muted, marginTop: 8, textAlign: 'center' },
  note: { fontSize: 12, color: colors.muted, textAlign: 'center', marginTop: 15 },
  streakCard: { width: '100%', marginTop: 20, padding: 16, borderRadius: 19, backgroundColor: '#102E4F', borderWidth: 1, borderColor: '#2C537A', flexDirection: 'row', alignItems: 'center', gap: 12, overflow: 'hidden' },
  streakCardCelebration: { borderColor: '#F0B76D' },
  streakMedal: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.04)' },
  streakCopy: { flex: 1 },
  streakCelebrationKicker: { color: '#F6C27E', fontSize: 10, fontWeight: '900', letterSpacing: 1.2, marginBottom: 4 },
  streakTitle: { color: '#FFFFFF', fontSize: 17, fontWeight: '900' },
  streakText: { color: '#C7DDF5', fontSize: 12, lineHeight: 18, marginTop: 4 },
  bottom: { width: '100%', marginTop: 30 },
});
