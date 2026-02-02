/**
 * WhisperService - On-device speech-to-text transcription
 * Note: Using mock implementation until react-native-whisper is configured
 */

import * as FileSystem from 'expo-file-system';
import { Audio } from 'expo-av';

export interface TranscriptionOptions {
  language?: string; // e.g., 'en', 'es', 'fr'
  task?: 'transcribe' | 'translate'; // translate to English
  maxDuration?: number; // max audio duration in seconds
}

export interface TranscriptionResult {
  text: string;
  language: string;
  duration: number; // processing time in ms
  segments?: Array<{
    start: number;
    end: number;
    text: string;
  }>;
}

class WhisperService {
  private modelPath: string | null = null;
  private isInitialized = false;

  /**
   * Initialize Whisper with a model
   * TODO: Replace with actual whisper implementation
   */
  async initialize(modelPath: string): Promise<void> {
    try {
      console.log('⚠️ WhisperService: Using mock implementation');
      this.modelPath = modelPath;
      this.isInitialized = true;
      console.log('✅ Mock Whisper initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Whisper:', error);
      throw error;
    }
  }

  /**
   * Transcribe audio file
   * TODO: Replace with actual transcription
   */
  async transcribe(
    audioPath: string,
    options: TranscriptionOptions = {}
  ): Promise<TranscriptionResult> {
    if (!this.isInitialized || !this.modelPath) {
      throw new Error('Whisper not initialized. Call initialize() first.');
    }

    const startTime = Date.now();

    try {
      // Mock transcription
      await new Promise(resolve => setTimeout(resolve, 1000));

      const duration = Date.now() - startTime;

      return {
        text: 'This is a mock transcription. Real speech-to-text requires Whisper model integration.',
        language: options.language || 'en',
        duration,
      };
    } catch (error) {
      console.error('❌ Transcription error:', error);
      throw error;
    }
  }

  /**
   * Record and transcribe audio
   */
  async recordAndTranscribe(
    durationMs: number,
    options: TranscriptionOptions = {}
  ): Promise<TranscriptionResult> {
    const recording = new Audio.Recording();

    try {
      // Request permissions
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        throw new Error('Audio recording permission not granted');
      }

      // Prepare recording
      await recording.prepareToRecordAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      // Start recording
      await recording.startAsync();
      console.log('🎤 Recording started');

      // Wait for specified duration
      await new Promise((resolve) => setTimeout(resolve, durationMs));

      // Stop recording
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      console.log('🎤 Recording stopped:', uri);

      if (!uri) {
        throw new Error('Failed to get recording URI');
      }

      // Transcribe
      return await this.transcribe(uri, options);
    } catch (error) {
      console.error('❌ Record and transcribe error:', error);
      throw error;
    }
  }

  /**
   * Check if initialized
   */
  isReady(): boolean {
    return this.isInitialized && this.modelPath !== null;
  }

  /**
   * Get supported languages (subset of Whisper's 100+ languages)
   */
  getSupportedLanguages(): string[] {
    return [
      'en', 'es', 'fr', 'de', 'it', 'pt', 'nl', 'pl', 'ru',
      'zh', 'ja', 'ko', 'ar', 'hi', 'tr', 'vi', 'th', 'id',
    ];
  }
}

export default new WhisperService();
