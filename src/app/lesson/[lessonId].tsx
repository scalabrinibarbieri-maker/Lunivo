import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ActionButton } from '../../components/ActionButton';
import { Page } from '../../components/Page';
import { ProgressBar } from '../../components/ProgressBar';
import { colors, sizes } from '../../constants/theme';
import { ExercisePronunciation } from '../../features/audio/ExercisePronunciation';
import { LESSONS } from '../../features/learning/data';
import { correctAnswerLabel, gradeExercise } from '../../features/learning/engine';
import { canStartLesson } from '../../features/progress/logic';
import { useProgress } from '../../features/progress/ProgressProvider';
const ids = LESSONS.map(l => l.id);
export default function LessonScreen() {
  const { lessonId } = useLocalSearchParams<{ lessonId: string }>();
  const { progress, ready, completeLesson } = useProgress();
  const lesson = useMemo(() => LESSONS.find(x => x.id === lessonId), [lessonId]);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [checked, setChecked] = useState(false);
  const [correct, setCorrect] = useState(false);
  const [count, setCount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  if (!ready) return <Page><ActivityIndicator style={{ marginTop: 80 }} color={colors.primary} /></Page>;
  if (!lesson || !canStartLesson(lesson.id, ids, progress)) return <Page><View style={styles.missing}><Text style={styles.title}>Lição indisponível</Text><ActionButton title="Voltar ao início" onPress={() => router.replace('/')} /></View></Page>;
  const question = lesson.exercises[index];
  if (!question) return null;
  const verify = () => { if (checked || !answer.trim()) return; const right = gradeExercise(question, answer); setCorrect(right); setChecked(true); if (right) setCount(c => c + 1); };
  const next = async () => {
    if (submitting) return;
    if (index < lesson.exercises.length - 1) { setIndex(v => v + 1); setAnswer(''); setChecked(false); setCorrect(false); return; }
    setSubmitting(true);
    try {
      const xp = await completeLesson(lesson.id, count, lesson.exercises.length);
      router.replace({ pathname:'/result', params: { lessonId: lesson.id, correct: String(count), xp: String(xp) } });
    } catch { Alert.alert('Não foi possível salvar', 'Tente novamente para preservar seu progresso.'); setSubmitting(false); }
  };
  return <Page><KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex:1 }}>
    <View style={styles.top}><Pressable accessibilityLabel="Sair da lição" accessibilityRole="button" onPress={() => router.back()} style={styles.close}><Text style={styles.cross}>×</Text></Pressable>
      <ProgressBar value={index / lesson.exercises.length} /><Text style={styles.counter}>{index + 1}/{lesson.exercises.length}</Text></View>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
      <Text style={styles.label}>{question.instruction.toUpperCase()}</Text><Text style={styles.prompt}>{question.prompt}</Text>
      <Text style={styles.helper}>{question.type === 'choice' ? 'Selecione a alternativa correta' : 'Digite sua resposta abaixo'}</Text>
      {/* A associação de áudio é por ID do exercício, independente do texto e do provedor de voz. */}
      <ExercisePronunciation key={question.id} exerciseId={question.id} />
      {question.type === 'choice' ? <View style={styles.choices}>
        {question.options.map((option, i) => <Pressable key={option.id} accessibilityRole="button" accessibilityState={{ selected: answer === option.id, disabled: checked }}
          disabled={checked} onPress={() => setAnswer(option.id)} style={[styles.choice, answer === option.id && styles.selected]}>
            <View style={[styles.optionNo, answer === option.id && styles.optionNoActive]}><Text style={[styles.optionNoText, answer === option.id && { color:'#FFFFFF' }]}>{i + 1}</Text></View>
            <Text style={styles.optionText}>{option.label}</Text>
          </Pressable>)}
      </View> : <TextInput accessibilityLabel="Sua resposta" placeholder="Escreva aqui..." placeholderTextColor={colors.disabled}
        value={answer} onChangeText={setAnswer} editable={!checked} autoCapitalize="sentences" autoCorrect={false} returnKeyType="done"
        style={styles.input} />}
      {checked && <View accessibilityLiveRegion="polite" style={[styles.feedback, correct ? styles.good : styles.bad]}>
        <Text style={[styles.feedbackTitle, { color: correct ? colors.green : colors.red }]}>{correct ? 'Muito bem! ✓' : `Resposta: ${correctAnswerLabel(question)}`}</Text>
        <Text style={styles.feedbackBody}>{question.explanation}</Text></View>}
    </ScrollView>
    <View style={styles.bottom}><ActionButton title={!checked ? 'Verificar resposta' : submitting ? 'Salvando...' : index === lesson.exercises.length - 1 ? 'Concluir lição' : 'Continuar'}
      disabled={submitting || (!checked && !answer.trim())} onPress={checked ? () => { void next(); } : verify} /></View>
  </KeyboardAvoidingView></Page>;
}
const styles = StyleSheet.create({
  missing: { flex: 1, justifyContent: 'center', gap: 18, paddingHorizontal: sizes.page },
  title: { fontSize: 27, fontWeight: '900', color: colors.ink },
  top:{paddingHorizontal:sizes.page,paddingVertical:14,flexDirection:'row',alignItems:'center',gap:14},close:{width:30,height:35,justifyContent:'center'},cross:{fontSize:30,fontWeight:'300',color:colors.muted},counter:{fontWeight:'700',color:colors.muted,fontSize:13},
  scroll:{paddingHorizontal:sizes.page,paddingTop:42,paddingBottom:28,flexGrow:1},label:{fontSize:12,fontWeight:'900',letterSpacing:1.5,color:colors.primary},
  prompt:{fontSize:31,fontWeight:'900',color:colors.ink,letterSpacing:-.7,marginTop:15},helper:{color:colors.muted,fontSize:15,marginTop:11},choices:{marginTop:35,gap:12},
  choice:{borderRadius:17,backgroundColor:'#FFFFFF',borderWidth:2,borderColor:colors.line,padding:15,flexDirection:'row',gap:15,alignItems:'center',minHeight:70},selected:{borderColor:colors.primary,backgroundColor:colors.primarySoft},
  optionNo:{width:33,height:33,borderRadius:11,backgroundColor:colors.background,alignItems:'center',justifyContent:'center'},optionNoActive:{backgroundColor:colors.primary},optionNoText:{fontWeight:'800',color:colors.muted},
  optionText:{fontSize:17,color:colors.ink,fontWeight:'700',flex:1},input:{marginTop:35,borderRadius:17,backgroundColor:'#FFFFFF',padding:18,minHeight:64,borderColor:colors.line,borderWidth:2,fontSize:20,color:colors.ink},
  feedback:{marginTop:28,padding:18,borderRadius:16},good:{backgroundColor:colors.greenSoft},bad:{backgroundColor:colors.redSoft},feedbackTitle:{fontWeight:'900',fontSize:17},feedbackBody:{color:colors.ink,fontSize:14,lineHeight:21,marginTop:8},
  bottom:{paddingHorizontal:sizes.page,paddingTop:14,paddingBottom:5,borderTopWidth:1,borderTopColor:colors.line,backgroundColor:colors.background}
});
