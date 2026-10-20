import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LaunchSplash } from '../components/LaunchSplash';
import { AuthProvider } from '../features/auth/AuthProvider';
import { CourseProvider } from '../features/courses/CourseProvider';
import { ProgressProvider } from '../features/progress/ProgressProvider';

// Evita que o SO esconda a splash antes de a primeira tela estar preparada.
void SplashScreen.preventAutoHideAsync().catch(() => {});

function AppNavigation() {
  const [splashFinished, setSplashFinished] = useState(false);
  const finishSplash = useCallback(() => setSplashFinished(true), []);
  return (
    <View style={{ flex: 1, backgroundColor: '#071625' }}>
      <StatusBar style={splashFinished ? 'dark' : 'light'} />
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />
      {!splashFinished && <LaunchSplash onFinished={finishSplash} />}
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
