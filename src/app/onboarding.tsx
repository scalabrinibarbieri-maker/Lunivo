import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Animated, BackHandler, Image, KeyboardAvoidingView,
  Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DAILY_GOALS, formatClock, validClock, type DailyGoal } from '../features/onboarding/model';
import { useOnboarding } from '../features/onboarding/OnboardingProvider';

const NAVY = '#071625';
const WHITE = '#F5F8FF';
const MUTED = '#9DAFCB';
const BLUE = '#4C9BF8';
const GOLD = '#F2B66D';
const STEPS = ['Boas-vindas', 'Idioma', 'Meta diária', 'Lembretes', 'Confirmação'] as const;

function Tag({ children }: { children: string }) {
  return <Text style={styles.tag}>{children}</Text>;
}

function Option({ title, subtitle, emblem, selected, disabled = false, onPress }: {
  title: string; subtitle?: string; emblem: string; selected: boolean; disabled?: boolean; onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio" accessibilityState={{ selected, disabled }}
      accessibilityLabel={`${title}${subtitle ? `, ${subtitle}` : ''}`}
      onPress={onPress} disabled={disabled}
      style={({ pressed }) => [styles.option, selected && styles.optionSelected,
        disabled && styles.optionDisabled, pressed && !disabled && styles.pressed]}
    >
      <View style={[styles.optionEmblem, selected && styles.optionEmblemSelected]}><Text style={styles.optionEmblemText}>{emblem}</Text></View>
      <View style={styles.optionCopy}>
        <Text style={[styles.optionTitle, disabled && styles.disabledText]}>{title}</Text>
        {subtitle ? <Text style={[styles.optionSubtitle, disabled && styles.disabledText]}>{subtitle}</Text> : null}
      </View>
      <View style={[styles.selectCircle, selected && styles.selectCircleActive]}>
        {selected && <View style={styles.selectDot} />}
      </View>
    </Pressable>
  );
}

function TimeField({ label, value, max, onChange }: {
  label: string; value: string; max: number; onChange: (text: string) => void;
}) {
  const adjust = (delta: number) => {
    const parsed = Number(value);
    const now = Number.isInteger(parsed) ? parsed : 0;
    onChange(String((now + delta + max + 1) % (max + 1)).padStart(2, '0'));
  };
  return (
    <View style={styles.timeField}>
      <Text style={styles.timeLabel}>{label}</Text>
      <View style={styles.timeBox}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Diminuir ${label.toLowerCase()}`} style={styles.stepper} onPress={() => adjust(-1)}>
          <Text style={styles.stepperText}>−</Text>
        </Pressable>
        <TextInput
          accessibilityLabel={label} selectTextOnFocus keyboardType="number-pad" maxLength={2}
          style={styles.timeInput} value={value} onChangeText={text => { if (/^\d{0,2}$/.test(text)) onChange(text); }}
          onBlur={() => { if (value !== '' && Number(value) <= max) onChange(value.padStart(2, '0')); }}
        />
        <Pressable accessibilityRole="button" accessibilityLabel={`Aumentar ${label.toLowerCase()}`} style={styles.stepper} onPress={() => adjust(1)}>
          <Text style={styles.stepperText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { finish } = useOnboarding();
  const [step, setStep] = useState(0);
  const [language, setLanguage] = useState<'it' | null>(null);
  const [goal, setGoal] = useState<DailyGoal | null>(null);
  const [remindersWanted, setRemindersWanted] = useState<boolean | null>(null);
  const [hour, setHour] = useState('19');
  const [minute, setMinute] = useState('00');
  const [saving, setSaving] = useState(false);
  const breathe = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<ScrollView | null>(null);
  const hourNumber = Number(hour);
  const minuteNumber = Number(minute);
  const clockValid = hour.length > 0 && minute.length > 0 && validClock(hourNumber, minuteNumber);

  useEffect(() => {
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(breathe, { toValue: 1, duration: 1900, useNativeDriver: true }),
      Animated.timing(breathe, { toValue: 0, duration: 1900, useNativeDriver: true }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [breathe]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (saving) return true;
      if (step > 0) { setStep(old => old - 1); return true; }
      return false;
    });
    return () => subscription.remove();
  }, [step, saving]);

  const changeStep = (next: number) => {
    setStep(next);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };
  const canAdvance = step === 0 ||
    (step === 1 && language === 'it') ||
    (step === 2 && goal !== null) ||
    (step === 3 && remindersWanted !== null && (!remindersWanted || clockValid)) ||
    (step === 4 && language === 'it' && goal !== null && remindersWanted !== null && (!remindersWanted || clockValid));

  const next = async () => {
    if (!canAdvance || saving) return;
    if (step < 4) { changeStep(step + 1); return; }
    setSaving(true);
    try {
      const status = await finish({
        language, dailyGoalMinutes: goal, remindersWanted,
        hour: hourNumber, minute: minuteNumber,
      });
      if (status === 'denied') {
        Alert.alert('Lembretes desativados', 'A permissão de notificações não foi concedida. Seu curso está liberado e você pode ativá-las mais tarde nas configurações do celular.');
      } else if (status === 'failed') {
        Alert.alert('Lembrete indisponível', 'Não foi possível agendar o lembrete neste aparelho. Seu curso foi iniciado normalmente.');
      }
      // O Stack.Protected detecta a conclusão persistida e libera a home automaticamente.
    } catch (error) {
      Alert.alert('Não foi possível salvar', error instanceof Error ? error.message : 'Tente novamente.');
    } finally { setSaving(false); }
  };

  const pulseScale = breathe.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1.08] });
  const pulseOpacity = breathe.interpolate({ inputRange: [0, 1], outputRange: [0.16, 0.37] });

  let content: ReactNode;
  if (step === 0) {
    content = <>
      <View style={styles.welcomeArt}>
        <Animated.View style={[styles.logoAura, { opacity: pulseOpacity, transform: [{ scale: pulseScale }] }]} />
        <Image source={require('../../assets/lunivo-logo.png')} resizeMode="contain" style={styles.brandImage} accessibilityLabel="Logo Lunivo" />
      </View>
      <Tag>SEU PRÓXIMO CAPÍTULO</Tag>
      <Text style={styles.headline}>O mundo se abre a quem aprende.</Text>
      <Text style={styles.description}>Um idioma de cada vez. Uma conquista todos os dias.</Text>
      <View style={styles.quoteCard}>
        <Text style={styles.quoteMark}>✦</Text>
        <Text style={styles.quote}>Evolua todos os dias, e em breve, estará mais próximo do objetivo.</Text>
      </View>
    </>;
  } else if (step === 1) {
    content = <>
      <Tag>01 / SUA JORNADA</Tag>
      <Text style={styles.headline}>Qual idioma você quer descobrir?</Text>
      <Text style={styles.description}>Escolha por onde começar. Mais idiomas chegarão em breve.</Text>
      <View style={styles.optionsList} accessibilityRole="radiogroup">
        <Option title="Italiano" subtitle="Disponível · Nível iniciante A1" emblem="🇮🇹" selected={language === 'it'} onPress={() => setLanguage('it')} />
        <Option title="Inglês" subtitle="Em construção" emblem="🇬🇧" selected={false} disabled onPress={() => {}} />
      </View>
      <View style={styles.infoStrip}><Text style={styles.infoText}>✦  O italiano espera por você.</Text></View>
    </>;
  } else if (step === 2) {
    content = <>
      <Tag>02 / SEU RITMO</Tag>
      <Text style={styles.headline}>Quanto tempo por dia?</Text>
      <Text style={styles.description}>É a constância, não a velocidade, que transforma seu aprendizado.</Text>
      <View style={styles.goals} accessibilityRole="radiogroup">
        {DAILY_GOALS.map(minutes => (
          <Pressable key={minutes} accessibilityRole="radio" accessibilityLabel={`${minutes} minutos por dia`}
            accessibilityState={{ selected: goal === minutes }} onPress={() => setGoal(minutes)}
            style={({ pressed }) => [styles.goalOption, goal === minutes && styles.goalSelected, pressed && styles.pressed]}>
            <Text style={[styles.goalNumber, goal === minutes && styles.goalNumberSelected]}>{minutes}</Text>
            <Text style={styles.goalUnit}>min/dia</Text>
            {goal === minutes && <Text style={styles.goalCheck}>✓</Text>}
          </Pressable>
        ))}
      </View>
      <Text style={styles.hint}>Você poderá ajustar essa meta futuramente.</Text>
    </>;
  } else if (step === 3) {
    content = <>
      <Tag>03 / CRIE UM HÁBITO</Tag>
      <Text style={styles.headline}>Um momento só seu, todos os dias.</Text>
      <Text style={styles.description}>Quer receber um lembrete diário para não perder seu ritmo?</Text>
      <View style={styles.optionsList} accessibilityRole="radiogroup">
        <Option title="Sim, quero lembretes" subtitle="Uma notificação local por dia" emblem="✦" selected={remindersWanted === true} onPress={() => setRemindersWanted(true)} />
        <Option title="Agora não" subtitle="Aprender no meu tempo" emblem="◷" selected={remindersWanted === false} onPress={() => setRemindersWanted(false)} />
      </View>
      {remindersWanted === true && <View style={styles.clockCard}>
        <Text style={styles.clockCaption}>ESCOLHA SEU HORÁRIO</Text>
        <View style={styles.timeRow}>
          <TimeField label="Horas" value={hour} max={23} onChange={setHour} />
          <Text style={styles.colon}>:</Text>
          <TimeField label="Minutos" value={minute} max={59} onChange={setMinute} />
        </View>
        {!clockValid && <Text style={styles.validation}>Digite uma hora entre 00–23 e minutos entre 00–59.</Text>}
        <Text style={styles.clockHelp}>Você poderá autorizar as notificações na próxima etapa.</Text>
      </View>}
    </>;
  } else {
    content = <>
      <View style={styles.confirmEmblem}><Text style={styles.confirmStar}>✦</Text></View>
      <Tag>04 / TUDO PRONTO</Tag>
      <Text style={styles.headline}>Sua jornada começa agora.</Text>
      <Text style={styles.description}>Confira suas escolhas e prepare-se para aprender italiano.</Text>
      <View style={styles.summary}>
        <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Idioma escolhido</Text><Text style={styles.summaryValue}>🇮🇹  Italiano</Text></View>
        <View style={styles.separator} />
        <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Meta diária</Text><Text style={styles.summaryValue}>{goal} minutos</Text></View>
        <View style={styles.separator} />
        <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Lembretes</Text><Text style={styles.summaryValue}>{remindersWanted ? `Todos os dias · ${clockValid ? formatClock(hourNumber, minuteNumber) : '—'}` : 'Desativados'}</Text></View>
      </View>
      {remindersWanted && <Text style={styles.consentNote}>Ao começar, o Lunivo solicitará permissão para notificações. Se você recusar, seu curso continuará normalmente.</Text>}
    </>;
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.screen}>
      <View pointerEvents="none" style={styles.glowTop} /><View pointerEvents="none" style={styles.glowBottom} />
      <View style={[styles.topbar, { paddingTop: Math.max(insets.top, 18) + 10 }]}>
        <View style={styles.navStart}>
          {step > 0 ? <Pressable accessibilityRole="button" accessibilityLabel="Voltar à etapa anterior" disabled={saving}
            onPress={() => changeStep(step - 1)} style={styles.backButton}><Text style={styles.backText}>‹</Text></Pressable> :
            <Text style={styles.wordmark}>lunivo<Text style={styles.brandDot}>.</Text></Text>}
        </View>
        <Text style={styles.topStep}>{STEPS[step]} · {step + 1}/5</Text>
      </View>
      <View style={styles.progressDots}>
        {STEPS.map((name, index) => <View key={name} style={[styles.progressDot, index <= step && styles.progressDotActive]} />)}
      </View>
      <ScrollView ref={scrollRef} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.body, { paddingBottom: 26 }]}>
        {content}
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 14) + 10 }]}>
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: !canAdvance || saving }}
          disabled={!canAdvance || saving} onPress={() => { void next(); }}
          style={({ pressed }) => [styles.primaryButton, (!canAdvance || saving) && styles.primaryDisabled, pressed && styles.pressed]}>
          {saving ? <ActivityIndicator color={NAVY} /> : <>
            <Text style={styles.primaryText}>{step === 0 ? 'Começar' : step === 4 ? 'Começar meu curso' : 'Continuar'}</Text>
            <Text style={styles.primaryArrow}>→</Text>
          </>}
        </Pressable>
        <Text style={styles.footerHint}>{step === 4 ? 'Seu progresso será salvo neste aparelho.' : 'Um passo de cada vez.'}</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: NAVY },
  glowTop: { position: 'absolute', width: 380, height: 380, borderRadius: 190, backgroundColor: '#0D2B50', top: -200, right: -180, opacity: 0.75 },
  glowBottom: { position: 'absolute', width: 300, height: 300, borderRadius: 150, backgroundColor: '#0B2444', bottom: -190, left: -160, opacity: 0.75 },
  topbar: { paddingHorizontal: 24, paddingBottom: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navStart: { width: 118, justifyContent: 'center' },
  wordmark: { fontSize: 25, fontWeight: '900', color: WHITE, letterSpacing: -1.3 }, brandDot: { color: BLUE },
  backButton: { width: 40, height: 39, borderWidth: 1, borderColor: '#304767', borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  backText: { color: WHITE, fontSize: 33, marginTop: -6 },
  topStep: { color: '#B8C9E4', fontWeight: '700', fontSize: 12 },
  progressDots: { flexDirection: 'row', marginHorizontal: 24, gap: 6, marginBottom: 12 },
  progressDot: { flex: 1, height: 3, borderRadius: 3, backgroundColor: '#294361' },
  progressDotActive: { backgroundColor: '#68ABFF' },
  body: { flexGrow: 1, paddingHorizontal: 26, paddingTop: 31, justifyContent: 'center' },
  tag: { color: GOLD, fontWeight: '800', letterSpacing: 2.1, fontSize: 10, marginBottom: 15 },
  headline: { color: WHITE, fontWeight: '900', fontSize: 33, letterSpacing: -1.05, lineHeight: 40, maxWidth: 410 },
  description: { color: MUTED, fontSize: 15.5, lineHeight: 24, marginTop: 13, maxWidth: 410 },
  welcomeArt: { height: 186, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  logoAura: { position: 'absolute', width: 260, height: 145, backgroundColor: '#2C89F2', borderRadius: 90, shadowColor: '#55A9FF', shadowRadius: 40, shadowOpacity: 0.8, elevation: 13 },
  brandImage: { width: 270, height: 155 },
  quoteCard: { marginTop: 28, padding: 21, backgroundColor: '#102A4C', borderColor: '#294C77', borderWidth: 1, borderRadius: 22, flexDirection: 'row', alignItems: 'flex-start', gap: 13 },
  quoteMark: { color: GOLD, fontSize: 23, marginTop: -3 },
  quote: { color: '#E7F0FF', fontWeight: '600', fontSize: 16, lineHeight: 25, flex: 1 },
  optionsList: { marginTop: 32, gap: 13 },
  option: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 17, backgroundColor: '#102741', borderWidth: 1, borderColor: '#2A4668', minHeight: 84 },
  optionSelected: { backgroundColor: '#123663', borderColor: '#69B1FF', borderWidth: 2, paddingHorizontal: 14, paddingVertical: 16 },
  optionDisabled: { opacity: 0.48 },
  optionEmblem: { width: 47, height: 47, backgroundColor: '#1C3A5B', borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 13 },
  optionEmblemSelected: { backgroundColor: '#214B7B' }, optionEmblemText: { fontSize: 24, color: '#E9F4FF' },
  optionCopy: { flex: 1 }, optionTitle: { fontSize: 16, fontWeight: '800', color: WHITE },
  optionSubtitle: { fontSize: 12, color: MUTED, marginTop: 5 }, disabledText: { color: '#8492A6' },
  selectCircle: { width: 21, height: 21, borderRadius: 11, borderWidth: 2, borderColor: '#6585AB', alignItems: 'center', justifyContent: 'center' },
  selectCircleActive: { borderColor: '#87C5FF' }, selectDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#87C5FF' },
  pressed: { opacity: 0.78 },
  infoStrip: { borderRadius: 14, padding: 15, backgroundColor: '#0E2C4B', marginTop: 24 }, infoText: { color: '#B3CEF4', fontSize: 13, fontWeight: '600' },
  goals: { marginTop: 32, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  goalOption: { width: '30%', minWidth: 93, flexGrow: 1, backgroundColor: '#102741', borderRadius: 18, borderWidth: 1, borderColor: '#2A4668', paddingVertical: 21, alignItems: 'center' },
  goalSelected: { borderColor: '#74B8FF', backgroundColor: '#153B69' },
  goalNumber: { fontSize: 28, color: WHITE, fontWeight: '900' }, goalNumberSelected: { color: '#91C7FF' },
  goalUnit: { color: MUTED, marginTop: 3, fontSize: 12 },
  goalCheck: { position: 'absolute', top: 6, right: 10, color: '#8FC6FF', fontSize: 14, fontWeight: '900' },
  hint: { fontSize: 12, color: MUTED, marginTop: 25, textAlign: 'center' },
  clockCard: { marginTop: 21, backgroundColor: '#102A48', borderWidth: 1, borderColor: '#35547B', borderRadius: 20, padding: 17 },
  clockCaption: { fontSize: 11, color: '#B9D4F7', letterSpacing: 1.3, fontWeight: '800', textAlign: 'center' },
  timeRow: { marginTop: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  timeField: { flex: 1 }, timeLabel: { color: MUTED, fontSize: 11, textAlign: 'center', marginBottom: 8 },
  timeBox: { flexDirection: 'row', borderWidth: 1, borderRadius: 12, borderColor: '#365A88', height: 53, justifyContent: 'center', alignItems: 'center' },
  stepper: { paddingHorizontal: 7, alignItems: 'center', justifyContent: 'center', minHeight: 40 },
  stepperText: { color: '#9BBDE5', fontSize: 20, fontWeight: '700' },
  timeInput: { color: WHITE, fontWeight: '800', fontSize: 22, flex: 1, minWidth: 33, paddingVertical: 4, textAlign: 'center' },
  colon: { color: WHITE, fontWeight: '900', fontSize: 27, marginTop: 15 },
  validation: { fontSize: 12, color: '#FFC98E', marginTop: 10, textAlign: 'center' },
  clockHelp: { color: MUTED, fontSize: 11.5, lineHeight: 18, textAlign: 'center', marginTop: 15 },
  confirmEmblem: { width: 82, height: 82, borderRadius: 26, marginBottom: 27, justifyContent: 'center', alignItems: 'center', backgroundColor: '#174A7B', borderWidth: 1, borderColor: '#5B92C6' },
  confirmStar: { color: GOLD, fontSize: 42 },
  summary: { marginTop: 29, backgroundColor: '#112C4D', borderWidth: 1, borderColor: '#305070', padding: 19, borderRadius: 20 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 9, paddingVertical: 10 },
  summaryLabel: { color: MUTED, fontSize: 12, flexShrink: 1 }, summaryValue: { color: WHITE, fontSize: 13, fontWeight: '800', textAlign: 'right', flexShrink: 1 },
  separator: { height: 1, backgroundColor: '#2B4362' },
  consentNote: { color: MUTED, fontSize: 12, lineHeight: 19, marginTop: 16 },
  footer: { paddingHorizontal: 24, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#19314D', backgroundColor: NAVY },
  primaryButton: { height: 57, backgroundColor: '#83C0FF', borderRadius: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 19 },
  primaryDisabled: { opacity: 0.4 },
  primaryText: { color: NAVY, fontWeight: '900', fontSize: 16 },
  primaryArrow: { position: 'absolute', right: 20, color: NAVY, fontWeight: '900', fontSize: 23 },
  footerHint: { textAlign: 'center', color: '#748BA9', marginTop: 11, fontSize: 11 },
});
