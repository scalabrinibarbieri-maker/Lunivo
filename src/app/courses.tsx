import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ActionButton } from '../components/ActionButton';
import { Page } from '../components/Page';
import { colors, sizes } from '../constants/theme';
import { useCourses } from '../features/courses/CourseProvider';
import { useProgress } from '../features/progress/ProgressProvider';
import { canStartLesson } from '../features/progress/logic';

const NAVY='#071625';
export default function Courses() {
  const { catalog, ready, refreshing, refresh, downloaded, download, remove, loadUnit, lessonIds } = useCourses();
  const { progress } = useProgress();
  const [busy, setBusy] = useState<string|null>(null);
  const [notice, setNotice] = useState('');
  const task = async (id:string, fn:()=>Promise<void>) => {
    if(busy) return; setBusy(id); setNotice('');
    try { await fn(); }
    catch(err) {
      setNotice(err instanceof Error && err.message === 'AUDIO_OBRIGATORIO_NAO_PUBLICADO'
        ? 'Esta unidade ainda não tem todos os áudios de escuta publicados.'
        : err instanceof Error && /^IMAGEM/.test(err.message)
          ? 'Uma imagem desta unidade não pôde ser baixada. Nada foi marcado como offline. Tente novamente conectado à internet.'
          : 'Não foi possível concluir. Confira a conexão e tente novamente.');
    } finally { setBusy(null); }
  };
  return <Page><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.page}>
    <View style={styles.header}>
      <View pointerEvents="none" style={styles.orbit} />
      <Pressable accessibilityRole="button" accessibilityLabel="Voltar ao aprendizado" onPress={()=>router.replace('/')} style={styles.back}>
        <Text style={styles.backText}>‹</Text>
      </Pressable>
      <Text style={styles.eyebrow}>LUNIVO · CONTEÚDO</Text>
      <Text style={styles.title}>Seu próximo universo de palavras.</Text>
      <Text style={styles.sub}>Explore as unidades do curso. Baixe o conteúdo para aprender mesmo sem conexão.</Text>
    </View>
    <View style={styles.content}>
      <View style={styles.intro}>
        <View style={styles.introGlyph}><Text style={styles.introGlyphText}>01</Text></View>
        <View style={{flex:1}}><Text style={styles.bold}>Primeiros passos já disponíveis</Text>
          <Text style={styles.description}>As três lições iniciais já fazem parte do aplicativo e funcionam offline.</Text></View>
      </View>
      {( !ready || refreshing ) && <ActivityIndicator color={colors.primary} style={{marginTop:20}} />}
      {catalog.units.length===0 && ready ? <View style={styles.empty}>
        <Text style={styles.emptyEyebrow}>EM PREPARAÇÃO</Text>
        <Text style={styles.emptyTitle}>Mais unidades estão a caminho.</Text>
        <Text style={styles.description}>Assim que forem publicadas, elas aparecerão aqui para estudar online ou baixar integralmente.</Text>
      </View> : null}
      {catalog.units.map(u=>{
        const offline=downloaded(u);
        return <View key={`${u.id}-${u.revision}`} style={styles.unit}>
          <View style={styles.unitTop}>
            <View style={styles.unitNum}><Text style={styles.unitNumText}>{String(u.order).padStart(2,'0')}</Text></View>
            <View style={{flex:1}}><Text style={styles.unitEyebrow}>{u.language.toUpperCase()} · {u.level} · UNIDADE {u.order}</Text>
              <Text style={styles.unitTitle}>{u.title}</Text><Text style={styles.description}>{u.subtitle}</Text></View>
          </View>
          <View style={[styles.status,offline&&styles.offline]}>
            <View style={[styles.statusDot,offline&&styles.statusDotOffline]}/>
            <Text style={styles.statusText}>{offline?'Conteúdo salvo para estudar offline':'Disponível online'}</Text>
          </View>
          <View style={styles.actions}>
            <Pressable accessibilityRole="button" disabled={Boolean(busy)} onPress={()=>void task('download-'+u.id,()=>download(u))}
              style={({pressed})=>[styles.btn,styles.primary,busy&&styles.dim,pressed&&styles.pressed]}>
              <Text style={styles.primaryText}>{busy==='download-'+u.id?'Baixando...':offline?'Baixar novamente':'Baixar unidade  ↓'}</Text>
            </Pressable>
            {offline&&<Pressable accessibilityRole="button" disabled={Boolean(busy)} onPress={()=>void task('remove-'+u.id,()=>remove(u))}
              style={({pressed})=>[styles.btn,styles.secondary,pressed&&styles.pressed]}>
              <Text style={styles.secondaryText}>Remover download</Text>
            </Pressable>}
          </View>
          {u.lessons.map(item=>{
            const done=progress.completedLessonIds.includes(item.id);
            const unlocked=canStartLesson(item.id,lessonIds,progress);
            return <Pressable key={item.id} disabled={!unlocked||Boolean(busy)} onPress={()=>void task('open-'+item.id,async()=>{
              await loadUnit(u);
              router.push({pathname:'/lesson/[lessonId]',params:{lessonId:item.id}});
            })} accessibilityRole="button" accessibilityState={{disabled:!unlocked}}
              style={({pressed})=>[styles.lesson,!unlocked&&styles.dim,pressed&&styles.pressed]}>
              <View style={[styles.lessonIndicator,done&&styles.lessonDone]}>
                <Text style={[styles.lessonIcon,done&&styles.lessonDoneIcon]}>{done?'✓':unlocked?'›':'–'}</Text>
              </View>
              <View style={{flex:1}}><Text style={styles.lessonTitle}>{item.title}</Text>
                <Text style={styles.description}>{item.exerciseCount} etapas · {offline?'Offline':'Primeira abertura requer internet'}</Text></View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>;
          })}
        </View>;
      })}
      {!!notice&&<Text accessibilityLiveRegion="polite" style={styles.notice}>{notice}</Text>}
      <View style={styles.refresh}><ActionButton title={refreshing?'Atualizando catálogo...':'Atualizar unidades'} secondary disabled={refreshing||Boolean(busy)} onPress={()=>{void refresh();}}/></View>
      <Text style={styles.footer}>Os downloads incluem as gravações e imagens explicativas disponíveis na unidade. Remover um download não apaga seu progresso nem seu XP.</Text>
    </View>
  </ScrollView></Page>;
}
const styles=StyleSheet.create({
  page:{paddingBottom:35},header:{backgroundColor:NAVY,paddingHorizontal:sizes.page,paddingTop:15,paddingBottom:35,overflow:'hidden'},
  orbit:{position:'absolute',right:-146,top:-150,width:290,height:290,borderRadius:145,backgroundColor:'#103957',opacity:0.65},
  back:{width:40,height:40,borderRadius:14,backgroundColor:'#193B5B',borderWidth:1,borderColor:'#3A5A79',alignItems:'center',justifyContent:'center',marginBottom:26},
  backText:{color:'#E7F5FF',fontSize:30,marginTop:-6},eyebrow:{fontSize:10,color:'#F6C27E',fontWeight:'900',letterSpacing:1.8},
  title:{fontSize:31,color:'#FFFFFF',fontWeight:'900',lineHeight:37,letterSpacing:-0.8,marginTop:12},
  sub:{fontSize:14,color:'#AEC8E5',lineHeight:23,marginTop:12},content:{paddingHorizontal:sizes.page,paddingTop:24},
  intro:{padding:17,backgroundColor:'#E8F1FB',borderRadius:20,flexDirection:'row',gap:13,alignItems:'center'},
  introGlyph:{width:42,height:42,borderRadius:14,backgroundColor:'#FFFFFF',alignItems:'center',justifyContent:'center'},
  introGlyphText:{color:'#3477C4',fontWeight:'900',fontSize:19},bold:{color:NAVY,fontSize:15,fontWeight:'900'},
  description:{fontSize:12.5,color:'#788BA2',lineHeight:19,marginTop:5},
  empty:{borderRadius:22,padding:23,backgroundColor:'#FFFFFF',marginTop:23,borderWidth:1,borderColor:'#E0E8F2'},
  emptyEyebrow:{color:'#4279B4',fontSize:10,fontWeight:'900',letterSpacing:1.6},
  emptyTitle:{fontWeight:'900',fontSize:20,color:NAVY,marginTop:8},
  unit:{borderRadius:24,padding:18,backgroundColor:'#FFFFFF',marginTop:22,borderWidth:1,borderColor:'#DFE8F2'},
  unitTop:{flexDirection:'row',gap:13,alignItems:'flex-start'},
  unitNum:{width:52,height:52,borderRadius:17,backgroundColor:'#E7F2FF',alignItems:'center',justifyContent:'center'},
  unitNumText:{fontSize:22,fontWeight:'900',color:'#3474C8'},unitEyebrow:{fontSize:9,color:'#4D7EB9',fontWeight:'900',letterSpacing:1.2},
  unitTitle:{fontSize:20,fontWeight:'900',color:NAVY,marginTop:5},
  status:{flexDirection:'row',alignItems:'center',gap:8,padding:11,marginTop:16,backgroundColor:'#F0F5FC',borderRadius:13},
  offline:{backgroundColor:'#EAF8F2'},statusDot:{width:7,height:7,borderRadius:4,backgroundColor:'#7EAAD8'},
  statusDotOffline:{backgroundColor:'#29A77B'},statusText:{fontSize:11,fontWeight:'800',color:'#4C739C'},
  actions:{flexDirection:'row',gap:8,flexWrap:'wrap',marginTop:15,marginBottom:12},
  btn:{paddingHorizontal:14,paddingVertical:13,borderRadius:13,alignItems:'center'},primary:{backgroundColor:'#2169C8'},
  primaryText:{color:'#FFFFFF',fontWeight:'900',fontSize:13},secondary:{backgroundColor:'#EAF1FD'},
  secondaryText:{color:'#326DAC',fontWeight:'800',fontSize:13},
  lesson:{flexDirection:'row',gap:12,alignItems:'center',borderTopWidth:1,borderTopColor:'#EBF0F5',paddingVertical:14},
  lessonIndicator:{width:36,height:36,borderRadius:12,backgroundColor:'#EAF1FB',alignItems:'center',justifyContent:'center'},
  lessonDone:{backgroundColor:'#E5F7EF'},lessonIcon:{color:'#336AC3',fontWeight:'900',fontSize:21},
  lessonDoneIcon:{color:'#188760'},lessonTitle:{fontWeight:'900',fontSize:14,color:NAVY},
  chevron:{fontSize:24,color:'#9AADC2'},dim:{opacity:0.48},pressed:{opacity:0.75},
  notice:{marginTop:15,color:'#BA3D44',fontSize:13,lineHeight:20},refresh:{marginTop:22},
  footer:{marginTop:19,color:'#7E8EA2',fontSize:12,lineHeight:19},
});
