import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import LoadingScreen from '@/components/LoadingScreen';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAppInitialization } from '@/hooks/useAppInitialization';

export const unstable_settings = {
  anchor: '(tabs)',
};


const TechNoirTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: '#FFFFFF',
    background: '#000000',
    card: '#0A0A0A',
    text: '#FFFFFF',
    border: '#222222',
    notification: '#FF3B30',
  },
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { isInitializing, isReady } = useAppInitialization();

  // Show loading screen while initializing AI model
  if (isInitializing || !isReady) {
    return <LoadingScreen />;
  }

  return (
    <ThemeProvider value={TechNoirTheme}>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#000000' },
          headerTintColor: '#FFFFFF',
          headerShadowVisible: false,
          contentStyle: { backgroundColor: '#000000' },
          animation: 'fade_from_bottom', // Sleeker animation
        }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        <Stack.Screen name="summarize" options={{ title: 'Summarize' }} />
      </Stack>
      <StatusBar style="light" backgroundColor="#000000" />
    </ThemeProvider>
  );
}
