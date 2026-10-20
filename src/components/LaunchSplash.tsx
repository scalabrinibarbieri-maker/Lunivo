import { useEffect, useRef, useState } from 'react';
import { Animated, Image, StyleSheet, View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { useAuth } from '../features/auth/AuthProvider';
import { useCourses } from '../features/courses/CourseProvider';
import { useProgress } from '../features/progress/ProgressProvider';

const NAVY = '#071625';
const LOGO = require('../../assets/lunivo-logo.png');

/**
 * A tela nativa continua visível até que o React Native esteja renderizado.
 * A animação apenas faz a passagem para a interface; não adiciona atraso artificial.
 * Firebase, D1 e R2 não são consultados por este componente.
 */
export function LaunchSplash({ onFinished }: { onFinished: () => void }) {
  const { ready: authReady } = useAuth();
  const { ready: courseReady } = useCourses();
  const { ready: progressReady } = useProgress();
  const [laidOut, setLaidOut] = useState(false);
  const [logoReady, setLogoReady] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const started = useRef(false);
  const opacity = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Somente resgate: não deixar uma falha de carregamento reter a splash para sempre.
    const timer = setTimeout(() => setTimedOut(true), 8000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const dataReady = authReady && progressReady && courseReady;
    if (!laidOut || (!logoReady && !timedOut) || (!dataReady && !timedOut) || started.current) return;
    started.current = true;
    let cancelled = false;
    void (async () => {
      try {
        // Esconde a splash nativa apenas após o overlay estar montado.
        await SplashScreen.hideAsync();
      } catch (error) {
        console.warn('Não foi possível fechar a splash nativa:', error);
      }
      if (cancelled) return;
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 580, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1.035, duration: 580, useNativeDriver: true }),
      ]).start(() => {
        if (!cancelled) onFinished();
      });
    })();
    return () => { cancelled = true; };
  }, [authReady, courseReady, progressReady, laidOut, logoReady, timedOut, opacity, scale, onFinished]);

  return (
    <Animated.View
      pointerEvents="auto"
      onLayout={() => setLaidOut(true)}
      style={[styles.fill, styles.surface, { opacity }]}
      accessibilityLabel="Lunivo iniciando"
    >
      {/* Detalhes ambientais com Views leves, sem imagens de tela inteira. */}
      <View pointerEvents="none" style={styles.topGlow} />
      <View pointerEvents="none" style={styles.lowerGlow} />
      <View pointerEvents="none" style={styles.haloOuter} />
      <View pointerEvents="none" style={styles.haloInner} />
      <Animated.View style={[styles.center, { transform: [{ scale }] }]}>
        <Image
          source={LOGO}
          style={styles.logo}
          resizeMode="contain"
          fadeDuration={0}
          accessibilityLabel="Logotipo Lunivo"
          onLoadEnd={() => setLogoReady(true)}
        />
        <View style={styles.accent} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: {
    position: 'absolute',
    top: 0, right: 0, bottom: 0, left: 0,
  },
  surface: {
    backgroundColor: NAVY,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    zIndex: 50,
    elevation: 50,
  },
  center: { width: '100%', alignItems: 'center', justifyContent: 'center' },
  logo: { width: 230, height: 210 },
  accent: {
    width: 36, height: 2, borderRadius: 2,
    marginTop: -4, backgroundColor: '#C79B58', opacity: 0.75,
  },
  topGlow: {
    position: 'absolute', width: 430, height: 430, borderRadius: 215,
    backgroundColor: 'rgba(30,94,160,0.065)', top: -260, right: -190,
  },
  lowerGlow: {
    position: 'absolute', width: 440, height: 440, borderRadius: 220,
    backgroundColor: 'rgba(174,113,35,0.035)', bottom: -280, left: -240,
  },
  haloOuter: {
    position: 'absolute', width: 390, height: 390, borderRadius: 195,
    borderColor: 'rgba(86,133,184,0.08)', borderWidth: 1,
  },
  haloInner: {
    position: 'absolute', width: 294, height: 294, borderRadius: 147,
    borderColor: 'rgba(86,133,184,0.11)', borderWidth: 1,
  },
});
