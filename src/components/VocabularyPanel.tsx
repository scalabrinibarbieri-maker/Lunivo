import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { strengthOf, vocabularyStats, type VocabularyMemory, type VocabularyWord, type WordMemory, type WordStrength } from '../features/vocabulary/logic';
import { generalReviewWords, shouldOfferReview } from '../features/vocabulary/generalReview';
import { LESSONS } from '../features/learning/data';
import type { Lesson } from '../features/learning/types';
import { useCourses } from '../features/courses/CourseProvider';
import type { StudentProgress } from '../features/progress/logic';

type Filter = 'all' | WordStrength;
const NAVY = '#0C253E';
const STRENGTH = {
  strong: { title: 'Fortes', singular: 'Forte', tint: '#1C937B', pale: '#E8F6F2' },
  medium: { title: 'Médias', singular: 'Média', tint: '#BD8536', pale: '#FFF5E4' },
  weak: { title: 'Fracas', singular: 'Fraca', tint: '#AF626D', pale: '#FCEEF1' },
};

export function VocabularyPanel({ memory, progress, onReview }: {
  memory: VocabularyMemory;
  progress: StudentProgress;
  onReview: (words: readonly VocabularyWord[], correct: boolean) => Promise<void>;
}) {
  const [filter, setFilter] = useState<Filter>('all');
  const { lesson: cachedLesson, loadLesson } = useCourses();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [generalMode, setGeneralMode] = useState(false);
  const [sessionWords, setSessionWords] = useState<VocabularyWord[]>([]);
  const [sessionIndex, setSessionIndex] = useState(0);
  const [loadingGeneral, setLoadingGeneral] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const slide = useRef(new Animated.Value(0)).current;
  const today = new Date();
  const stats = vocabularyStats(memory, today);
  const records = useMemo(() => Object.values(memory).sort((a, b) => {
    const order: Record<WordStrength, number> = { weak: 0, medium: 1, strong: 2 };
    return order[strengthOf(a)] - order[strengthOf(b)] || a.term.localeCompare(b.term);
  }), [memory]);
  const selected = generalMode ? sessionWords[sessionIndex] : selectedId ? memory[selectedId] : undefined;
  const reviewDue = shouldOfferReview(progress, today);
  const hasCompletedLessons = progress.completedLessonIds.length > 0;
  const visible = records.filter(word => filter === 'all' || strengthOf(word, today) === filter);

  useEffect(() => {
    slide.setValue(0);
    if (!selectedId && !generalMode) return;
    const anim = Animated.timing(slide, { toValue: 1, duration: 270, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    anim.start();
    return () => anim.stop();
  }, [selectedId, generalMode, sessionIndex, slide]);

  const review = async (correct: boolean) => {
    if (!selected || busy) return;
    setBusy(true);
    try {
      const word: VocabularyWord = { id: selected.id, term: selected.term, meaning: selected.meaning, language: selected.language };
      await onReview([word], correct);
      setSelectedId(null);
      setRevealed(false);
      if (generalMode) {
        if (sessionIndex + 1 < sessionWords.length) setSessionIndex(i => i + 1);
        else {
          setGeneralMode(false);
          setSessionWords([]);
          setSessionIndex(0);
          setNotice('Revisão concluída! Continue praticando para fortalecer suas palavras.');
        }
      } else {
        setNotice(correct ? 'Boa! A lembrança foi reforçada.' : 'Registrado. Esta palavra merece mais revisão.');
      }
    } catch {
      setNotice('Não foi possível salvar esta revisão. Tente novamente.');
    } finally { setBusy(false); }
  };

  const beginGeneralReview = async () => {
    if (loadingGeneral || busy) return;
    setLoadingGeneral(true);
    setNotice('');
    try {
      const completed = progress.completedLessonIds;
      const localLessons = LESSONS.filter(l => completed.includes(l.id));
      const builtinIds = new Set(LESSONS.map(l => l.id));
      // Unidades remotas só são usadas se disponíveis, online ou já baixadas.
      // O estudo inicial funciona integralmente sem conexão.
      const remoteIds = completed.filter(id => !builtinIds.has(id)).slice(0, 45);
      const remote = await Promise.all(remoteIds.map(id => {
        const saved = cachedLesson(id);
        return saved ? Promise.resolve(saved) : loadLesson(id).catch(() => null);
      }));
      const lessons = [...localLessons, ...remote.filter((l): l is Lesson => l !== null)];
      const words = generalReviewWords(completed, lessons, memory, new Date(), 60);
      // Ainda é possível revisar palavras registradas durante uma lição não concluída.
      const available = words.length ? words : Object.values(memory).slice(0, 60).map(w => ({
        id: w.id, term: w.term, meaning: w.meaning, language: w.language,
      }));
      if (!available.length) {
        setNotice('Conclua uma lição para começar sua primeira revisão.');
        return;
      }
      setSessionWords(available);
      setSessionIndex(0);
      setGeneralMode(true);
      setSelectedId(null);
      setRevealed(false);
    } catch {
      setNotice('Não foi possível preparar a revisão. Tente novamente.');
    } finally {
      setLoadingGeneral(false);
    }
  };

  const leaveReview = () => {
    setGeneralMode(false);
    setSessionWords([]);
    setSessionIndex(0);
    setSelectedId(null);
    setRevealed(false);
  };

  return <View style={styles.wrapper}>
    <View style={styles.heading}>
      <View style={styles.headingTexts}>
        <Text style={styles.eyebrow}>MEMÓRIA DE PALAVRAS</Text>
        <Text style={styles.title}>Seu vocabulário</Text>
        <Text style={styles.description}>O que você aprende fica mais forte com a prática. Sem revisão, a lembrança perde força com o tempo.</Text>
      </View>
      <View style={styles.totalBadge}><Text style={styles.totalCount}>{stats.total}</Text><Text style={styles.totalLabel}>termos</Text></View>
    </View>

    <View style={styles.overview}>
      {(['strong','medium','weak'] as const).map(level => {
        const item = STRENGTH[level];
        return <Pressable key={level} accessibilityRole="button" accessibilityLabel={`${item.title}: ${stats[level]} palavras`}
          accessibilityState={{ selected: filter === level }} onPress={() => { setFilter(old => old === level ? 'all' : level); setSelectedId(null); }}
          style={[styles.level, filter === level && styles.levelSelected]}>
          <View style={[styles.levelLine, { backgroundColor: item.tint }]} />
          <Text style={styles.levelValue}>{stats[level]}</Text>
          <Text style={styles.levelLabel}>{item.title}</Text>
        </Pressable>;
      })}
    </View>
    {stats.total > 0 && <View style={styles.progressTrack}>
      {(['strong','medium','weak'] as const).map(level => stats[level] > 0 ?
        <View key={level} style={{ flex: stats[level], backgroundColor: STRENGTH[level].tint }} /> : null)}
    </View>}

    {!selected && (hasCompletedLessons || stats.total > 0) && <View style={[styles.generalBanner, reviewDue && styles.generalBannerDue]}>
      <View style={styles.generalHeader}>
        <View style={styles.generalDot} />
        <Text style={styles.generalLabel}>{reviewDue ? 'HORA DE REVISAR' : 'REVISÃO GERAL'}</Text>
      </View>
      <Text style={styles.generalTitle}>{reviewDue ? 'Vamos relembrar o que você aprendeu?' : 'Mantenha suas palavras na memória'}</Text>
      <Text style={styles.generalDescription}>{reviewDue
        ? 'Depois de alguns dias sem praticar, uma revisão ajuda a recuperar o ritmo.'
        : 'Revise as expressões das lições que você já concluiu, mesmo sem histórico de palavras.'}</Text>
      <Pressable accessibilityRole="button" disabled={loadingGeneral}
        onPress={() => { void beginGeneralReview(); }}
        style={[styles.generalButton, loadingGeneral && { opacity: 0.55 }]}>
        <Text style={styles.generalButtonText}>{loadingGeneral ? 'Preparando revisão…' : 'Começar revisão geral'}</Text>
        <Text style={styles.generalArrow}>›</Text>
      </Pressable>
    </View>}

    {selected ? <Animated.View style={[styles.reviewCard, {
      opacity: slide,
      transform: [{ translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
    }]}>
      <Text style={styles.reviewEyebrow}>{generalMode ? `REVISÃO GERAL · ${sessionIndex + 1} DE ${sessionWords.length}` : 'REVISÃO ATIVA'}</Text>
      <Text style={styles.reviewTitle}>Como se diz em italiano?</Text>
      <Text style={styles.meaning}>{selected.meaning}</Text>
      {!revealed ? <Pressable accessibilityRole="button" onPress={() => setRevealed(true)} style={styles.revealButton}>
        <Text style={styles.revealText}>Mostrar resposta</Text>
      </Pressable> : <>
        <View style={styles.answerPanel}>
          <Text style={styles.answerEyebrow}>RESPOSTA</Text>
          <Text style={styles.answer}>{selected.term}</Text>
        </View>
        <Text style={styles.reviewTip}>Você conseguiu lembrar antes de revelar?</Text>
        <View style={styles.reviewActions}>
          <Pressable accessibilityRole="button" disabled={busy} onPress={() => { void review(false); }} style={[styles.reviewAction, styles.didNotRemember]}>
            <Text style={styles.didNotRememberText}>Não lembrei</Text>
          </Pressable>
          <Pressable accessibilityRole="button" disabled={busy} onPress={() => { void review(true); }} style={[styles.reviewAction, styles.remembered]}>
            <Text style={styles.rememberedText}>Lembrei</Text>
          </Pressable>
        </View>
      </>}
      <Pressable accessibilityRole="button" onPress={leaveReview} style={styles.cancel}>
        <Text style={styles.cancelText}>Voltar à lista</Text>
      </Pressable>
    </Animated.View> : <>
      <View style={styles.listHeader}>
        <Text style={styles.listHeading}>{filter === 'all' ? 'Para praticar' : STRENGTH[filter].title}</Text>
        {filter !== 'all' && <Pressable accessibilityRole="button" onPress={() => setFilter('all')}>
          <Text style={styles.seeAll}>Ver todas</Text>
        </Pressable>}
      </View>
      {!stats.total ? <View style={styles.empty}>
        <Text style={styles.emptyTitle}>Seu vocabulário começa aqui.</Text>
        <Text style={styles.emptyText}>{hasCompletedLessons ? 'Que tal revisar suas lições? As palavras que você praticar aparecerão aqui.' : 'Aprenda novas expressões nas lições e acompanhe como sua memória evolui.'}</Text>
      </View> : visible.length === 0 ? <Text style={styles.emptyText}>Nenhuma palavra nesta categoria por enquanto.</Text> :
        visible.slice(0, 40).map((word: WordMemory) => {
          const level = strengthOf(word, today); const s = STRENGTH[level];
          return <Pressable key={word.id} accessibilityRole="button" accessibilityLabel={`Revisar ${word.term}, ${s.singular}`}
            onPress={() => { setNotice(''); setSelectedId(word.id); setRevealed(false); }} style={styles.wordRow}>
            <View style={[styles.wordAccent,{backgroundColor:s.tint}]} />
            <View style={styles.wordText}><Text style={styles.wordTerm}>{word.term}</Text><Text style={styles.wordMeaning}>{word.meaning}</Text></View>
            <View style={[styles.strengthBadge,{backgroundColor:s.pale}]}><Text style={[styles.strengthLabel,{color:s.tint}]}>{s.singular}</Text></View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>;
        })}
      {visible.length > 40 && <Text style={styles.more}>Mostrando 40 de {visible.length} termos. Use os filtros para encontrar mais.</Text>}
    </>}
    {!!notice && <Text accessibilityLiveRegion="polite" style={styles.notice}>{notice}</Text>}
    <Text style={styles.footnote}>Um pouco de prática a cada dia ajuda a transformar novas palavras em conhecimento duradouro.</Text>
  </View>;
}

const styles = StyleSheet.create({
  wrapper: { marginTop: 24, borderRadius: 24, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DEE7F2', padding: 17, overflow: 'hidden' },
  heading: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  headingTexts: { flex: 1 },
  eyebrow: { fontSize: 10, fontWeight: '900', letterSpacing: 1.2, color: '#5683AE' },
  title: { color: NAVY, fontWeight: '900', fontSize: 23, marginTop: 6, letterSpacing: -0.5 },
  description: { color: '#7388A0', fontSize: 12, lineHeight: 19, marginTop: 8 },
  totalBadge: { backgroundColor: '#E9F3FF', minWidth: 62, padding: 10, borderRadius: 17, alignItems: 'center' },
  totalCount: { color: '#155A9D', fontSize: 22, fontWeight: '900' },
  totalLabel: { color: '#547C9E', fontSize: 10, fontWeight: '800' },
  overview: { flexDirection: 'row', gap: 8, marginTop: 17 },
  level: { flex: 1, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 9, backgroundColor: '#F4F7FB', borderColor: '#E7EDF3', borderWidth: 1 },
  levelSelected: { borderColor: '#246FEB', backgroundColor: '#EFF6FF' },
  levelLine: { width: 25, height: 3, borderRadius: 2, marginBottom: 10 },
  levelValue: { color: NAVY, fontWeight: '900', fontSize: 22 },
  levelLabel: { color: '#6A819C', fontWeight: '700', fontSize: 11, marginTop: 4 },
  progressTrack: { height: 5, marginTop: 14, backgroundColor: '#EEF2F7', borderRadius: 99, flexDirection: 'row', overflow: 'hidden' },
  listHeader: { marginTop: 20, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  listHeading: { fontSize: 14, fontWeight: '900', color: NAVY },
  seeAll: { color: '#256FDB', fontWeight: '800', fontSize: 12 },
  wordRow: { backgroundColor: '#F7F9FC', marginTop: 7, borderRadius: 15, minHeight: 66, alignItems: 'center', flexDirection: 'row', paddingHorizontal: 10, gap: 9 },
  wordAccent: { width: 3, height: 26, borderRadius: 3 },
  wordText: { flex: 1 },
  wordTerm: { fontSize: 15, fontWeight: '900', color: NAVY },
  wordMeaning: { fontSize: 12, marginTop: 3, color: '#7489A0' },
  strengthBadge: { borderRadius: 9, paddingHorizontal: 8, paddingVertical: 6 },
  strengthLabel: { fontSize: 10, fontWeight: '900' },
  chevron: { color: '#93A7BA', fontSize: 22 },
  empty: { marginTop: 10, padding: 16, backgroundColor: '#F2F7FC', borderRadius: 15 },
  emptyTitle: { color: NAVY, fontWeight: '900', fontSize: 15 },
  emptyText: { marginTop: 8, fontSize: 12, lineHeight: 19, color: '#7488A0' },
  more: { color: '#627F9E', fontSize: 12, marginTop: 12, lineHeight: 19 },
  generalBanner: { marginTop: 18, backgroundColor: '#102E4F', borderRadius: 19, padding: 17, borderWidth: 1, borderColor: '#376087', overflow: 'hidden' },
  generalBannerDue: { borderColor: '#B9AC7C' },
  generalHeader: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  generalDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#F3C47B' },
  generalLabel: { color: '#A6C8E9', fontWeight: '900', fontSize: 10, letterSpacing: 1.4 },
  generalTitle: { color: '#FFFFFF', fontWeight: '900', fontSize: 20, lineHeight: 26, marginTop: 9 },
  generalDescription: { color: '#C7D6E7', fontSize: 13, lineHeight: 20, marginTop: 7 },
  generalButton: { backgroundColor: '#F4F8FE', borderRadius: 13, paddingHorizontal: 15, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 15 },
  generalButtonText: { color: '#194B78', fontSize: 13, fontWeight: '900' },
  generalArrow: { color: '#194B78', fontSize: 22, fontWeight: '800' },
  reviewCard: { backgroundColor: '#F1F6FD', borderRadius: 19, padding: 18, marginTop: 19 },
  reviewEyebrow: { color: '#3879B9', fontWeight: '900', fontSize: 10, letterSpacing: 1.2 },
  reviewTitle: { color: NAVY, fontWeight: '900', fontSize: 19, marginTop: 12 },
  meaning: { color: '#215A8C', fontWeight: '900', fontSize: 25, marginTop: 17, marginBottom: 20 },
  revealButton: { backgroundColor: '#1D64AC', borderRadius: 14, padding: 15, alignItems: 'center' },
  revealText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  answerPanel: { backgroundColor: '#FFFFFF', borderColor: '#D4E5F6', borderWidth: 1, borderRadius: 15, padding: 14 },
  answerEyebrow: { color: '#7492AC', fontWeight: '900', fontSize: 10, letterSpacing: 1 },
  answer: { color: NAVY, fontWeight: '900', fontSize: 24, marginTop: 7 },
  reviewTip: { marginVertical: 14, fontSize: 12, color: '#6D85A0' },
  reviewActions: { flexDirection: 'row', gap: 9 },
  reviewAction: { flex: 1, paddingVertical: 15, borderRadius: 13, alignItems: 'center' },
  didNotRemember: { backgroundColor: '#F6E4E8' },
  didNotRememberText: { color: '#A75363', fontWeight: '900' },
  remembered: { backgroundColor: '#127B6A' },
  rememberedText: { color: '#FFFFFF', fontWeight: '900' },
  cancel: { alignItems: 'center', marginTop: 13 },
  cancelText: { color: '#577D9D', fontWeight: '800', fontSize: 12 },
  notice: { color: '#266CA7', marginTop: 12, fontWeight: '700', fontSize: 12 },
  footnote: { color: '#8DA0B3', lineHeight: 17, marginTop: 20, fontSize: 10 },
});
