/**
 * TypeScript types for Whisper transcription service
 */

export interface TranscriptionOptions {
  language?: string; // e.g., 'en', 'es', 'fr', 'auto' for auto-detect
  maxDuration?: number; // max audio duration in seconds
  realtime?: boolean; // enable real-time streaming callbacks
  translate?: boolean; // translate to English
}

export interface TranscriptionSegment {
  start: number; // start time in seconds
  end: number; // end time in seconds
  text: string; // transcribed text
  confidence?: number; // confidence score 0-1
}

export interface TranscriptionResult {
  text: string; // full transcription
  language: string; // detected/specified language
  duration: number; // processing time in ms
  segments: TranscriptionSegment[]; // individual segments
  audioUri?: string; // path to audio file
  timestamp?: number; // when transcription was created
}

export interface WhisperModelConfig {
  id: string; // model identifier
  name: string; // display name
  path: string; // local file path
  size: number; // file size in MB
  url: string; // download URL
}

export interface WhisperLoadState {
  isLoading: boolean;
  isLoaded: boolean;
  progress: number; // 0-100
  error?: string;
  modelName?: string;
}

export interface RealtimeTranscriptionCallback {
  onSegment?: (segment: TranscriptionSegment) => void;
  onProgress?: (progress: number) => void;
  onComplete?: (result: TranscriptionResult) => void;
  onError?: (error: Error) => void;
}
