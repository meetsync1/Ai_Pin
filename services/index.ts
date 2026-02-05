/**
 * Main exports for all services
 */

// Storage services
export { default as ModelStorage } from "./storage/ModelStorage";
export { default as TranscriptionStorage } from "./storage/TranscriptionStorage";

// AI services
export { default as WhisperService } from "./whisper/WhisperService";
export { default as LLMService } from "./llm/LLMService";
export { default as ModelManager } from "./llm/ModelManager";
export { default as SummarizationService } from "./summarization/SummarizationService";

// Whisper types
export type {
  RealtimeTranscriptionCallback,
  TranscriptionOptions,
  TranscriptionResult,
  TranscriptionSegment,
  WhisperLoadState,
  WhisperModelConfig
} from "./whisper/types";

// LLM types
export type {
  GenerationResult,
  LLMOptions,
  Message,
  ModelConfig,
  ModelDownloadProgress,
  ModelLoadState
} from "./llm/types";

// Storage types
export type { SavedTranscription } from "./storage/TranscriptionStorage";
export type { DownloadProgress } from "./storage/ModelStorage";

// Summarization types
export type { SummaryResult } from "./summarization/SummarizationService";

