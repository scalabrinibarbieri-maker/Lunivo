import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from '../constants/theme';
import { AuthProvider, useAuth } from '../features/auth/AuthProvider';
import { CourseProvider, useCourses } from '../features/courses/CourseProvider';
import { ProgressProvider, useProgress } from '../features/progress/ProgressProvider';

// Apenas a splash NATIVA do Android/iOS. Nenhuma segunda tela, imagem
// cinematografica ou camada animada por cima das licoes.
void SplashScreen.preventAutoHideAsync().catch(() => {});

function AppNavigation() {
  const { ready: authReady } = useAuth();
  const { ready: courseReady } = useCourses();
  const { ready: progressReady } = useProgress();
  const [laidOut, setLaidOut] = useState(false);
  const dataReady = authReady && courseReady && progressReady;

  useEffect(() => {
    if (!laidOut) return;
    if (dataReady) {
      void SplashScreen.hideAsync().catch(error => console.warn('Splash Lunivo:', error));
      return;
    }
    // Se algum provedor falhar, nao manter o celular preso na splash.
    const fallback = setTimeout(() => {
      void SplashScreen.hideAsync().catch(error => console.warn('Splash Lunivo:', error));
    }, 6000);
    return () => clearTimeout(fallback);
  }, [laidOut, dataReady]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }} onLayout={() => setLaidOut(true)}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <CourseProvider>
          <ProgressProvider>
            <AppNavigation />
          </ProgressProvider>
        </CourseProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
