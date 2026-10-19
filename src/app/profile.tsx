import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Page } from '../components/Page';
import { ActionButton } from '../components/ActionButton';
import { colors, sizes } from '../constants/theme';
import { LESSONS } from '../features/learning/data';
import { useProgress } from '../features/progress/ProgressProvider';
export default function Profile() {
  const { progress } = useProgress();
  return <Page><ScrollView contentContainerStyle={styles.content}>
    <Text style={styles.kicker}>SEU APRENDIZADO</Text><Text style={styles.title}>Meu progresso</Text>
    <View style={styles.bigCard}><Text style={styles.star}>✦</Text><Text style={styles.xp}>{progress.totalXp}</Text><Text style={styles.xpLabel}>PONTOS DE EXPERIÊNCIA</Text></View>
    <View style={styles.row}><View style={styles.info}><Text style={styles.value}>{progress.completedLessonIds.length}</Text><Text style={styles.meta}>Lições concluídas</Text></View>
      <View style={styles.info}><Text style={styles.value}>{LESSONS.length}</Text><Text style={styles.meta}>Lições disponíveis</Text></View></View>
    <View style={styles.note}><Text style={styles.noteTitle}>Seu progresso está neste aparelho</Text><Text style={styles.noteText}>Nesta primeira versão, os dados são armazenados localmente. Cadastro e sincronização segura entrarão na próxima etapa.</Text></View>
    <ActionButton title="Voltar às lições" onPress={() => router.replace('/')} />
  </ScrollView></Page>;
}
const styles = StyleSheet.create({content:{padding:sizes.page,paddingTop:30},kicker:{fontSize:12,fontWeight:'900',letterSpacing:1.4,color:colors.primary},title:{fontSize:32,color:colors.ink,fontWeight:'900',marginTop:8,marginBottom:26},
 bigCard:{backgroundColor:colors.ink,borderRadius:24,padding:30,alignItems:'center'},star:{fontSize:42,color:'#FFD073'},xp:{fontSize:54,fontWeight:'900',color:'#FFFFFF',marginTop:4},xpLabel:{fontSize:12,fontWeight:'900',letterSpacing:1,color:'#B7C8DA'},
 row:{flexDirection:'row',gap:13,marginTop:15},info:{flex:1,backgroundColor:'#FFFFFF',borderRadius:18,padding:20,borderWidth:1,borderColor:colors.line},value:{fontSize:30,fontWeight:'900',color:colors.ink},meta:{color:colors.muted,fontSize:12,marginTop:5},
 note:{backgroundColor:colors.primarySoft,borderRadius:18,padding:18,marginTop:25,marginBottom:25},noteTitle:{fontSize:15,fontWeight:'900',color:colors.ink},noteText:{color:colors.muted,fontSize:13,lineHeight:21,marginTop:8}
});
