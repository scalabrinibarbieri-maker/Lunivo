import { useEffect, useRef, useState } from 'react';
import { Animated, Image, StyleSheet, View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { useAuth } from '../features/auth/AuthProvider';
import { useCourses } from '../features/courses/CourseProvider';
import { useProgress } from '../features/progress/ProgressProvider';

// Reproduz a composicao cinematografica APROVADA, nao uma aproximacao
// feita com circulos ou gradientes simplificados. A imagem e local/offline.
const NAVY = '#071625';
const LOGO = require('../../assets/lunivo-logo.png');
const CINEMATIC_ART = require('../../assets/lunivo-splash-cinematic.png');

/**
 * Splash em duas fases:
 * 1. Android/iOS exibem a tela nativa declarada no app.json.
 * 2. A arte aprovada substitui a tela nativa, com zoom minimo e dissolve.
 *
 * A transicao usa apenas os estados dos provedores EXISTENTES e nunca
 * requisita recursos remotos para renderizar a arte. Sem carregamento falso.
 */
export function LaunchSplash({ onFinished }: { onFinished: () => void }) {
  const { ready: authReady } = useAuth();
  const { ready: courseReady } = useCourses();
  const { ready: progressReady } = useProgress();
  const [laidOut, setLaidOut] = useState(false);
  const [artReady, setArtReady] = useState(false);
  const [nativeHidden, setNativeHidden] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const started = useRef(false);
  const opacity = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(1)).current;

  // Resgate para que erros de inicializacao nao prendam o usuario na splash.
  useEffect(() => {
    const fallback = setTimeout(() => setTimedOut(true), 8000);
    return () => clearTimeout(fallback);
  }, []);

  useEffect(() => {
    if (!laidOut || (!artReady && !timedOut) || nativeHidden) return;
    let mounted = true;
    // A tela nativa some somente com a arte renderizada (ou apos timeout).
    void SplashScreen.hideAsync()
      .catch(error => console.warn('Falha ao ocultar splash nativa:', error))
      .finally(() => { if (mounted) setNativeHidden(true); });
    return () => { mounted = false; };
  }, [laidOut, artReady, nativeHidden, timedOut]);

  useEffect(() => {
    const dataReady = authReady && progressReady && courseReady;
    if (!nativeHidden || (!dataReady && !timedOut) || started.current) return;
    started.current = true;
    // Transicao de marca, nao barra de progresso inventada.
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 760, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1.025, duration: 760, useNativeDriver: true }),
    ]).start(({ finished }) => { if (finished) onFinished(); });
  }, [authReady, progressReady, courseReady, nativeHidden, timedOut, opacity, scale, onFinished]);

  return (
    <Animated.View
      pointerEvents="auto"
      onLayout={() => setLaidOut(true)}
      style={[styles.fill, styles.surface, { opacity }]}
      accessibilityLabel="Lunivo iniciando"
    >
      {/* Fallback local caso a arte cinematografica nao decodifique. */}
      {!artReady && <Image source={LOGO} style={styles.fallbackLogo} resizeMode="contain" />}
      <Animated.Image
        source={CINEMATIC_ART}
        resizeMode="cover"
        fadeDuration={0}
        onLoadEnd={() => setArtReady(true)}
        accessibilityLabel="Abertura cinematografica Lunivo"
        style={[styles.fullArtwork, { transform: [{ scale }] }]}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  surface: {
    backgroundColor: NAVY,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    zIndex: 50,
    elevation: 50,
  },
  fullArtwork: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, width: '100%', height: '100%' },
  fallbackLogo: { width: 230, height: 210 },
});
