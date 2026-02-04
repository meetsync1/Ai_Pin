/**
 * Whisper model configurations and constants
 */

import { WhisperModelConfig } from "@/services/whisper/types";
import * as FileSystem from "expo-file-system";

// Whisper Base Model Configuration
export const WHISPER_BASE_MODEL: WhisperModelConfig = {
  id: "whisper-base",
  name: "Whisper Base",
  path: `${FileSystem.documentDirectory}models/ggml-base.bin`,
  size: 142, // ~142 MB
  url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin",
};

// Whisper Tiny Model (faster, less accurate)
export const WHISPER_TINY_MODEL: WhisperModelConfig = {
  id: "whisper-tiny",
  name: "Whisper Tiny",
  path: `${FileSystem.documentDirectory}models/ggml-tiny.bin`,
  size: 75, // ~75 MB
  url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin",
};

// Whisper Small Model (better accuracy, slower)
export const WHISPER_SMALL_MODEL: WhisperModelConfig = {
  id: "whisper-small",
  name: "Whisper Small",
  path: `${FileSystem.documentDirectory}models/ggml-small.bin`,
  size: 466, // ~466 MB
  url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin",
};

// Default model to use
export const DEFAULT_WHISPER_MODEL = WHISPER_BASE_MODEL;

// Supported languages
export const SUPPORTED_LANGUAGES = [
  { code: "auto", label: "Auto Detect" },
  { code: "en", label: "English" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "it", label: "Italian" },
  { code: "pt", label: "Portuguese" },
  { code: "ru", label: "Russian" },
  { code: "ja", label: "Japanese" },
  { code: "ko", label: "Korean" },
  { code: "zh", label: "Chinese" },
  { code: "ar", label: "Arabic" },
  { code: "hi", label: "Hindi" },
];

// Audio recording settings
export const AUDIO_SETTINGS = {
  sampleRate: 16000, // Whisper works best with 16kHz
  channels: 1, // Mono
  bitRate: 128000,
  format: "wav",
};

// Maximum recording duration (in milliseconds)
export const MAX_RECORDING_DURATION = 300000; // 5 minutes

// File size limits
export const MAX_AUDIO_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
