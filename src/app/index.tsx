import { router } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Page } from '../components/Page';
import { ActionButton } from '../components/ActionButton';
import { ProgressBar } from '../components/ProgressBar';
import { colors, sizes } from '../constants/theme';
import { LESSONS } from '../features/learning/data';
import { useCourses } from '../features/courses/CourseProvider';
import { canStartLesson } from '../features/progress/logic';
import { useProgress } from '../features/progress/ProgressProvider';
const ids = LESSONS.map(x => x.id);
export default function Home() {
  const { progress, ready } = useProgress();
  const { catalog } = useCourses();
  const completed = LESSONS.filter(l=>progress.completedLessonIds.includes(l.id)).length;
  return <Page><ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
    <View style={styles.top}><View><Text style={styles.brand}>lunivo<Text style={styles.dot}>.</Text></Text><Text style={styles.tag}>Seu italiano começa aqui</Text></View>
      <Pressable accessibilityRole="button" accessibilityLabel="Abrir meu progresso" onPress={() => router.push('/profile')} style={styles.avatar}><Text style={styles.avatarText}>★</Text></Pressable>
    </View>
    <View style={styles.hero}><Text style={styles.kicker}>CURSO • ITALIANO A1</Text>
      <Text style={styles.heroTitle}>Uma palavra de cada vez.</Text><Text style={styles.heroText}>Lições curtas, progresso real. Aprenda no seu ritmo.</Text>
      <View style={styles.heroBottom}><Text style={styles.xp}>✦  {progress.totalXp} XP</Text><Text style={styles.heroMeta}>{completed}/{LESSONS.length} lições iniciais</Text></View>
      <ProgressBar value={completed / LESSONS.length} />
    </View>
    <Text style={styles.sectionLabel}>UNIDADE 01 • INCLUÍDA NO APLICATIVO</Text><Text style={styles.sectionTitle}>Primeiros passos</Text>
    {!ready ? <ActivityIndicator color={colors.primary} style={{ marginTop: 28 }} /> : LESSONS.map((lesson, i) => {
      const unlocked = canStartLesson(lesson.id, ids, progress);
      const done = progress.completedLessonIds.includes(lesson.id);
      return <Pressable key={lesson.id} accessibilityRole="button" accessibilityState={{ disabled: !unlocked }}
        accessibilityLabel={`${lesson.title}, ${done ? 'concluída' : unlocked ? 'disponível' : 'bloqueada'}`}
        disabled={!unlocked} onPress={() => router.push({ pathname: '/lesson/[lessonId]', params: { lessonId: lesson.id } })}
        style={({ pressed }) => [styles.lessonCard, !unlocked && styles.locked, pressed && { opacity: .75 }]}>
        <View style={[styles.lessonBadge, done ? styles.done : unlocked ? styles.active : styles.inactive]}>
          <Text style={styles.badgeText}>{done ? '✓' : unlocked ? String(i + 1) : '●'}</Text>
        </View><View style={{ flex: 1 }}><Text style={styles.lessonTitle}>{lesson.title}</Text><Text style={styles.lessonSub}>{lesson.subtitle}</Text><Text style={styles.exerciseCount}>{lesson.exercises.length} exercícios</Text></View>
        <Text style={styles.chevron}>{done ? '↻' : unlocked ? '›' : '—'}</Text>
      </Pressable>;
    })}
    <Pressable accessibilityRole="button" onPress={()=>router.push('/courses')} style={styles.cloudCard}>
      <View style={{flex:1}}><Text style={styles.cloudTitle}>☁  Explorar outras unidades</Text>
        <Text style={styles.cloudSub}>{catalog.units.length} unidade(s) remota(s) · Download offline opcional</Text></View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
    <View style={styles.foot}><ActionButton title="Ver meu progresso" secondary onPress={() => router.push('/profile')} /></View>
    <Text style={styles.footer}>Primeiros passos disponíveis offline · novas unidades pela nuvem</Text>
  </ScrollView></Page>;
}
const styles=StyleSheet.create({
  content:{padding:sizes.page,paddingBottom:36},top:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:25},
  brand:{fontSize:30,fontWeight:'900',letterSpacing:-1.8,color:colors.ink},dot:{color:colors.primary},tag:{color:colors.muted,fontSize:13,marginTop:2},
  avatar:{width:46,height:46,borderRadius:23,backgroundColor:colors.primarySoft,alignItems:'center',justifyContent:'center'},avatarText:{fontSize:23,color:colors.primary},
  hero:{backgroundColor:colors.ink,borderRadius:25,padding:24,marginBottom:30},kicker:{color:'#93C5FD',fontWeight:'800',letterSpacing:1.3,fontSize:11},
  heroTitle:{color:'#FFFFFF',fontSize:29,lineHeight:35,fontWeight:'900',letterSpacing:-.6,marginTop:13,maxWidth:280},heroText:{color:'#C9D6E6',marginTop:10,fontSize:15,lineHeight:23},
  heroBottom:{flexDirection:'row',justifyContent:'space-between',marginTop:25,marginBottom:14},xp:{color:'#FFFFFF',fontWeight:'800'},heroMeta:{color:'#C9D6E6',fontSize:13},
  sectionLabel:{fontSize:11,color:colors.primary,fontWeight:'900',letterSpacing:1.4},sectionTitle:{fontSize:24,fontWeight:'900',color:colors.ink,marginTop:5,marginBottom:17},
  lessonCard:{backgroundColor:colors.surface,padding:16,borderRadius:19,borderWidth:1,borderColor:colors.line,marginBottom:11,flexDirection:'row',gap:13,alignItems:'center'},locked:{opacity:.50},
  lessonBadge:{width:51,height:51,borderRadius:17,alignItems:'center',justifyContent:'center'},done:{backgroundColor:colors.green},active:{backgroundColor:colors.primary},inactive:{backgroundColor:colors.disabled},
  badgeText:{color:'#FFFFFF',fontWeight:'900',fontSize:20},lessonTitle:{fontWeight:'800',fontSize:16,color:colors.ink},lessonSub:{fontSize:13,color:colors.muted,marginTop:3},
  exerciseCount:{fontSize:11,color:colors.primary,marginTop:8,fontWeight:'800'},chevron:{fontSize:26,color:colors.muted},foot:{marginTop:12},footer:{color:colors.muted,fontSize:12,textAlign:'center',marginTop:23},
  cloudCard:{padding:19,marginTop:11,borderRadius:19,backgroundColor:colors.primarySoft,flexDirection:'row',gap:10,alignItems:'center'},
  cloudTitle:{color:colors.primary,fontWeight:'900',fontSize:17},cloudSub:{color:colors.muted,fontSize:12,marginTop:7},
});
