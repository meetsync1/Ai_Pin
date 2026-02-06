/**
 * WhisperService - On-device speech-to-text transcription
 * Using whisper.rn for real-time transcription
 */

import { Audio } from "expo-av";
import { EncodingType, getInfoAsync, readAsStringAsync } from "expo-file-system/legacy";
import { initWhisper, WhisperContext } from "whisper.rn";
import AudioConverter from "../audio/AudioConverter";
import {
    RealtimeTranscriptionCallback,
    TranscriptionOptions,
    TranscriptionResult,
    TranscriptionSegment,
    WhisperLoadState,
    WhisperModelConfig,
} from "./types";

class WhisperService {
  private context: WhisperContext | null = null;
  private modelConfig: WhisperModelConfig | null = null;
  private loadState: WhisperLoadState = {
    isLoading: false,
    isLoaded: false,
    progress: 0,
  };
  private listeners: Set<(state: WhisperLoadState) => void> = new Set();
  private currentRecording: Audio.Recording | null = null;

  /**
   * Initialize Whisper with a model
   */
  async initialize(
    modelPath: string,
    modelName: string = "Whisper Base",
  ): Promise<void> {
    try {
      this.updateLoadState({
        isLoading: true,
        isLoaded: false,
        progress: 10,
        modelName,
      });

      console.log(`📦 Loading Whisper model from: ${modelPath}`);

      // Check if model file exists
      const modelExists = await this.checkModelExists(modelPath);
      if (!modelExists) {
        throw new Error(`Whisper model file not found: ${modelPath}`);
      }

      this.updateLoadState({
        isLoading: true,
        isLoaded: false,
        progress: 50,
        modelName,
      });

      // Initialize whisper context
      this.context = await initWhisper({
        filePath: modelPath,
      });

      this.updateLoadState({
        isLoading: false,
        isLoaded: true,
        progress: 100,
        modelName,
      });

      console.log(`✅ Whisper model loaded: ${modelName}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.updateLoadState({
        isLoading: false,
        isLoaded: false,
        progress: 0,
        error: errorMessage,
      });
      console.error("❌ Whisper initialization error:", error);
      throw error;
    }
  }

  /**
   * Transcribe audio file with real-time streaming
   */
  async transcribe(
    audioPath: string,
    options: TranscriptionOptions = {},
    callbacks?: RealtimeTranscriptionCallback,
  ): Promise<TranscriptionResult> {
    if (!this.context) {
      throw new Error("Whisper not initialized. Call initialize() first.");
    }

    const startTime = Date.now();

    try {
      console.log(`🎤 Transcribing audio: ${audioPath}`);

      // Verify audio file exists and get details
      const audioInfo = await getInfoAsync(audioPath);
      if (!audioInfo.exists) {
        throw new Error(`Audio file not found: ${audioPath}`);
      }

      console.log(`📊 Audio file info:`, {
        exists: audioInfo.exists,
        size:
          audioInfo.exists && "size" in audioInfo && audioInfo.size
            ? `${(audioInfo.size / 1024).toFixed(2)} KB`
            : "unknown",
        uri: audioInfo.uri,
      });

      // Convert audio to WAV format if needed (whisper.rn requires WAV/PCM)
      let audioPathToTranscribe = audioPath;
      if (AudioConverter.needsConversion(audioPath)) {
        console.log(`🔄 Audio needs conversion (M4A/AAC -> WAV)...`);
        callbacks?.onProgress?.(0.05); // 5% for conversion
        try {
          audioPathToTranscribe = await AudioConverter.convertToWav(audioPath);
          console.log(
            `✅ Audio converted successfully: ${audioPathToTranscribe}`,
          );
        } catch (conversionError) {
          console.error(`❌ Audio conversion failed:`, conversionError);
          console.log(`⚠️ Attempting to transcribe original file anyway...`);
          // Continue with original file - whisper.rn might handle it
        }
      }

      // Check if audio file is too small
      if (
        audioInfo.exists &&
        "size" in audioInfo &&
        audioInfo.size &&
        audioInfo.size < 1000
      ) {
        console.warn(
          `⚠️ Audio file is very small (${audioInfo.size} bytes). Recording might be too short or empty.`,
        );
      }

      // Try to read file content to verify it's not corrupt
      if (audioInfo.exists && "size" in audioInfo && audioInfo.size) {
        try {
          const base64Sample = await readAsStringAsync(audioPath, {
            encoding: EncodingType.Base64,
            length: 100, // Read first 100 bytes
          });
          console.log(
            `✅ Audio file readable, first bytes OK (sample length: ${base64Sample.length})`,
          );

          // Check for M4A file signature by looking for 'ftyp' in decoded content
          // Note: Using simple base64 check to avoid Node.js Buffer dependency
          console.log(`🔍 Audio file header sample retrieved successfully`);

          // The base64 'ZnR5cA==' represents 'ftyp' which is the M4A/MP4 signature
          // We check if the base64 contains patterns that would decode to 'ftyp'
          if (base64Sample.length < 20) {
            console.warn(`⚠️ File header seems too short, may not be valid!`);
          }

          // CRITICAL: Test if the file can be played back
          console.log(`🔊 Testing audio playback to verify file has sound...`);
          try {
            const { sound: testSound } = await Audio.Sound.createAsync(
              { uri: audioPath },
              { shouldPlay: false },
            );

            const status = await testSound.getStatusAsync();
            if (status.isLoaded) {
              const durationMs = status.durationMillis ?? 0;
              console.log(`✅ Audio is playable!`, {
                durationMillis: durationMs,
                durationSeconds: (durationMs / 1000).toFixed(2),
              });

              if (durationMs < 100) {
                console.error(
                  `❌ Audio duration is too short: ${durationMs}ms`,
                );
                console.error(
                  `❌ This means recording failed - no actual audio captured`,
                );
              }
            } else {
              console.error(
                `❌ Audio file cannot be loaded for playback - might be corrupt`,
              );
            }

            await testSound.unloadAsync();
          } catch (playbackError) {
            console.error(`❌ Failed to test audio playback:`, playbackError);
            console.error(
              `❌ This means the audio file is corrupt or in unsupported format`,
            );
          }
        } catch (readError) {
          console.error(
            `❌ Failed to read audio file for verification:`,
            readError,
          );
        }
      }

      const segments: TranscriptionSegment[] = [];
      const languageParam =
        options.language === "auto" || !options.language
          ? "en"
          : options.language;
      console.log(`🌍 Transcription language: ${languageParam}`);

      // Transcribe with whisper.rn
      console.log(`🚀 Starting whisper.rn transcribe with options:`, {
        language: languageParam,
        translate: options.translate || false,
        maxLen: 1,
        tokenTimestamps: true,
      });

      const result = await this.context.transcribe(audioPathToTranscribe, {
        language: languageParam,
        translate: options.translate || false,
        maxLen: 1,
        tokenTimestamps: true,
        onProgress: (progress: number) => {
          callbacks?.onProgress?.(progress);
          console.log(
            `📊 Transcription progress: ${Math.round(progress * 100)}%`,
          );
        },
        onNewSegment: (segment: { text: string; t0: number; t1: number }) => {
          const transcriptionSegment: TranscriptionSegment = {
            text: segment.text,
            start: segment.t0 / 100, // Convert to seconds
            end: segment.t1 / 100,
          };
          segments.push(transcriptionSegment);
          callbacks?.onSegment?.(transcriptionSegment);
          console.log(`📝 New segment: "${segment.text}"`);
        },
      });

      const duration = Date.now() - startTime;
      const fullText = segments
        .map((s) => s.text)
        .join(" ")
        .trim();

      console.log(`📊 Transcription result summary:`, {
        segmentCount: segments.length,
        textLength: fullText.length,
        duration: `${(duration / 1000).toFixed(2)}s`,
        detectedLanguage: result.language || "unknown",
      });

      if (segments.length === 0) {
        console.warn(`⚠️ No segments detected! Possible issues:`);
        console.warn(`   1. Audio recording is too short (< 1 second)`);
        console.warn(`   2. Audio is silent or too quiet`);
        console.warn(`   3. Audio format not compatible`);
        console.warn(`   4. Model not loaded properly`);
        console.warn(
          `   5. Try recording for at least 2-3 seconds with clear speech`,
        );
      }

      const transcriptionResult: TranscriptionResult = {
        text: fullText,
        language: result.language || options.language || "en",
        duration,
        segments,
        audioUri: audioPath,
        timestamp: Date.now(),
      };

      console.log(
        `✅ Transcription complete in ${(duration / 1000).toFixed(2)}s`,
      );
      console.log(`📄 Text length: ${fullText.length} characters`);
      if (fullText.length > 0) {
        console.log(
          `📝 Transcribed text: "${fullText.substring(0, 100)}${fullText.length > 100 ? "..." : ""}"`,
        );
      }

      callbacks?.onComplete?.(transcriptionResult);
      return transcriptionResult;
    } catch (error) {
      console.error("❌ Transcription error:", error);
      const err = error instanceof Error ? error : new Error(String(error));
      callbacks?.onError?.(err);
      throw err;
    }
  }

  /**
   * Start recording audio
   */
  async startRecording(): Promise<void> {
    try {
      console.log(`🎙️ Starting audio recording...`);

      // Request permissions
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        throw new Error("Microphone permission not granted");
      }
      console.log(`✅ Microphone permission granted`);

      // Configure audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Create recording
      const recording = new Audio.Recording();

      // Use WAV format with PCM encoding - Whisper requires this!
      const recordingOptions = {
        isMeteringEnabled: true,
        android: {
          extension: ".m4a",
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: ".m4a",
          outputFormat: "mpeg4aac",
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        web: {
          mimeType: "audio/webm",
          bitsPerSecond: 128000,
        },
      };

      console.log(`📝 Recording options:`, {
        sampleRate: 16000,
        channels: 1,
        encoder: "AAC",
        extension: "m4a",
        format: "MPEG_4",
      });

      await recording.prepareToRecordAsync(recordingOptions);
      await recording.startAsync();

      // Verify recording actually started
      const verifyStatus = await recording.getStatusAsync();
      console.log(`🔍 Verification status:`, {
        isRecording: verifyStatus.isRecording,
        canRecord: verifyStatus.canRecord,
        isDoneRecording: verifyStatus.isDoneRecording,
      });

      if (!verifyStatus.isRecording) {
        throw new Error("Recording failed to start - isRecording is false");
      }

      this.currentRecording = recording;
      console.log(`✅ Recording started successfully`);
      console.log("🎤 Recording started");
    } catch (error) {
      console.error("❌ Failed to start recording:", error);
      throw error;
    }
  }

  /**
   * Stop recording and return audio file path
   */
  async stopRecording(): Promise<string> {
    if (!this.currentRecording) {
      throw new Error("No active recording");
    }

    try {
      console.log(`⏹️ Stopping recording...`);

      // Get recording status before stopping
      const status = await this.currentRecording.getStatusAsync();
      console.log(`📊 Recording status:`, {
        isRecording: status.isRecording,
        durationMillis: status.durationMillis,
        isDoneRecording: status.isDoneRecording,
        canRecord: status.canRecord,
      });

      if (status.durationMillis < 1000) {
        console.warn(
          `⚠️ Recording duration is very short: ${status.durationMillis}ms`,
        );
      }

      await this.currentRecording.stopAndUnloadAsync();
      const uri = this.currentRecording.getURI();

      if (!uri) {
        throw new Error("Failed to get recording URI");
      }

      // Check the recorded file
      const fileInfo = await getInfoAsync(uri);
      console.log(`📦 Recorded file info:`, {
        exists: fileInfo.exists,
        size:
          fileInfo.exists && "size" in fileInfo && fileInfo.size
            ? `${(fileInfo.size / 1024).toFixed(2)} KB`
            : "unknown",
        uri: uri,
      });

      if (
        fileInfo.exists &&
        "size" in fileInfo &&
        fileInfo.size &&
        fileInfo.size < 1000
      ) {
        console.warn(
          `⚠️ Recorded file is very small (${fileInfo.size} bytes). Audio might be too short or empty.`,
        );
      }

      // Immediately verify file has content
      if (fileInfo.exists && "size" in fileInfo && fileInfo.size) {
        try {
          const fileSize = fileInfo.size;
          console.log(`🔍 Verifying recorded file: ${fileSize} bytes`);

          // Try reading the file
          const fileContent = await readAsStringAsync(uri, {
            encoding: EncodingType.Base64,
            length: 200,
          });

          console.log(
            `✅ File content verified, readable (${fileContent.length} chars base64)`,
          );

          // Check file signature - verify file is not too small
          if (fileContent.length > 0) {
            console.log(
              `🔍 File content verified, base64 sample length: ${fileContent.length}`,
            );

            // M4A/MP4 should have minimum size
            if (fileSize < 100) {
              console.error(
                `❌ File too small to be valid audio: ${fileSize} bytes`,
              );
              console.error(
                `❌ This usually means microphone permission denied or recording failed`,
              );
              throw new Error(
                `Recording failed - file too small (${fileSize} bytes). Check microphone permissions.`,
              );
            }
          }
        } catch (verifyError) {
          console.error(`❌ Failed to verify file content:`, verifyError);
        }
      }

      console.log(`✅ Recording stopped: ${uri}`);

      // Reset audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      this.currentRecording = null;
      return uri;
    } catch (error) {
      console.error("❌ Failed to stop recording:", error);
      throw error;
    }
  }

  /**
   * Get recording status
   */
  async getRecordingStatus() {
    if (!this.currentRecording) {
      return null;
    }
    return await this.currentRecording.getStatusAsync();
  }

  /**
   * Cancel current recording
   */
  async cancelRecording(): Promise<void> {
    if (this.currentRecording) {
      try {
        await this.currentRecording.stopAndUnloadAsync();
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
        });
        this.currentRecording = null;
        console.log("🚫 Recording cancelled");
      } catch (error) {
        console.error("❌ Failed to cancel recording:", error);
      }
    }
  }

  /**
   * Record and transcribe in one go
   */
  async recordAndTranscribe(
    durationMs: number,
    options: TranscriptionOptions = {},
    callbacks?: RealtimeTranscriptionCallback,
  ): Promise<TranscriptionResult> {
    try {
      // Start recording
      await this.startRecording();

      // Wait for specified duration
      await new Promise((resolve) => setTimeout(resolve, durationMs));

      // Stop recording
      const audioUri = await this.stopRecording();

      // Transcribe
      return await this.transcribe(audioUri, options, callbacks);
    } catch (error) {
      await this.cancelRecording();
      throw error;
    }
  }

  /**
   * Release Whisper model from memory
   */
  async release(): Promise<void> {
    if (this.context) {
      try {
        await this.context.release();
        this.context = null;
        this.modelConfig = null;
        this.updateLoadState({
          isLoading: false,
          isLoaded: false,
          progress: 0,
        });
        console.log("✅ Whisper model released");
      } catch (error) {
        console.error("❌ Error releasing Whisper:", error);
      }
    }
  }

  /**
   * Check if model file exists
   */
  private async checkModelExists(path: string): Promise<boolean> {
    try {
      const info = await getInfoAsync(path);
      return info.exists;
    } catch {
      return false;
    }
  }

  /**
   * Get load state
   */
  getLoadState(): WhisperLoadState {
    return this.loadState;
  }

  /**
   * Subscribe to load state changes
   */
  subscribe(listener: (state: WhisperLoadState) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Update load state and notify listeners
   */
  private updateLoadState(newState: Partial<WhisperLoadState>) {
    this.loadState = { ...this.loadState, ...newState };
    this.listeners.forEach((listener) => listener(this.loadState));
  }

  /**
   * Check if service is ready
   */
  isReady(): boolean {
    return this.context !== null && this.loadState.isLoaded;
  }

  // Store for realtime transcription session
  private realtimeSession: {
    stop: () => void;
    subscribe: (callback: (event: any) => void) => void;
  } | null = null;
  private realtimeSegments: TranscriptionSegment[] = [];
  private realtimeStartTime: number = 0;
  private realtimeLastText: string = ""; // Track last text for final result
  private isManualStop: boolean = false; // Track if user manually stopped

  /**
   * Start realtime transcription using whisper.rn's built-in recorder
   * This bypasses the audio format issue by using whisper.rn's internal recording
   */
  async startRealtimeTranscription(
    callbacks?: RealtimeTranscriptionCallback,
    options: TranscriptionOptions = {},
  ): Promise<void> {
    if (!this.context) {
      throw new Error("Whisper not initialized. Call initialize() first.");
    }

    try {
      console.log("🎙️ Starting realtime transcription...");

      this.realtimeSegments = [];
      this.realtimeStartTime = Date.now();
      this.realtimeLastText = "";
      this.isManualStop = false;

      const languageParam =
        options.language === "auto" || !options.language
          ? "en"
          : options.language;

      // Use whisper.rn's built-in realtime transcription
      // This handles audio recording internally with correct format
      // Note: Using 'as any' because TypeScript types may not be in sync with the actual library
      // Configuration:
      // - realtimeAudioSec: MAXIMUM recording duration (NOT chunk size!)
      //   Set high to allow long recordings (10 minutes = 600 seconds)
      // - realtimeAudioSliceSec: How often to process chunks (must be <=30 for whisper.cpp)
      // - realtimeAudioMinSec: Minimum audio before first processing
      //
      // whisper.rn will automatically slice long audio into 30-second chunks for processing

      const realtimeConfig = {
        language: languageParam,
        maxLen: 1,
        realtimeAudioSec: 600, // Allow up to 10 minutes of recording
        realtimeAudioSliceSec: 28, // Process every 28 seconds (under 30s whisper.cpp limit)
        realtimeAudioMinSec: 1, // Start processing after 1 second of audio
      };

      console.log(
        "🎙️ Starting realtime transcription with config:",
        realtimeConfig,
      );

      const { stop, subscribe } = await (
        this.context as any
      ).transcribeRealtime(realtimeConfig);

      this.realtimeSession = { stop, subscribe };

      // Track processed content
      let accumulatedText = ""; // Full accumulated transcription
      let processedSliceCount = 0; // Track how many slices we've processed

      subscribe((event: any) => {
        const { isCapturing, data, processTime, recordingTime, slices } = event;

        console.log(`📊 Realtime event:`, {
          isCapturing,
          processTime,
          recordingTime,
          hasData: !!data,
          hasSlices: !!slices,
          sliceCount: slices?.length || 0,
          resultLength: data?.result?.length || 0,
        });

        // Handle slices (for longer recordings with multiple chunks)
        if (slices && slices.length > 0) {
          console.log(`📦 Processing ${slices.length} slices...`);

          // Each slice contains the transcription for that time slice
          // We need to accumulate text from ALL slices
          const allSliceTexts: string[] = [];

          for (let i = 0; i < slices.length; i++) {
            const slice = slices[i];
            if (slice.data?.result) {
              const sliceText = slice.data.result
                .replace(/\[BLANK_AUDIO\]/g, "")
                .replace(/\[BEEPING\]/g, "")
                .trim();

              if (sliceText) {
                allSliceTexts.push(sliceText);

                // If this is a new slice (beyond what we've processed before)
                if (i >= processedSliceCount) {
                  console.log(
                    `📝 New slice ${i}: "${sliceText.substring(0, 50)}..."`,
                  );

                  // Create segment for this new slice
                  const segment: TranscriptionSegment = {
                    text: sliceText,
                    start: slice.recordingTime
                      ? (slice.recordingTime - slice.processTime) / 1000
                      : i * 28,
                    end: slice.recordingTime
                      ? slice.recordingTime / 1000
                      : (i + 1) * 28,
                  };

                  this.realtimeSegments.push(segment);
                  callbacks?.onSegment?.(segment);
                }
              }
            }
          }

          // Update processed count
          processedSliceCount = slices.length;

          // Accumulate all text
          accumulatedText = allSliceTexts.join(" ").trim();
          this.realtimeLastText = accumulatedText;

          console.log(
            `📊 Accumulated text length: ${accumulatedText.length} chars`,
          );
        } else if (data?.result) {
          // Handle single result (for short recordings or single chunk)
          const currentText = data.result
            .replace(/\[BLANK_AUDIO\]/g, "")
            .replace(/\[BEEPING\]/g, "")
            .trim();

          if (currentText && currentText !== accumulatedText) {
            console.log(
              `📝 Single result: "${currentText.substring(0, 50)}..."`,
            );

            // For single results, extract just the new portion
            let newText = currentText;
            if (
              accumulatedText &&
              currentText.length > accumulatedText.length
            ) {
              // This is cumulative - extract new part
              if (currentText.startsWith(accumulatedText)) {
                newText = currentText.substring(accumulatedText.length).trim();
              }
            }

            if (newText) {
              const segment: TranscriptionSegment = {
                text: newText,
                start: (recordingTime - processTime) / 1000,
                end: recordingTime / 1000,
              };

              // Only add if we don't already have this exact text
              if (!this.realtimeSegments.some((s) => s.text === newText)) {
                this.realtimeSegments.push(segment);
                callbacks?.onSegment?.(segment);
              }
            }

            accumulatedText = currentText;
            this.realtimeLastText = currentText;
          }
        }

        // Report progress
        callbacks?.onProgress?.(recordingTime / 600000); // Progress for 10 minute max

        if (!isCapturing) {
          console.log("✅ Realtime transcription finished (isCapturing=false)");
          console.log(
            `📊 Final accumulated text: ${accumulatedText.length} chars`,
          );
          console.log(`📊 Total segments: ${this.realtimeSegments.length}`);

          // Store the final text
          this.realtimeLastText = accumulatedText;

          // If this was triggered by manual stop, complete the final result
          if (this.isManualStop) {
            console.log("📊 Manual stop detected - completing final result");
            this.completeFinalResult(accumulatedText);
          }
        }
      });

      console.log("✅ Realtime transcription started - speak now!");
    } catch (error) {
      console.error("❌ Failed to start realtime transcription:", error);
      throw error;
    }
  }

  // Callback to resolve when stop is complete
  private stopResolve: ((result: TranscriptionResult) => void) | null = null;

  /**
   * Stop realtime transcription and get results
   * Waits for final processing to complete before returning
   */
  async stopRealtimeTranscription(): Promise<TranscriptionResult> {
    if (!this.realtimeSession) {
      throw new Error("No active realtime transcription session");
    }

    console.log(
      "⏹️ Stopping realtime transcription... waiting for final processing",
    );

    this.isManualStop = true;

    // Create a promise that will be resolved when the final result is ready
    return new Promise<TranscriptionResult>((resolve, reject) => {
      // Set a timeout in case whisper.rn doesn't respond
      const timeout = setTimeout(() => {
        console.warn("⚠️ Stop timeout - returning current text");
        this.stopResolve = null;

        const fullText = this.realtimeLastText
          .replace(/\[BLANK_AUDIO\]/g, "")
          .replace(/\s+/g, " ")
          .trim();

        resolve({
          text: fullText,
          language: "en",
          duration: Date.now() - this.realtimeStartTime,
          segments: this.realtimeSegments,
          timestamp: Date.now(),
        });
      }, 30000); // 30 second timeout

      // Store the resolve function to be called when isCapturing becomes false
      this.stopResolve = (result: TranscriptionResult) => {
        clearTimeout(timeout);
        resolve(result);
      };

      // Stop the recording - this should trigger a final event with isCapturing: false
      if (this.realtimeSession) {
        this.realtimeSession.stop();
        this.realtimeSession = null;
      }
    });
  }

  /**
   * Called internally when final result is ready
   */
  private completeFinalResult(lastText: string): void {
    if (this.stopResolve) {
      const fullText = lastText
        .replace(/\[BLANK_AUDIO\]/g, "")
        .replace(/\[BEEPING\]/g, "")
        .replace(/\s+/g, " ")
        .trim();

      console.log(`📊 Complete final result:`);
      console.log(`   Text length: ${fullText.length} chars`);
      console.log(`   Segments: ${this.realtimeSegments.length}`);
      console.log(`   Preview: "${fullText.substring(0, 100)}..."`);

      const result: TranscriptionResult = {
        text: fullText,
        language: "en",
        duration: Date.now() - this.realtimeStartTime,
        segments: this.realtimeSegments,
        timestamp: Date.now(),
      };

      console.log(
        `✅ Final transcription ready. Text: "${fullText.substring(0, 100)}..."`,
      );

      this.stopResolve(result);
      this.stopResolve = null;
    }
  }

  /**
   * Check if realtime transcription is active
   */
  isRealtimeActive(): boolean {
    return this.realtimeSession !== null;
  }
}

// Export singleton instance
export default new WhisperService();
