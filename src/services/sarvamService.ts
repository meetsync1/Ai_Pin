/**
 * sarvamService.ts
 *
 * ARCHITECTURE NOTE:
 * The frontend NEVER calls Sarvam APIs directly.
 * All Sarvam batch transcription calls go through the backend proxy (backendService.ts)
 * so that API keys stay server-side and are never bundled in the app binary.
 *
 * This file only re-exports the shared type definitions used to type backend responses.
 */

/** Possible states returned by the Sarvam batch job API, mirrored from backend responses. */
export type SarvamJobState = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";

/** Shape of a single diarized transcript entry from Sarvam's saaras:v3 model. */
export interface DiarizedEntry {
  transcript: string;
  start_time_seconds: number;
  end_time_seconds: number;
  speaker_id: string;
}

/** Full diarized transcript block returned per file. */
export interface DiarizedTranscript {
  entries: DiarizedEntry[];
}

/** Per-file output from the Sarvam batch job /outputs endpoint. */
export interface SarvamFileOutput {
  file_id?: string;
  file_name?: string;
  transcript?: string;
  diarized_transcript?: DiarizedTranscript;
  language_code?: string;
  error_message?: string;
}
