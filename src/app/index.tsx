import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Page } from '../components/Page';
import { colors } from '../constants/theme';
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
  last: boolean;
  onPress: () => void;
};

function LessonTile({ title, subtitle, exerciseCount, number, done, unlocked, busy, last, onPress }: LessonTileProps) {
  const available = unlocked && !busy;
  return (
    <View style={styles.pathStep}>
      <View style={styles.pathSpine}>
        <View style={[styles.pathNode, done ? styles.nodeDone : unlocked ? styles.nodeActive : styles.nodeLocked]}>
          <Text style={[styles.nodeIcon, !unlocked && styles.nodeIconLocked]}>{done ? '✓' : unlocked ? '✦' : '•'}</Text>
        </View>
        {!last && <View style={[styles.pathStem, done && styles.pathStemDone]} />}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !available }}
        accessibilityLabel={`${title}, lição ${number}, ${done ? 'concluída' : unlocked ? 'disponível' : 'bloqueada'}`}
        disabled={!available}
        onPress={onPress}
        style={({ pressed }) => [styles.pathCard, done && styles.pathCardDone, !unlocked && styles.pathCardLocked, pressed && styles.pathCardPressed]}
      >
        <View style={styles.lessonHeading}>
          <Text style={[styles.pathEyebrow, done && styles.pathEyebrowDone]}>
            {done ? 'CONCLUÍDA' : unlocked ? 'PRONTA PARA VOCÊ' : `LIÇÃO ${String(number).padStart(2, '0')}`}
          </Text>
          <Text style={styles.pathChevron}>{done ? '↻' : unlocked ? '›' : '⌁'}</Text>
        </View>
        <Text style={styles.pathTitle}>{title}</Text>
        <Text style={styles.pathDescription}>{subtitle}</Text>
        <View style={styles.lessonFooter}>
          <Text style={styles.lessonCount}>{exerciseCount} exercícios</Text>
          {done && <Text style={styles.reviewLabel}>Revisar</Text>}
        </View>
      </Pressable>
    </View>
  );
}

export default function Home() {
  const { progress, ready } = useProgress();
  const { catalog, ready: coursesReady, refreshing, refresh, downloaded, download, remove, loadUnit } = useCourses();
  const [busy, setBusy] = useState(false);

  // Preserva a mesma sequência e os mesmos identificadores usados pelo progresso e pela nuvem.
  const italianUnits = useMemo(() => catalog.units.filter(unit => unit.language === 'it'), [catalog.units]);
  const orderedIds = useMemo(() => [
    ...LESSONS.map(lesson => lesson.id),
    ...italianUnits.flatMap(unit => unit.lessons.map(lesson => lesson.id)),
  ], [italianUnits]);
  const completedIds = progress.completedLessonIds;
  const completed = orderedIds.filter(id => completedIds.includes(id)).length;
  const progressRatio = orderedIds.length ? completed / orderedIds.length : 0;
  const nextId = orderedIds.find(id => !completedIds.includes(id)) ?? LESSONS[0]?.id;
  const nextLocal = LESSONS.find(lesson => lesson.id === nextId);
  const nextRemote = italianUnits.flatMap(unit => unit.lessons.map(lesson => ({ unit, lesson })))
    .find(item => item.lesson.id === nextId);
  const allDone = orderedIds.length > 0 && completed === orderedIds.length;
  const nextTitle = nextLocal?.title ?? nextRemote?.lesson.title ?? 'Primeiras palavras';
  const nextSubtitle = nextLocal?.subtitle ?? nextRemote?.lesson.subtitle ?? 'Sua próxima conquista começa aqui';

  const run = async (operation: () => Promise<void>, errorMessage: string) => {
    if (busy) return;
    setBusy(true);
    try { await operation(); }
    catch (error) {
      console.warn('Falha na operação de conteúdo do Lunivo:', error instanceof Error ? error.message : 'erro');
      Alert.alert('Não foi possível concluir', errorMessage);
    } finally { setBusy(false); }
  };

  const openRemoteLesson = (unit: CourseUnitSummary, lessonId: string) => {
    void run(async () => {
      await loadUnit(unit);
      router.push({ pathname: '/lesson/[lessonId]', params: { lessonId } });
    }, 'Conecte-se à internet ou baixe esta unidade para estudá-la offline.');
  };

  const resume = () => {
    if (!ready || busy || !nextId) return;
    if (nextLocal) {
      router.push({ pathname: '/lesson/[lessonId]', params: { lessonId: nextLocal.id } });
    } else if (nextRemote) {
      openRemoteLesson(nextRemote.unit, nextRemote.lesson.id);
    }
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

  return (
    <Page>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { void refresh(); }} tintColor={colors.primary} />}
      >
        <View style={styles.top}>
          <View>
            <Text style={styles.brand}>lunivo<Text style={styles.dot}>.</Text></Text>
            <Text style={styles.tag}>Seu espaço de aprendizado</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Abrir meu perfil" onPress={() => router.push('/profile')} style={styles.avatar}>
            <Text style={styles.avatarText}>◎</Text>
          </Pressable>
        </View>

        <View style={styles.courseStrip}>
          <Text style={styles.courseFlag}>🇮🇹</Text>
          <View style={styles.courseName}><Text style={styles.courseCaption}>MEU IDIOMA</Text><Text style={styles.courseText}>Italiano <Text style={styles.courseLevel}>· A1</Text></Text></View>
          <View style={styles.xpPill}><Text style={styles.xpSpark}>✦ </Text><Text style={styles.xpText}>{progress.totalXp} XP</Text></View>
        </View>

        <View style={styles.welcome}><Text style={styles.welcomeTitle}>Cada lição é uma conquista.</Text><Text style={styles.welcomeSub}>Sua jornada começa com o próximo passo.</Text></View>

        <View style={styles.hero}>
          <View pointerEvents="none" style={styles.heroRingLarge} />
          <View pointerEvents="none" style={styles.heroRingSmall} />
          <View style={styles.heroUpper}>
            <Text style={styles.heroKicker}>{allDone ? 'JORNADA CONCLUÍDA' : 'CONTINUE APRENDENDO'}</Text>
            <Text style={styles.heroStar}>✦</Text>
          </View>
          <Text style={styles.heroTitle}>{allDone ? 'Chegou até aqui. E agora?' : nextTitle}</Text>
          <Text style={styles.heroText}>{allDone ? 'Revise suas conquistas enquanto novas unidades chegam.' : nextSubtitle}</Text>
          <View style={styles.heroProgressLine}>
            <Text style={styles.heroProgressLabel}>PROGRESSO DO CURSO</Text>
            <Text style={styles.heroProgressValue}>{completed} de {orderedIds.length} lições</Text>
          </View>
          <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(progressRatio * 100) }} style={styles.heroTrack}>
            <View style={[styles.heroFill, { width: `${Math.round(progressRatio * 100)}%` as `${number}%` }]} />
          </View>
          <Pressable accessibilityRole="button" disabled={!ready || busy || !nextId} accessibilityLabel={allDone ? 'Revisar primeira lição' : `Continuar com ${nextTitle}`}
            onPress={resume} style={({ pressed }) => [styles.primaryAction, (!ready || busy) && styles.actionDisabled, pressed && styles.actionPressed]}>
            <Text style={styles.primaryActionText}>{allDone ? 'Revisar lição' : 'Continuar lição'}</Text><Text style={styles.primaryActionArrow}>→</Text>
          </Pressable>
        </View>

        <View style={styles.journeyHeading}>
          <View><Text style={styles.journeyEyebrow}>SUA JORNADA</Text><Text style={styles.journeyTitle}>Caminho do italiano</Text></View>
          <View style={styles.countPill}><Text style={styles.countText}>{completed}/{orderedIds.length}</Text></View>
        </View>

        <View style={styles.unitBanner}>
          <View style={styles.unitNumber}><Text style={styles.unitNumberText}>01</Text></View>
          <View style={styles.unitBannerCopy}><Text style={styles.unitBannerEyebrow}>ITALIANO A1 · UNIDADE 01</Text><Text style={styles.unitBannerTitle}>Primeiros passos</Text><Text style={styles.unitBannerSub}>O início da sua história com o italiano</Text></View>
        </View>
        <Text style={styles.offlineLine}>✓  Conteúdo no aplicativo · Disponível offline</Text>
        {!ready ? <ActivityIndicator color={colors.primary} style={styles.spinner} /> : LESSONS.map((lesson, index) => (
          <LessonTile key={lesson.id} title={lesson.title} subtitle={lesson.subtitle} exerciseCount={lesson.exercises.length}
            number={index + 1} done={completedIds.includes(lesson.id)} unlocked={canStartLesson(lesson.id, orderedIds, progress)}
            busy={busy} last={index === LESSONS.length - 1}
            onPress={() => router.push({ pathname: '/lesson/[lessonId]', params: { lessonId: lesson.id } })} />
        ))}

        {!coursesReady && <ActivityIndicator color={colors.primary} style={styles.spinner} />}
        {italianUnits.map(unit => {
          const offline = downloaded(unit);
          return <View key={`${unit.id}-r${unit.revision}`} style={styles.unitSection}>
            <View style={styles.unitBanner}>
              <View style={styles.unitNumber}><Text style={styles.unitNumberText}>{String(unit.order).padStart(2, '0')}</Text></View>
              <View style={styles.unitBannerCopy}>
                <Text style={styles.unitBannerEyebrow}>ITALIANO {unit.level} · UNIDADE {String(unit.order).padStart(2, '0')}</Text>
                <Text style={styles.unitBannerTitle}>{unit.title}</Text>
                <Text style={styles.unitBannerSub}>{unit.subtitle}</Text>
              </View>
            </View>
            <View style={styles.downloadHeading}>
              <Text style={[styles.remoteStatus, offline && styles.remoteStatusOffline]}>{offline ? '✓ Disponível offline' : '☁ Conteúdo online'}</Text>
              {!offline ? <Pressable accessibilityRole="button" accessibilityLabel={`Baixar ${unit.title} para estudar offline`}
                disabled={busy} onPress={() => { void run(() => download(unit), 'Confira a conexão. Todas as gravações obrigatórias precisam estar disponíveis.'); }}>
                <Text style={styles.downloadActionText}>{busy ? 'Aguarde…' : '↓ Baixar unidade'}</Text>
              </Pressable> : <Pressable accessibilityRole="button" accessibilityLabel={`Remover download de ${unit.title}`}
                disabled={busy} onPress={() => removeDownloadedUnit(unit)}>
                <Text style={styles.removeActionText}>Remover download</Text>
              </Pressable>}
            </View>
            {unit.lessons.map((lesson, index) => (
              <LessonTile key={lesson.id} title={lesson.title} subtitle={lesson.subtitle} exerciseCount={lesson.exerciseCount}
                number={orderedIds.indexOf(lesson.id) + 1} done={completedIds.includes(lesson.id)}
                unlocked={ready && canStartLesson(lesson.id, orderedIds, progress)} busy={busy}
                last={index === unit.lessons.length - 1} onPress={() => openRemoteLesson(unit, lesson.id)} />
            ))}
          </View>;
        })}
        {coursesReady && italianUnits.length === 0 && <Text style={styles.nextHint}>Novas unidades aparecerão automaticamente quando forem publicadas.</Text>}
        <View style={styles.endMarker}><Text style={styles.endIcon}>✦</Text><Text style={styles.endText}>Continue avançando, no seu ritmo.</Text></View>
      </ScrollView>

      <View style={styles.dock}>
        <Pressable accessibilityRole="button" accessibilityState={{ selected: true }} onPress={() => router.replace('/')} style={styles.dockItem}>
          <Text style={[styles.dockSymbol, styles.dockActive]}>⌂</Text><Text style={[styles.dockLabel, styles.dockActive]}>Aprender</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => router.push('/courses')} style={styles.dockItem}>
          <Text style={styles.dockSymbol}>▤</Text><Text style={styles.dockLabel}>Cursos</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => router.push('/profile')} style={styles.dockItem}>
          <Text style={styles.dockSymbol}>◎</Text><Text style={styles.dockLabel}>Perfil</Text>
        </Pressable>
      </View>
    </Page>
  );
}

const NAVY = '#071625';
const styles = StyleSheet.create({
  content: { paddingHorizontal: 22, paddingTop: 11, paddingBottom: 36 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  brand: { fontSize: 30, letterSpacing: -2, fontWeight: '900', color: NAVY },
  dot: { color: '#246BEB' },
  tag: { fontSize: 12, color: '#7C8799', marginTop: 2 },
  avatar: { width: 44, height: 44, borderRadius: 16, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E6ECF4', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 26, fontWeight: '700', color: NAVY },
  courseStrip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 19, borderWidth: 1, borderColor: '#E7EDF5', paddingHorizontal: 13, paddingVertical: 13 },
  courseFlag: { fontSize: 29, marginRight: 11 }, courseName: { flex: 1 },
  courseCaption: { fontSize: 9, fontWeight: '800', letterSpacing: 1.15, color: '#8898B1' },
  courseText: { fontSize: 16, fontWeight: '900', color: NAVY, marginTop: 2 },
  courseLevel: { fontSize: 13, color: '#788BA8', fontWeight: '700' },
  xpPill: { flexDirection: 'row', borderRadius: 12, backgroundColor: '#F1F6FF', paddingVertical: 10, paddingHorizontal: 11 },
  xpSpark: { color: '#E49D28', fontSize: 14 }, xpText: { color: '#2155AB', fontSize: 12, fontWeight: '900' },
  welcome: { marginTop: 23, marginBottom: 19 },
  welcomeTitle: { color: NAVY, fontSize: 25, fontWeight: '900', lineHeight: 30, letterSpacing: -0.7 },
  welcomeSub: { color: '#74849C', fontSize: 13, marginTop: 6 },
  hero: { backgroundColor: '#122D55', borderRadius: 27, padding: 23, overflow: 'hidden' },
  heroRingLarge: { position: 'absolute', width: 240, height: 240, right: -113, top: -125, borderRadius: 120, borderWidth: 38, borderColor: 'rgba(112,163,255,0.08)' },
  heroRingSmall: { position: 'absolute', width: 170, height: 170, right: -75, top: 60, borderRadius: 85, borderWidth: 1, borderColor: 'rgba(140,184,255,0.19)' },
  heroUpper: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroKicker: { fontSize: 10, fontWeight: '900', letterSpacing: 1.4, color: '#A7C7FF' },
  heroStar: { fontSize: 22, color: '#FFC96E' },
  heroTitle: { color: '#FFFFFF', fontWeight: '900', fontSize: 28, letterSpacing: -0.7, lineHeight: 34, marginTop: 10, maxWidth: 280 },
  heroText: { fontSize: 14, color: '#CCDDF4', marginTop: 8, lineHeight: 21, maxWidth: 265 },
  heroProgressLine: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 25, marginBottom: 10 },
  heroProgressLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 1.1, color: '#9AB6D9' },
  heroProgressValue: { fontSize: 11, color: '#D5E4F9', fontWeight: '800' },
  heroTrack: { height: 7, borderRadius: 9, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.2)' },
  heroFill: { height: '100%', backgroundColor: '#76C8FF', borderRadius: 9 },
  primaryAction: { height: 51, borderRadius: 15, marginTop: 23, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
  primaryActionText: { color: '#174A91', fontSize: 15, fontWeight: '900' },
  primaryActionArrow: { color: '#174A91', fontSize: 23 },
  actionPressed: { opacity: 0.8 }, actionDisabled: { opacity: 0.6 },
  journeyHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 35, marginBottom: 18 },
  journeyEyebrow: { fontSize: 10, fontWeight: '900', letterSpacing: 1.4, color: '#3674D2' },
  journeyTitle: { fontSize: 24, fontWeight: '900', color: NAVY, letterSpacing: -0.5, marginTop: 5 },
  countPill: { backgroundColor: '#E6F0FF', borderRadius: 12, paddingHorizontal: 11, paddingVertical: 7 },
  countText: { color: '#286BD2', fontWeight: '900', fontSize: 12 },
  unitBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E7EEFF', padding: 16, borderRadius: 20, marginBottom: 11 },
  unitNumber: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', marginRight: 13 },
  unitNumberText: { color: '#265FD0', fontSize: 18, fontWeight: '900' },
  unitBannerCopy: { flex: 1 },
  unitBannerEyebrow: { color: '#4674C9', fontSize: 9, letterSpacing: 1.1, fontWeight: '900' },
  unitBannerTitle: { color: NAVY, fontSize: 17, fontWeight: '900', marginTop: 3 },
  unitBannerSub: { color: '#61799F', fontSize: 11, marginTop: 4 },
  offlineLine: { color: '#2D8369', fontSize: 11, fontWeight: '800', marginBottom: 15, marginLeft: 7 },
  pathStep: { flexDirection: 'row', alignItems: 'stretch', minHeight: 125 },
  pathSpine: { width: 64, alignItems: 'center', paddingTop: 18 },
  pathNode: { height: 48, width: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', borderWidth: 4, borderColor: '#FFFFFF', zIndex: 1, elevation: 2 },
  nodeActive: { backgroundColor: '#276CF2' }, nodeDone: { backgroundColor: '#1BAE83' }, nodeLocked: { backgroundColor: '#CAD5E4' },
  nodeIcon: { fontSize: 24, fontWeight: '900', color: '#FFFFFF' }, nodeIconLocked: { color: '#EFF5FF' },
  pathStem: { width: 3, flex: 1, marginTop: -1, backgroundColor: '#E1E8F5', borderRadius: 3 },
  pathStemDone: { backgroundColor: '#9FE2CF' },
  pathCard: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 19, borderColor: '#E8EDF6', borderWidth: 1, padding: 16, marginBottom: 12, marginLeft: 5, minHeight: 110, justifyContent: 'center' },
  pathCardDone: { borderColor: '#D4F1E4', backgroundColor: '#FAFFFC' },
  pathCardLocked: { opacity: 0.56 }, pathCardPressed: { opacity: 0.75 },
  lessonHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pathEyebrow: { fontSize: 9, fontWeight: '900', color: '#3675DB', letterSpacing: 1.1 },
  pathEyebrowDone: { color: '#1F9876' }, pathChevron: { fontSize: 20, color: '#9AACBE', marginTop: -5 },
  pathTitle: { color: NAVY, fontSize: 16, fontWeight: '900', marginTop: 4 },
  pathDescription: { color: '#8290A4', fontSize: 12, marginTop: 4 },
  lessonFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 11 },
  lessonCount: { color: '#557AB6', fontSize: 10, fontWeight: '800' }, reviewLabel: { color: '#239673', fontSize: 10, fontWeight: '800' },
  unitSection: { marginTop: 30 },
  downloadHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, paddingHorizontal: 5, gap: 7 },
  remoteStatus: { fontSize: 11, color: '#577AAC', fontWeight: '800' },
  remoteStatusOffline: { color: '#279A77' }, downloadActionText: { color: '#286BDB', fontSize: 11, fontWeight: '900' },
  removeActionText: { color: '#74849A', fontSize: 11, fontWeight: '800' },
  spinner: { marginVertical: 25 }, nextHint: { color: '#7C879D', fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 13 },
  endMarker: { alignItems: 'center', marginTop: 15 }, endIcon: { color: '#AAC1E0', fontSize: 23 }, endText: { color: '#8996AA', fontSize: 12, marginTop: 4 },
  dock: { height: 66, marginHorizontal: 19, marginTop: 5, backgroundColor: '#FFFFFF', borderRadius: 22, borderWidth: 1, borderColor: '#E5EDF7', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', elevation: 8 },
  dockItem: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 },
  dockSymbol: { fontSize: 24, fontWeight: '800', color: '#A3B0C4' },
  dockLabel: { fontSize: 10, fontWeight: '900', color: '#97A6BD' }, dockActive: { color: '#2165DF' },
});
