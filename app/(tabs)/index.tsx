import { Image } from 'expo-image';
import { Platform, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';

import { HelloWave } from '@/components/hello-wave';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function HomeScreen() {
  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={
        <Image
          source={require('@/assets/images/partial-react-logo.png')}
          style={styles.reactLogo}
        />
      }>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">AI Pin 🤖</ThemedText>
        <HelloWave />
      </ThemedView>
      
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">✨ On-Device AI</ThemedText>
        <ThemedText>
          Your personal AI assistant running entirely on your device. No internet required,
          complete privacy, powered by Qwen 2.5 0.5B.
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">📝 Transcription Summarizer</ThemedText>
        <ThemedText style={styles.description}>
          Enter any text or transcription and get a detailed, formatted summary generated
          by on-device AI.
        </ThemedText>
        
        <TouchableOpacity 
          style={styles.button}
          onPress={() => router.push('/summarize')}
        >
          <ThemedText style={styles.buttonText}>Open Summarizer →</ThemedText>
        </TouchableOpacity>
      </ThemedView>

      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">🎯 Features</ThemedText>
        <ThemedText>
          • 100% offline processing{'\n'}
          • Fast inference with GGUF models{'\n'}
          • Privacy-first design{'\n'}
          • Detailed formatted summaries{'\n'}
          • No API costs
        </ThemedText>
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
  description: {
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});
