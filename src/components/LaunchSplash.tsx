import { useEffect, useRef, useState } from 'react';
import { Animated, Image, StyleSheet } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { useAuth } from '../features/auth/AuthProvider';
import { useCourses } from '../features/courses/CourseProvider';
import { useProgress } from '../features/progress/ProgressProvider';

// Mantemos a arte cinematográfica local; não criamos outra logo ou carregamento fictício.
const NAVY = '#071625';
const LOGO = require('../../assets/lunivo-logo.png');
const CINEMATIC_ART = require('../../assets/lunivo-splash-cinematic.png');

export function LaunchSplash({ onFinished }: { onFinished: () => void }) {
  const { ready: authReady } = useAuth();
  const { ready: courseReady } = useCourses();
  const { ready: progressReady } = useProgress();
  const [laidOut, setLaidOut] = useState(false);
  const [artReady, setArtReady] = useState(false);
  const [nativeHidden, setNativeHidden] = useState(false);
  const [holdComplete, setHoldComplete] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const started = useRef(false);
  const opacity = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const navyVeil = useRef(new Animated.Value(0)).current;

  // Nunca travar o acesso ao app devido a uma falha de inicialização.
  useEffect(() => {
    const fallback = setTimeout(() => setTimedOut(true), 8000);
    return () => clearTimeout(fallback);
  }, []);

  useEffect(() => {
    if (!laidOut || (!artReady && !timedOut) || nativeHidden) return;
    let mounted = true;
    void SplashScreen.hideAsync()
      .catch(error => console.warn('Falha ao ocultar splash nativa:', error))
      .finally(() => { if (mounted) setNativeHidden(true); });
    return () => { mounted = false; };
  }, [laidOut, artReady, nativeHidden, timedOut]);

  // Movimento mínimo na composição real, enquanto ela está 100% opaca.
  // A marca permanece visível por tempo suficiente, inclusive em aparelhos rápidos.
  useEffect(() => {
    if (!nativeHidden) return;
    Animated.timing(scale, { toValue: 1.025, duration: 1500, useNativeDriver: true }).start();
    const hold = setTimeout(() => setHoldComplete(true), 1150);
    return () => clearTimeout(hold);
  }, [nativeHidden, scale]);

  useEffect(() => {
    const dataReady = authReady && progressReady && courseReady;
    if (!nativeHidden || !holdComplete || (!dataReady && !timedOut) || started.current) return;
    started.current = true;
    // Corrige o clarão visto na gravação: NÃO dissolvemos a arte sobre a home.
    // 1) Cobrimos os reflexos/wordmark com azul sólido.
    // 2) Dissolvemos APENAS uma superfície lisa para revelar a home.
    Animated.sequence([
      Animated.timing(navyVeil, { toValue: 1, duration: 240, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 380, useNativeDriver: true }),
    ]).start(({ finished }) => { if (finished) onFinished(); });
  }, [authReady, progressReady, courseReady, nativeHidden, holdComplete, timedOut, opacity, navyVeil, onFinished]);

  return (
    <Animated.View
      pointerEvents="auto"
      onLayout={() => setLaidOut(true)}
      style={[styles.fill, styles.surface, { opacity }]}
      accessibilityLabel="Lunivo iniciando"
    >
      {!artReady && <Image source={LOGO} style={styles.fallbackLogo} resizeMode="contain" />}
      <Animated.Image
        source={CINEMATIC_ART}
        resizeMode="cover"
        fadeDuration={0}
        onLoadEnd={() => setArtReady(true)}
        accessibilityLabel="Abertura cinematográfica Lunivo"
        style={[styles.fullArtwork, { transform: [{ scale }] }]}
      />
      <Animated.View pointerEvents="none" style={[styles.fill, { backgroundColor: NAVY, opacity: navyVeil }]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  surface: {
    backgroundColor: NAVY,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    zIndex: 50, elevation: 50,
  },
  fullArtwork: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, width: '100%', height: '100%' },
  fallbackLogo: { width: 230, height: 210 },
});
