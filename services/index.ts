/**
 * Main exports for all services
 */

export { default as ModelStorage } from "./storage/ModelStorage";
export { default as TranscriptionStorage } from "./storage/TranscriptionStorage";
export { default as WhisperService } from "./whisper/WhisperService";

export type {
    RealtimeTranscriptionCallback, TranscriptionOptions,
    TranscriptionResult,
    TranscriptionSegment, WhisperLoadState, WhisperModelConfig
} from "./whisper/types";

export type { SavedTranscription } from "./storage/TranscriptionStorage";

export type { DownloadProgress } from "./storage/ModelStorage";
