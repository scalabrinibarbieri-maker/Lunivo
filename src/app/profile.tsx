import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Page } from '../components/Page';
import { ActionButton } from '../components/ActionButton';
import { PremiumEmblem } from '../components/PremiumEmblem';
import { VocabularyPanel } from '../components/VocabularyPanel';
import { colors, sizes } from '../constants/theme';
import { LESSONS } from '../features/learning/data';
import { messageForAuthError, useAuth } from '../features/auth/AuthProvider';
import { useProgress } from '../features/progress/ProgressProvider';

export default function Profile() {
  const { progress, ready, syncStatus, syncNow, recordVocabulary } = useProgress();
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

  return <Page><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
    <View style={styles.topLine}>
      <Pressable accessibilityRole="button" accessibilityLabel="Voltar para Aprender" onPress={() => router.replace('/')} style={styles.back}>
        <Text style={styles.backText}>‹</Text>
      </Pressable>
      <Text style={styles.brandTitle}>Meu espaço</Text>
      <View style={{width:37}} />
    </View>
    <Text style={styles.kicker}>SEU APRENDIZADO</Text>
    <Text style={styles.title}>Sua evolução, em detalhes.</Text>
    <View style={styles.bigCard}>
      <View pointerEvents="none" style={styles.cardOrbit} />
      <PremiumEmblem kind="xp" size={68} />
      <Text style={styles.xp}>{progress.totalXp}</Text>
      <Text style={styles.xpLabel}>PONTOS DE EXPERIÊNCIA</Text>
      <Text style={styles.cardNote}>Cada lição é parte da sua jornada.</Text>
    </View>
    <View style={styles.row}>
      <View style={styles.info}><Text style={styles.value}>{progress.completedLessonIds.length}</Text><Text style={styles.meta}>Lições concluídas</Text></View>
      <View style={styles.info}><Text style={styles.value}>{LESSONS.length}</Text><Text style={styles.meta}>Lições iniciais</Text></View>
    </View>
    <VocabularyPanel memory={progress.vocabulary ?? {}} progress={progress} onReview={(words, correct) => recordVocabulary(words, correct, 'review')} />
    <View style={styles.account}>
      <Text style={styles.kicker}>MINHA CONTA</Text>
      <Text style={styles.accountTitle}>{user ? 'Conta conectada' : 'Aprendendo como visitante'}</Text>
      {user ? <>
        <Text style={styles.email}>{user.email ?? 'Sua conta'}</Text>
        <Text style={styles.description}>{user.emailVerified ? 'E-mail confirmado.' : 'E-mail ainda não confirmado. Verifique sua caixa de entrada.'}</Text>
        {!user.emailVerified && <View style={styles.space}>
          <ActionButton title="Reenviar confirmação" secondary disabled={busy} onPress={() => {
            void runAction(resendVerification, 'Enviamos outra confirmação ao seu e-mail.');
          }} />
        </View>}
        <View style={styles.syncPanel}>
          <Text style={styles.noteTitle}>Sincronização entre aparelhos</Text>
          <Text accessibilityLiveRegion="polite" style={styles.description}>
            {syncStatus === 'syncing' ? 'Sincronizando lições e XP com a nuvem...' :
             syncStatus === 'synced' ? 'Seu progresso está atualizado.' :
             syncStatus === 'error' ? 'Sem sincronização no momento. Suas lições permanecem salvas neste celular.' :
             'Aguardando sincronização de lições e XP.'}
          </Text>
          <View style={styles.space}>
            <ActionButton title={syncStatus === 'syncing' ? 'Sincronizando...' : 'Sincronizar agora'}
              secondary disabled={syncStatus === 'syncing' || busy} onPress={() => { void syncNow(); }} />
          </View>
          <Text style={styles.syncFoot}>Suas conquistas ficam disponíveis mesmo quando você estuda sem internet.</Text>
        </View>
        <View style={styles.space}>
          <ActionButton title={busy ? 'Aguarde...' : 'Sair da conta'} secondary disabled={busy} onPress={() => {
            void runAction(logOut, 'Você saiu da conta. O progresso desta conta ficou preservado no celular.');
          }} />
        </View>
      </> : <>
        <Text style={styles.description}>Crie uma conta para preparar seu progresso para a sincronização entre aparelhos.</Text>
        <View style={styles.space}><ActionButton title="Entrar ou criar conta" onPress={() => router.push('/auth')} /></View>
      </>}
      {!!notice && <Text style={styles.notice}>{notice}</Text>}
    </View>
    <View style={styles.note}>
      <Text style={styles.noteTitle}>{user ? 'Seu aprendizado, no seu ritmo' : 'Aprenda no seu ritmo'}</Text>
      <Text style={styles.noteText}>{user
        ? 'Suas lições e conquistas acompanham seu aprendizado.'
        : 'Explore as lições, pratique diariamente e veja sua evolução.'}</Text>
    </View>
    <ActionButton title="Voltar às lições" onPress={() => router.replace('/')} />
  </ScrollView></Page>;
}

const NAVY = '#071625';
const styles = StyleSheet.create({
  content: { padding: sizes.page, paddingTop: 14, paddingBottom: 50 },
  topLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 },
  back: { width: 37, height: 37, borderRadius: 12, backgroundColor: '#E6EDF5', justifyContent: 'center', alignItems: 'center' },
  backText: { color: '#274D75', fontSize: 29, marginTop: -5 },
  brandTitle: { color: NAVY, fontSize: 16, fontWeight: '900' },
  kicker: { fontSize: 10, fontWeight: '900', letterSpacing: 1.7, color: '#477BAD' },
  title: { fontSize: 29, color: NAVY, fontWeight: '900', letterSpacing: -0.7, lineHeight: 35, marginTop: 10, marginBottom: 24 },
  bigCard: { backgroundColor: '#102E4F', borderRadius: 29, paddingVertical: 31, paddingHorizontal: 20,
    overflow: 'hidden', borderWidth: 1, borderColor: '#3A5E84', alignItems: 'center' },
  cardOrbit: { position: 'absolute', width: 230, height: 230, borderRadius: 115, top: -131, right: -107,
    borderColor: 'rgba(130,194,246,0.15)', borderWidth: 38 },
  xp: { fontSize: 48, fontWeight: '900', color: '#FFFFFF', marginTop: 6 },
  xpLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 1.3, color: '#A9CEEC' },
  cardNote: { color: '#C0D7EF', fontSize: 12, marginTop: 17 },
  row: { flexDirection: 'row', gap: 13, marginTop: 14 },
  info: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 19, padding: 21, borderWidth: 1, borderColor: '#E1EAF3' },
  value: { fontSize: 29, fontWeight: '900', color: NAVY },
  meta: { color: '#7389A3', fontSize: 12, marginTop: 7 },
  account: { backgroundColor: '#FFFFFF', borderRadius: 23, padding: 21, marginTop: 25, borderWidth: 1, borderColor: '#E1EAF3' },
  accountTitle: { fontSize: 20, fontWeight: '900', color: NAVY, marginTop: 10 },
  email: { fontSize: 14, color: '#246BEB', fontWeight: '700', marginTop: 10 },
  description: { fontSize: 13, lineHeight: 21, color: '#72859D', marginTop: 9 },
  space: { marginTop: 16 },
  syncPanel: { backgroundColor: '#EFF5FC', borderRadius: 17, padding: 16, marginTop: 20 },
  noteTitle: { fontSize: 15, fontWeight: '900', color: NAVY },
  syncFoot: { color: '#73869F', fontSize: 12, lineHeight: 18, marginTop: 10 },
  notice: { fontSize: 13, lineHeight: 20, color: '#286CD0', fontWeight: '700', marginTop: 15 },
  note: { backgroundColor: '#EAF1F9', borderRadius: 18, padding: 18, marginTop: 20, marginBottom: 25 },
  noteText: { color: '#667C98', fontSize: 13, lineHeight: 21, marginTop: 8 },
});
