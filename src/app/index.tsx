import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Page } from '../components/Page';
import { ActionButton } from '../components/ActionButton';
import { ProgressBar } from '../components/ProgressBar';
import { colors, sizes } from '../constants/theme';
import { LESSONS } from '../features/learning/data';
import { useCourses } from '../features/courses/CourseProvider';
import type { CourseUnitSummary } from '../features/courses/schema';
import { canStartLesson } from '../features/progress/logic';
import { useProgress } from '../features/progress/ProgressProvider';

type LessonTileProps = {
  title: string;
  subtitle: string;
  exerciseCount: number;
  number: number;
  done: boolean;
  unlocked: boolean;
  busy: boolean;
  onPress: () => void;
};

function LessonTile({ title, subtitle, exerciseCount, number, done, unlocked, busy, onPress }: LessonTileProps) {
  return <Pressable accessibilityRole="button"
    accessibilityState={{ disabled: !unlocked || busy }}
    accessibilityLabel={`${title}, ${done ? 'concluída' : unlocked ? 'disponível' : 'bloqueada'}`}
    disabled={!unlocked || busy}
    onPress={onPress}
    style={({ pressed }) => [styles.lessonCard, (!unlocked || busy) && styles.locked, pressed && styles.pressed]}>
    <View style={[styles.lessonBadge, done ? styles.done : unlocked ? styles.active : styles.inactive]}>
      <Text style={styles.badgeText}>{done ? '✓' : unlocked ? String(number) : '●'}</Text>
    </View>
    <View style={styles.lessonInfo}>
      <Text style={styles.lessonTitle}>{title}</Text>
      <Text style={styles.lessonSub}>{subtitle}</Text>
      <Text style={styles.exerciseCount}>{exerciseCount} exercícios</Text>
    </View>
    <Text style={styles.chevron}>{done ? '↻' : unlocked ? '›' : '—'}</Text>
  </Pressable>;
}

export default function Home() {
  const { progress, ready } = useProgress();
  const { catalog, ready: coursesReady, refreshing, refresh, downloaded, download, remove, loadUnit } = useCourses();
  const [busy, setBusy] = useState(false);

  // O curso de italiano aparece em uma trilha única: as lições embutidas vêm
  // primeiro; todas as unidades publicadas no R2 aparecem em sequência.
  const italianUnits = useMemo(() => catalog.units.filter(unit => unit.language === 'it'), [catalog.units]);
  const orderedIds = useMemo(() => [
    ...LESSONS.map(lesson => lesson.id),
    ...italianUnits.flatMap(unit => unit.lessons.map(lesson => lesson.id)),
  ], [italianUnits]);
  const completed = orderedIds.filter(id => progress.completedLessonIds.includes(id)).length;

  const run = async (operation: () => Promise<void>, errorMessage: string) => {
    if (busy) return;
    setBusy(true);
    try {
      await operation();
    } catch (error) {
      console.warn('Falha na operação de conteúdo do Lunivo:', error instanceof Error ? error.message : 'erro');
      Alert.alert('Não foi possível concluir', errorMessage);
    } finally {
      setBusy(false);
    }
  };

  const openRemoteLesson = (unit: CourseUnitSummary, lessonId: string) => {
    void run(async () => {
      await loadUnit(unit); // Abre o arquivo baixado ou lê a unidade diretamente do R2.
      router.push({ pathname: '/lesson/[lessonId]', params: { lessonId } });
    }, 'Conecte-se à internet ou baixe esta unidade para estudá-la offline.');
  };

  const removeDownloadedUnit = (unit: CourseUnitSummary) => {
    Alert.alert('Remover unidade baixada?',
      'Os arquivos dessa unidade serão removidos do celular. Suas lições concluídas e seu progresso continuarão salvos.', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Remover', style: 'destructive', onPress: () => {
          void run(() => remove(unit), 'Não foi possível remover o download. Tente novamente.');
        } },
      ]);
  };

  return <Page><ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}
    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { void refresh(); }} tintColor={colors.primary} />}>
    <View style={styles.top}>
      <View><Text style={styles.brand}>lunivo<Text style={styles.dot}>.</Text></Text>
        <Text style={styles.tag}>Seu italiano começa aqui</Text></View>
      <Pressable accessibilityRole="button" accessibilityLabel="Abrir meu progresso"
        onPress={() => router.push('/profile')} style={styles.avatar}>
        <Text style={styles.avatarText}>★</Text>
      </Pressable>
    </View>

    <View style={styles.hero}>
      <Text style={styles.kicker}>CURSO • ITALIANO</Text>
      <Text style={styles.heroTitle}>Uma palavra de cada vez.</Text>
      <Text style={styles.heroText}>Lições curtas, progresso real. Aprenda no seu ritmo.</Text>
      <View style={styles.heroBottom}>
        <Text style={styles.xp}>✦  {progress.totalXp} XP</Text>
        <Text style={styles.heroMeta}>{completed}/{orderedIds.length} lições</Text>
      </View>
      <ProgressBar value={orderedIds.length ? completed / orderedIds.length : 0} />
    </View>

    <Text style={styles.sectionLabel}>ITALIANO A1 • UNIDADE 01</Text>
    <Text style={styles.sectionTitle}>Primeiros passos</Text>
    <Text style={styles.embeddedStatus}>✓  Incluída no aplicativo · Disponível offline</Text>
    {!ready ? <ActivityIndicator color={colors.primary} style={styles.spinner} /> : LESSONS.map((lesson, index) => {
      const unlocked = canStartLesson(lesson.id, orderedIds, progress);
      const done = progress.completedLessonIds.includes(lesson.id);
      return <LessonTile key={lesson.id} title={lesson.title} subtitle={lesson.subtitle}
        exerciseCount={lesson.exercises.length} number={index + 1} done={done}
        unlocked={unlocked} busy={busy}
        onPress={() => router.push({ pathname: '/lesson/[lessonId]', params: { lessonId: lesson.id } })} />;
    })}

    {!coursesReady ? <ActivityIndicator color={colors.primary} style={styles.spinner} /> : null}
    {italianUnits.map(unit => {
      const offline = downloaded(unit);
      return <View key={`${unit.id}-r${unit.revision}`} style={styles.unitSection}>
        <View style={styles.unitHeading}>
          <View style={styles.unitHeadingText}>
            <Text style={styles.sectionLabel}>ITALIANO {unit.level} • UNIDADE {String(unit.order).padStart(2, '0')}</Text>
            <Text style={styles.sectionTitle}>{unit.title}</Text>
            <Text style={styles.unitSubtitle}>{unit.subtitle}</Text>
          </View>
          <Text style={[styles.remoteStatus, offline && styles.remoteStatusOffline]}>{offline ? '✓ Offline' : '☁ Online'}</Text>
        </View>
        <View style={styles.downloadRow}>
          {!offline ? <Pressable accessibilityRole="button" accessibilityLabel={`Baixar ${unit.title} para estudar offline`}
            disabled={busy} onPress={() => { void run(() => download(unit), 'Confira a conexão. Para deixar uma unidade offline, todas as gravações obrigatórias precisam estar disponíveis.'); }}
            style={[styles.downloadAction, busy && styles.locked]}>
            <Text style={styles.downloadText}>{busy ? 'Aguarde…' : '↓  Baixar para estudar offline'}</Text>
          </Pressable> : <Pressable accessibilityRole="button" accessibilityLabel={`Remover download de ${unit.title}`}
            disabled={busy} onPress={() => removeDownloadedUnit(unit)}
            style={[styles.removeAction, busy && styles.locked]}>
            <Text style={styles.removeText}>Remover download</Text>
          </Pressable>}
        </View>
        {unit.lessons.map(lesson => {
          const unlocked = ready && canStartLesson(lesson.id, orderedIds, progress);
          const done = progress.completedLessonIds.includes(lesson.id);
          return <LessonTile key={lesson.id} title={lesson.title} subtitle={lesson.subtitle}
            exerciseCount={lesson.exerciseCount} number={orderedIds.indexOf(lesson.id) + 1} done={done}
            unlocked={unlocked} busy={busy} onPress={() => openRemoteLesson(unit, lesson.id)} />;
        })}
      </View>;
    })}

    {coursesReady && italianUnits.length === 0 ? <Text style={styles.nextHint}>
      As próximas unidades aparecerão aqui automaticamente quando forem publicadas.
    </Text> : null}
    <View style={styles.foot}><ActionButton title="Ver meu progresso" secondary onPress={() => router.push('/profile')} /></View>
    <Text style={styles.footer}>Deslize para baixo para atualizar as unidades · O progresso é preservado ao remover downloads.</Text>
  </ScrollView></Page>;
}

const styles = StyleSheet.create({
  content: { padding: sizes.page, paddingBottom: 36 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 25 },
  brand: { fontSize: 30, fontWeight: '900', letterSpacing: -1.8, color: colors.ink },
  dot: { color: colors.primary }, tag: { color: colors.muted, fontSize: 13, marginTop: 2 },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 23, color: colors.primary },
  hero: { backgroundColor: colors.ink, borderRadius: 25, padding: 24, marginBottom: 30 },
  kicker: { color: '#93C5FD', fontWeight: '800', letterSpacing: 1.3, fontSize: 11 },
  heroTitle: { color: '#FFFFFF', fontSize: 29, lineHeight: 35, fontWeight: '900', letterSpacing: -0.6, marginTop: 13, maxWidth: 280 },
  heroText: { color: '#C9D6E6', marginTop: 10, fontSize: 15, lineHeight: 23 },
  heroBottom: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 25, marginBottom: 14 },
  xp: { color: '#FFFFFF', fontWeight: '800' }, heroMeta: { color: '#C9D6E6', fontSize: 13 },
  sectionLabel: { fontSize: 11, color: colors.primary, fontWeight: '900', letterSpacing: 1.4 },
  sectionTitle: { fontSize: 24, fontWeight: '900', color: colors.ink, marginTop: 5, marginBottom: 9 },
  embeddedStatus: { fontSize: 12, fontWeight: '700', color: colors.green, marginBottom: 16 },
  unitSection: { marginTop: 26 }, unitHeading: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  unitHeadingText: { flex: 1 }, unitSubtitle: { fontSize: 13, color: colors.muted, marginBottom: 11, lineHeight: 19 },
  remoteStatus: { color: colors.primary, fontSize: 11, fontWeight: '800', backgroundColor: colors.primarySoft,
    paddingHorizontal: 9, paddingVertical: 7, borderRadius: 11, overflow: 'hidden' },
  remoteStatusOffline: { color: colors.green, backgroundColor: colors.greenSoft },
  downloadRow: { marginBottom: 13 },
  downloadAction: { backgroundColor: colors.primarySoft, borderRadius: 13, paddingHorizontal: 14, paddingVertical: 14, alignItems: 'center' },
  downloadText: { fontSize: 13, color: colors.primary, fontWeight: '800' },
  removeAction: { borderRadius: 13, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 14, paddingVertical: 12, alignItems: 'center' },
  removeText: { fontSize: 13, color: colors.muted, fontWeight: '700' },
  lessonCard: { backgroundColor: colors.surface, padding: 16, borderRadius: 19, borderWidth: 1, borderColor: colors.line,
    marginBottom: 11, flexDirection: 'row', gap: 13, alignItems: 'center' },
  locked: { opacity: 0.5 }, pressed: { opacity: 0.75 },
  lessonBadge: { width: 51, height: 51, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  done: { backgroundColor: colors.green }, active: { backgroundColor: colors.primary }, inactive: { backgroundColor: colors.disabled },
  badgeText: { color: '#FFFFFF', fontWeight: '900', fontSize: 20 }, lessonInfo: { flex: 1 },
  lessonTitle: { fontWeight: '800', fontSize: 16, color: colors.ink },
  lessonSub: { fontSize: 13, color: colors.muted, marginTop: 3 },
  exerciseCount: { fontSize: 11, color: colors.primary, marginTop: 8, fontWeight: '800' },
  chevron: { fontSize: 26, color: colors.muted },
  spinner: { marginTop: 24, marginBottom: 18 }, nextHint: { fontSize: 13, color: colors.muted,
    lineHeight: 20, marginTop: 17, marginBottom: 4, textAlign: 'center' },
  foot: { marginTop: 18 }, footer: { color: colors.muted, fontSize: 12, textAlign: 'center', marginTop: 23, lineHeight: 19 },
});
