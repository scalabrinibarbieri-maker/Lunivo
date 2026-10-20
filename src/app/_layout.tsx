import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../features/auth/AuthProvider';
import { ProgressProvider } from '../features/progress/ProgressProvider';
import { CourseProvider } from '../features/courses/CourseProvider';
export default function RootLayout() {
  return <SafeAreaProvider><AuthProvider><CourseProvider><ProgressProvider>
    <StatusBar style="dark" />
    <Stack screenOptions={{headerShown:false,animation:'slide_from_right'}} />
  </ProgressProvider></CourseProvider></AuthProvider></SafeAreaProvider>;
}
