/**
 * Type declarations for whisper.rn
 * Since the package doesn't include TypeScript definitions
 */

declare module "whisper.rn" {
  export interface WhisperContext {
    /**
     * Transcribe an audio file
     */
    transcribe(
      audioPath: string,
      options?: {
        language?: string;
        translate?: boolean;
        maxLen?: number;
        tokenTimestamps?: boolean;
        onProgress?: (progress: number) => void;
        onNewSegment?: (segment: {
          text: string;
          t0: number;
          t1: number;
        }) => void;
      },
    ): Promise<{
      text: string;
      language?: string;
      segments?: Array<{
        text: string;
        t0: number;
        t1: number;
      }>;
    }>;

    /**
     * Release the Whisper context from memory
     */
    release(): Promise<void>;
  }

  export interface WhisperInitOptions {
    filePath: string;
    isBundleAsset?: boolean;
  }

  /**
   * Initialize Whisper with a model file
   */
  export function initWhisper(
    options: WhisperInitOptions,
  ): Promise<WhisperContext>;
}
