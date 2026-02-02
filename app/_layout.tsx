import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAppInitialization } from '@/hooks/useAppInitialization';
import LoadingScreen from '@/components/LoadingScreen';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { isInitializing, isReady } = useAppInitialization();

  // Show loading screen while initializing AI model
  if (isInitializing || !isReady) {
    return <LoadingScreen />;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        <Stack.Screen name="summarize" options={{ title: 'Summarize' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
