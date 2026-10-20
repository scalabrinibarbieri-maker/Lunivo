import {router} from 'expo-router';
import {useState} from 'react';
import {ActivityIndicator,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {ActionButton} from '../components/ActionButton';
import {Page} from '../components/Page';
import {colors,sizes} from '../constants/theme';
import {useCourses} from '../features/courses/CourseProvider';
import {useProgress} from '../features/progress/ProgressProvider';
import {canStartLesson} from '../features/progress/logic';

export default function Courses(){
  const {catalog,ready,refreshing,refresh,downloaded,download,remove,loadUnit,lessonIds}=useCourses();
  const {progress}=useProgress();
  const [busy,setBusy]=useState<string|null>(null);
  const [notice,setNotice]=useState('');
  const task=async(id:string,fn:()=>Promise<void>)=>{
    if(busy)return;setBusy(id);setNotice('');
    try{await fn();}catch(err){setNotice(err instanceof Error&&err.message==='AUDIO_OBRIGATORIO_NAO_PUBLICADO'
      ?'Essa unidade ainda não tem todos os áudios de escuta publicados.'
      :'Não foi possível concluir. Confira a conexão e tente novamente.');}
    finally{setBusy(null);}
  };
  return <Page><ScrollView contentContainerStyle={styles.page}>
    <Pressable accessibilityRole="button" onPress={()=>router.back()} style={styles.back}><Text style={styles.backText}>‹  Voltar</Text></Pressable>
    <Text style={styles.eyebrow}>LUNIVO • CONTEÚDO</Text>
    <Text style={styles.title}>Unidades na nuvem</Text>
    <Text style={styles.sub}>Estude online sem ocupar espaço. Baixe somente as unidades que quiser manter disponíveis offline.</Text>
    <View style={styles.intro}><Text style={styles.bold}>As três lições de primeiros passos já estão no aplicativo.</Text>
      <Text style={styles.description}>Não precisam de download. Aqui aparecem apenas as próximas unidades, conforme forem publicadas.</Text></View>
    {(!ready||refreshing)&&<ActivityIndicator color={colors.primary} style={{marginTop:20}}/>}
    {catalog.units.length===0&&ready?<View style={styles.empty}><Text style={styles.emptyTitle}>Novas unidades em preparação</Text>
      <Text style={styles.description}>Ainda não publicamos uma unidade remota. Os primeiros passos continuam disponíveis normalmente.</Text></View>:null}
    {catalog.units.map(u=>{
      const offline=downloaded(u);
      return <View key={`${u.id}-${u.revision}`} style={styles.unit}>
        <View style={styles.unitTop}><View style={{flex:1}}><Text style={styles.eyebrow}>{u.language.toUpperCase()} • {u.level} • UNIDADE {u.order}</Text>
          <Text style={styles.unitTitle}>{u.title}</Text><Text style={styles.description}>{u.subtitle}</Text></View>
          <View style={[styles.status,offline&&styles.offline]}><Text style={styles.statusText}>{offline?'✓ Offline':'☁ Online'}</Text></View></View>
        <View style={styles.actions}><Pressable accessibilityRole="button" disabled={Boolean(busy)} onPress={()=>void task('download-'+u.id,()=>download(u))}
          style={[styles.btn,styles.primary,busy&&styles.dim]}><Text style={styles.primaryText}>{busy==='download-'+u.id?'Baixando...':offline?'Baixar novamente':'↓ Baixar unidade'}</Text></Pressable>
          {offline&&<Pressable accessibilityRole="button" disabled={Boolean(busy)} onPress={()=>void task('remove-'+u.id,()=>remove(u))} style={[styles.btn,styles.secondary]}>
            <Text style={styles.secondaryText}>Remover download</Text></Pressable>}
        </View>
        {u.lessons.map(item=>{
          const done=progress.completedLessonIds.includes(item.id);
          const unlocked=canStartLesson(item.id,lessonIds,progress);
          return <Pressable key={item.id} disabled={!unlocked||Boolean(busy)} onPress={()=>void task('open-'+item.id,async()=>{
            await loadUnit(u);
            router.push({pathname:'/lesson/[lessonId]',params:{lessonId:item.id}});
          })} accessibilityRole="button" accessibilityState={{disabled:!unlocked}}
            style={[styles.lesson,!unlocked&&styles.dim]}><Text style={styles.lessonIcon}>{done?'✓':unlocked?'▶':'🔒'}</Text>
            <View style={{flex:1}}><Text style={styles.lessonTitle}>{item.title}</Text>
              <Text style={styles.description}>{item.exerciseCount} exercícios · {offline?'Disponível offline':'Requer internet na primeira abertura'}</Text></View>
            <Text style={styles.chevron}>›</Text></Pressable>;
        })}
      </View>;
    })}
    {!!notice&&<Text accessibilityLiveRegion="polite" style={styles.notice}>{notice}</Text>}
    <View style={{marginTop:20}}><ActionButton title={refreshing?'Atualizando catálogo...':'Atualizar unidades'} secondary disabled={refreshing||Boolean(busy)} onPress={()=>{void refresh();}}/></View>
    <Text style={styles.footer}>Os downloads podem ser removidos sem apagar suas lições concluídas. Áudios compartilhados permanecem no armazenamento local.</Text>
  </ScrollView></Page>;
}
const styles=StyleSheet.create({
  page:{padding:sizes.page,paddingBottom:52},back:{paddingVertical:8,marginBottom:15},backText:{color:colors.primary,fontSize:16,fontWeight:'800'},
  eyebrow:{fontSize:11,color:colors.primary,fontWeight:'900',letterSpacing:1.1},title:{fontWeight:'900',fontSize:30,color:colors.ink,marginTop:9},
  sub:{fontSize:15,color:colors.muted,lineHeight:23,marginTop:10,marginBottom:20},intro:{padding:18,backgroundColor:colors.primarySoft,borderRadius:18},
  bold:{color:colors.ink,fontSize:15,fontWeight:'800'},description:{fontSize:13,color:colors.muted,lineHeight:20,marginTop:5},
  empty:{borderRadius:20,padding:25,backgroundColor:colors.surface,marginTop:23,borderWidth:1,borderColor:colors.line},
  emptyTitle:{fontWeight:'800',fontSize:18,color:colors.ink},unit:{borderRadius:20,padding:17,backgroundColor:colors.surface,marginTop:18,borderWidth:1,borderColor:colors.line},
  unitTop:{flexDirection:'row',gap:10,alignItems:'flex-start'},unitTitle:{fontWeight:'900',fontSize:22,color:colors.ink,marginTop:6},
  status:{paddingHorizontal:9,paddingVertical:7,backgroundColor:colors.primarySoft,borderRadius:11},offline:{backgroundColor:colors.greenSoft},
  statusText:{fontSize:11,fontWeight:'800',color:colors.primary},actions:{flexDirection:'row',gap:8,flexWrap:'wrap',marginTop:16,marginBottom:12},
  btn:{paddingHorizontal:14,paddingVertical:11,borderRadius:12,alignItems:'center'},primary:{backgroundColor:colors.primary},primaryText:{color:'#FFF',fontWeight:'800',fontSize:13},
  secondary:{backgroundColor:colors.primarySoft},secondaryText:{color:colors.primary,fontWeight:'800',fontSize:13},
  lesson:{flexDirection:'row',gap:12,alignItems:'center',borderTopWidth:1,borderTopColor:colors.line,paddingVertical:14},
  lessonIcon:{width:28,color:colors.primary,fontWeight:'900'},lessonTitle:{fontWeight:'800',fontSize:15,color:colors.ink},chevron:{fontSize:24,color:colors.muted},
  dim:{opacity:.5},notice:{marginTop:15,color:colors.red,fontSize:13,lineHeight:20},footer:{marginTop:22,color:colors.muted,fontSize:12,lineHeight:18},
});
