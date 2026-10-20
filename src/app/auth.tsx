import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Page } from '../components/Page';
import { ActionButton } from '../components/ActionButton';
import { colors, sizes } from '../constants/theme';
import { messageForAuthError, useAuth } from '../features/auth/AuthProvider';

type Mode = 'login' | 'register';

export default function AuthScreen() {
  const { ready, user, signIn, signUp, resetPassword } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (ready && user) router.replace('/profile');
  }, [ready, user]);

  const submit = async () => {
    if (pending) return;
    if (!email.trim() || !password) { setError('Preencha e-mail e senha.'); return; }
    if (mode === 'register' && password.length < 6) { setError('Use pelo menos 6 caracteres na senha.'); return; }
    setPending(true); setError(''); setNotice('');
    try {
      if (mode === 'register') {
        const sent = await signUp(email, password);
        setNotice(sent ? 'Conta criada! Enviamos a confirmacao ao seu e-mail.' : 'Conta criada. Voce podera reenviar a confirmacao no perfil.');
      } else {
        await signIn(email, password);
      }
      setPassword('');
    } catch (err) {
      setError(messageForAuthError(err));
    } finally { setPending(false); }
  };

  const recover = async () => {
    if (pending) return;
    if (!email.trim()) { setError('Digite seu e-mail para recuperar a senha.'); return; }
    setPending(true); setError(''); setNotice('');
    try {
      await resetPassword(email);
      setNotice('Se o e-mail estiver cadastrado, voce recebera instrucoes para recuperar sua senha.');
    } catch (err) { setError(messageForAuthError(err)); }
    finally { setPending(false); }
  };

  if (!ready) return <Page><ActivityIndicator color={colors.primary} style={{ marginTop: 90 }} /></Page>;

  return <Page><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Pressable accessibilityRole="button" onPress={() => router.replace('/profile')} style={styles.back}>
        <Text style={styles.backText}>‹  Meu progresso</Text>
      </Pressable>
      <Text style={styles.brand}>lunivo<Text style={styles.brandDot}>.</Text></Text>
      <Text style={styles.kicker}>SUA JORNADA, SUA CONTA</Text>
      <Text style={styles.title}>{mode === 'login' ? 'Bem-vindo de volta.' : 'Crie sua conta.'}</Text>
      <Text style={styles.subtitle}>Entre para preparar a sincronizacao do seu aprendizado entre dispositivos.</Text>
      <View style={styles.toggle}>
        <Pressable onPress={() => { setMode('login'); setError(''); setNotice(''); }} style={[styles.tab, mode === 'login' && styles.activeTab]}>
          <Text style={[styles.tabText, mode === 'login' && styles.activeTabText]}>Entrar</Text>
        </Pressable>
        <Pressable onPress={() => { setMode('register'); setError(''); setNotice(''); }} style={[styles.tab, mode === 'register' && styles.activeTab]}>
          <Text style={[styles.tabText, mode === 'register' && styles.activeTabText]}>Criar conta</Text>
        </Pressable>
      </View>
      <Text style={styles.label}>E-MAIL</Text>
      <TextInput accessibilityLabel="E-mail" value={email} onChangeText={setEmail} style={styles.input}
        autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="emailAddress"
        autoCorrect={false} placeholder="voce@exemplo.com" placeholderTextColor={colors.disabled} editable={!pending} />
      <Text style={styles.label}>SENHA</Text>
      <TextInput accessibilityLabel="Senha" value={password} onChangeText={setPassword} style={styles.input}
        secureTextEntry autoCapitalize="none" autoCorrect={false} autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
        textContentType={mode === 'register' ? 'newPassword' : 'password'} placeholder={mode === 'register' ? 'Minimo de 6 caracteres' : 'Sua senha'}
        placeholderTextColor={colors.disabled} editable={!pending} />
      {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      {!!notice && <Text style={styles.notice}>{notice}</Text>}
      <View style={styles.submit}><ActionButton title={pending ? 'Aguarde...' : mode === 'login' ? 'Entrar' : 'Criar minha conta'} disabled={pending} onPress={() => { void submit(); }} /></View>
      {mode === 'login' && <Pressable disabled={pending} onPress={() => { void recover(); }} style={styles.recover}>
        <Text style={styles.recoverText}>Esqueci minha senha</Text>
      </Pressable>}
      <View style={styles.note}><Text style={styles.noteTitle}>Suas licoes continuam offline</Text>
        <Text style={styles.noteBody}>O progresso de visitante fica preservado neste celular. Nesta etapa ele ainda nao e enviado para a nuvem nem misturado com outras contas.</Text></View>
    </ScrollView>
  </KeyboardAvoidingView></Page>;
}

const styles = StyleSheet.create({
  content:{paddingHorizontal:sizes.page,paddingBottom:45},back:{marginTop:15,marginBottom:30},backText:{color:colors.muted,fontWeight:'700',fontSize:14},
  brand:{fontSize:30,fontWeight:'900',letterSpacing:-1.8,color:colors.ink},brandDot:{color:colors.primary},
  kicker:{fontSize:11,fontWeight:'900',letterSpacing:1.4,color:colors.primary,marginTop:26},
  title:{fontSize:32,fontWeight:'900',letterSpacing:-.8,color:colors.ink,marginTop:10},
  subtitle:{fontSize:15,lineHeight:23,color:colors.muted,marginTop:10,marginBottom:24},
  toggle:{flexDirection:'row',padding:4,backgroundColor:colors.primarySoft,borderRadius:16,marginBottom:26},
  tab:{flex:1,borderRadius:12,paddingVertical:12,alignItems:'center'},activeTab:{backgroundColor:colors.surface},
  tabText:{color:colors.muted,fontWeight:'800'},activeTabText:{color:colors.primary},
  label:{color:colors.ink,fontWeight:'900',fontSize:11,letterSpacing:1.2,marginBottom:9,marginTop:13},
  input:{borderWidth:1.5,borderColor:colors.line,backgroundColor:colors.surface,color:colors.ink,borderRadius:16,paddingHorizontal:17,minHeight:57,fontSize:16},
  error:{color:colors.red,marginTop:18,fontSize:13,lineHeight:20,fontWeight:'700'},
  notice:{color:colors.green,marginTop:18,fontSize:13,lineHeight:20,fontWeight:'700'},
  submit:{marginTop:25},recover:{alignItems:'center',paddingVertical:20},recoverText:{color:colors.primary,fontSize:14,fontWeight:'800'},
  note:{borderRadius:19,backgroundColor:colors.primarySoft,padding:19,marginTop:24},
  noteTitle:{color:colors.ink,fontSize:15,fontWeight:'900'},noteBody:{color:colors.muted,fontSize:13,lineHeight:21,marginTop:8}
});
