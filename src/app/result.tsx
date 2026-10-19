import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Page } from '../components/Page';
import { ActionButton } from '../components/ActionButton';
import { colors, sizes } from '../constants/theme';
import { LESSONS } from '../features/learning/data';
export default function Result() {
  const { lessonId, correct, xp } = useLocalSearchParams<{ lessonId: string; correct: string; xp: string }>();
  const lesson = LESSONS.find(l => l.id === lessonId);
  if (!lesson) return <Page><View style={styles.layout}><Text style={styles.title}>Resultado indisponível</Text><ActionButton title="Voltar" onPress={() => router.replace('/')} /></View></Page>;
  const correctCount = Math.min(lesson.exercises.length, Math.max(0, Number(correct) || 0));
  const earned = Math.max(0, Number(xp) || 0);
  return <Page><View style={styles.layout}>
    <View style={styles.medal}><Text style={{fontSize:64}}>✦</Text></View>
    <Text style={styles.kicker}>LIÇÃO CONCLUÍDA</Text><Text style={styles.title}>Bravissimo!</Text>
    <Text style={styles.subtitle}>Você terminou “{lesson.title}”. Continue avançando!</Text>
    <View style={styles.stats}><View style={styles.stat}><Text style={styles.number}>{correctCount}/{lesson.exercises.length}</Text><Text style={styles.legend}>Respostas certas</Text></View>
      <View style={styles.stat}><Text style={styles.number}>+{earned}</Text><Text style={styles.legend}>XP conquistados</Text></View></View>
    {earned === 0 && <Text style={styles.note}>Ao repetir uma lição, o XP não é contado novamente.</Text>}
    <View style={styles.bottom}><ActionButton title="Continuar aprendendo" onPress={() => router.replace('/')} /></View>
  </View></Page>;
}
const styles = StyleSheet.create({layout:{flex:1,paddingHorizontal:sizes.page,alignItems:'center',justifyContent:'center'},medal:{width:136,height:136,borderRadius:68,backgroundColor:colors.orangeSoft,alignItems:'center',justifyContent:'center',marginBottom:30},
 kicker:{color:colors.primary,letterSpacing:1.5,fontSize:12,fontWeight:'900'},title:{fontSize:38,fontWeight:'900',color:colors.ink,marginTop:10},subtitle:{color:colors.muted,fontSize:16,lineHeight:24,textAlign:'center',marginTop:12,maxWidth:300},
 stats:{flexDirection:'row',gap:12,marginTop:30,width:'100%'},stat:{flex:1,backgroundColor:'#FFFFFF',padding:17,borderRadius:17,borderWidth:1,borderColor:colors.line,alignItems:'center'},number:{fontSize:23,fontWeight:'900',color:colors.primary},legend:{fontSize:12,color:colors.muted,marginTop:8,textAlign:'center'},note:{fontSize:12,color:colors.muted,textAlign:'center',marginTop:18},bottom:{width:'100%',marginTop:42}});
