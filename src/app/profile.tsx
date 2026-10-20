import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Page } from '../components/Page';
import { ActionButton } from '../components/ActionButton';
import { colors, sizes } from '../constants/theme';
import { LESSONS } from '../features/learning/data';
import { messageForAuthError, useAuth } from '../features/auth/AuthProvider';
import { useProgress } from '../features/progress/ProgressProvider';

export default function Profile() {
  const { progress, ready } = useProgress();
  const { user, ready: authReady, logOut, resendVerification } = useAuth();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  const runAction = async (action: () => Promise<void>, successMessage: string) => {
    if (busy) return;
    setBusy(true); setNotice('');
    try { await action(); setNotice(successMessage); }
    catch (e) { setNotice(messageForAuthError(e)); }
    finally { setBusy(false); }
  };

  if (!ready || !authReady) return <Page><ActivityIndicator color={colors.primary} style={{ marginTop: 90 }} /></Page>;

  return <Page><ScrollView contentContainerStyle={styles.content}>
    <Text style={styles.kicker}>SEU APRENDIZADO</Text>
    <Text style={styles.title}>Meu progresso</Text>
    <View style={styles.bigCard}>
      <Text style={styles.star}>✦</Text><Text style={styles.xp}>{progress.totalXp}</Text>
      <Text style={styles.xpLabel}>PONTOS DE EXPERIÊNCIA</Text>
    </View>
    <View style={styles.row}>
      <View style={styles.info}><Text style={styles.value}>{progress.completedLessonIds.length}</Text><Text style={styles.meta}>Lições concluídas</Text></View>
      <View style={styles.info}><Text style={styles.value}>{LESSONS.length}</Text><Text style={styles.meta}>Lições disponíveis</Text></View>
    </View>

    <View style={styles.account}>
      <Text style={styles.kicker}>MINHA CONTA</Text>
      <Text style={styles.accountTitle}>{user ? 'Conta conectada' : 'Aprendendo como visitante'}</Text>
      {user ? <>
        <Text style={styles.email}>{user.email ?? 'Conta Firebase'}</Text>
        <Text style={styles.description}>
          {user.emailVerified ? 'E-mail confirmado.' : 'E-mail ainda nao confirmado. Verifique sua caixa de entrada.'}
        </Text>
        {!user.emailVerified && <View style={styles.space}>
          <ActionButton title="Reenviar confirmacao" secondary disabled={busy} onPress={() => {
            void runAction(resendVerification, 'Enviamos outra confirmacao ao seu e-mail.');
          }} />
        </View>}
        <View style={styles.space}>
          <ActionButton title={busy ? 'Aguarde...' : 'Sair da conta'} secondary disabled={busy} onPress={() => {
            void runAction(logOut, 'Voce saiu da conta. O progresso desta conta ficou preservado no celular.');
          }} />
        </View>
      </> : <>
        <Text style={styles.description}>Crie uma conta para preparar seu progresso para a sincronizacao entre aparelhos.</Text>
        <View style={styles.space}><ActionButton title="Entrar ou criar conta" onPress={() => router.push('/auth')} /></View>
      </>}
      {!!notice && <Text style={styles.notice}>{notice}</Text>}
    </View>

    <View style={styles.note}>
      <Text style={styles.noteTitle}>{user ? 'Progresso da conta salvo localmente' : 'Seu progresso de visitante esta preservado'}</Text>
      <Text style={styles.noteText}>{user
        ? 'Nesta etapa, o historico desta conta fica separado no aparelho. A sincronizacao pelo Cloudflare D1 sera ativada e testada na proxima etapa; seus pontos XP ainda nao sao sincronizados.'
        : 'Suas licoes continuam no aparelho mesmo que voce crie uma conta. Nao transferimos o historico de visitante automaticamente para evitar mistura de contas.'}</Text>
    </View>
    <ActionButton title="Voltar às lições" onPress={() => router.replace('/')} />
  </ScrollView></Page>;
}

const styles = StyleSheet.create({
  content:{padding:sizes.page,paddingTop:30,paddingBottom:45},
  kicker:{fontSize:12,fontWeight:'900',letterSpacing:1.4,color:colors.primary},
  title:{fontSize:32,color:colors.ink,fontWeight:'900',marginTop:8,marginBottom:26},
  bigCard:{backgroundColor:colors.ink,borderRadius:24,padding:30,alignItems:'center'},
  star:{fontSize:42,color:'#FFD073'},xp:{fontSize:54,fontWeight:'900',color:'#FFFFFF',marginTop:4},
  xpLabel:{fontSize:12,fontWeight:'900',letterSpacing:1,color:'#B7C8DA'},
  row:{flexDirection:'row',gap:13,marginTop:15},info:{flex:1,backgroundColor:'#FFFFFF',borderRadius:18,padding:20,borderWidth:1,borderColor:colors.line},
  value:{fontSize:30,fontWeight:'900',color:colors.ink},meta:{color:colors.muted,fontSize:12,marginTop:5},
  account:{backgroundColor:colors.surface,borderRadius:19,padding:20,marginTop:24,borderWidth:1,borderColor:colors.line},
  accountTitle:{fontSize:20,fontWeight:'900',color:colors.ink,marginTop:9},
  email:{fontSize:14,color:colors.primary,fontWeight:'700',marginTop:9},
  description:{fontSize:13,lineHeight:21,color:colors.muted,marginTop:9},space:{marginTop:16},
  notice:{fontSize:13,lineHeight:20,color:colors.primary,fontWeight:'700',marginTop:15},
  note:{backgroundColor:colors.primarySoft,borderRadius:18,padding:18,marginTop:20,marginBottom:25},
  noteTitle:{fontSize:15,fontWeight:'900',color:colors.ink},noteText:{color:colors.muted,fontSize:13,lineHeight:21,marginTop:8},
});
