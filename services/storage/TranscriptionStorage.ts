/**
 * TranscriptionStorage - Save and manage transcription files (JSON & SRT)
 */

import {
  documentDirectory,
  getInfoAsync,
  makeDirectoryAsync,
  readDirectoryAsync,
  readAsStringAsync,
  writeAsStringAsync,
  deleteAsync,
  copyAsync,
  EncodingType,
} from "expo-file-system/legacy";
import { TranscriptionResult, TranscriptionSegment } from "../whisper/types";

export interface SavedTranscription {
  id: string;
  filename: string;
  timestamp: number;
  duration: number;
  textPreview: string;
  language: string;
  audioUri?: string;
}

class TranscriptionStorage {
  private get transcriptionsDir(): string {
    return `${documentDirectory}transcriptions/`;
  }

  /**
   * Ensure transcriptions directory exists
   */
  private async ensureDirectoryExists(): Promise<void> {
    try {
      const dirInfo = await getInfoAsync(this.transcriptionsDir);
      if (!dirInfo.exists) {
        await makeDirectoryAsync(this.transcriptionsDir, {
          intermediates: true,
        });
        console.log(
          `📁 Created transcriptions directory: ${this.transcriptionsDir}`,
        );
      }
    } catch (error) {
      console.error("❌ Failed to create transcriptions directory:", error);
    }
  }

  /**
   * Generate unique filename based on timestamp
   */
  private generateFilename(extension: "json" | "srt"): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    return `transcription_${timestamp}.${extension}`;
  }

  /**
   * Get transcriptions directory path
   */
  public getTranscriptionsDirectory(): string {
    return this.transcriptionsDir;
  }

  /**
   * Delete a transcription and its associated files
   */
  public async deleteTranscription(filename: string): Promise<void> {
    try {
      // Delete JSON file
      const jsonPath = `${this.transcriptionsDir}${filename}`;
      const jsonInfo = await getInfoAsync(jsonPath);
      if (jsonInfo.exists) {
        await deleteAsync(jsonPath);
        console.log(`🗑 Deleted JSON: ${filename}`);
      }

      // Delete SRT file
      const srtFilename = filename.replace(".json", ".srt");
      const srtPath = `${this.transcriptionsDir}${srtFilename}`;
      const srtInfo = await getInfoAsync(srtPath);
      if (srtInfo.exists) {
        await deleteAsync(srtPath);
        console.log(`🗑 Deleted SRT: ${srtFilename}`);
      }
    } catch (error) {
      console.error("❌ Failed to delete transcription:", error);
      throw error;
    }
  }

  /**
   * Save transcription as JSON
   */
  async saveAsJson(result: TranscriptionResult): Promise<string> {
    try {
      await this.ensureDirectoryExists();

      const filename = this.generateFilename("json");
      const filepath = `${this.transcriptionsDir}${filename}`;

      const jsonData = {
        id: filename.replace(".json", ""),
        timestamp: result.timestamp || Date.now(),
        language: result.language,
        duration: result.duration,
        audioUri: result.audioUri,
        text: result.text,
        segments: result.segments,
        metadata: {
          createdAt: new Date().toISOString(),
          version: "1.0",
        },
      };

      await writeAsStringAsync(
        filepath,
        JSON.stringify(jsonData, null, 2),
        { encoding: EncodingType.UTF8 },
      );

      console.log(`✅ Saved transcription as JSON: ${filepath}`);
      return filepath;
    } catch (error) {
      console.error("❌ Failed to save JSON:", error);
      throw error;
    }
  }

  /**
   * Save transcription as SRT (SubRip subtitle format)
   */
  async saveAsSrt(result: TranscriptionResult): Promise<string> {
    try {
      await this.ensureDirectoryExists();

      const filename = this.generateFilename("srt");
      const filepath = `${this.transcriptionsDir}${filename}`;

      const srtContent = this.convertToSrt(result.segments);

      await writeAsStringAsync(filepath, srtContent, {
        encoding: EncodingType.UTF8,
      });

      console.log(`✅ Saved transcription as SRT: ${filepath}`);
      return filepath;
    } catch (error) {
      console.error("❌ Failed to save SRT:", error);
      throw error;
    }
  }

  /**
   * Convert segments to SRT format
   */
  private convertToSrt(segments: TranscriptionSegment[]): string {
    let srtContent = "";

    segments.forEach((segment, index) => {
      const startTime = this.formatSrtTime(segment.start);
      const endTime = this.formatSrtTime(segment.end);
      const text = segment.text.trim();

      srtContent += `${index + 1}\n`;
      srtContent += `${startTime} --> ${endTime}\n`;
      srtContent += `${text}\n\n`;
    });

    return srtContent;
  }

  /**
   * Format time in SRT format (HH:MM:SS,mmm)
   */
  private formatSrtTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const milliseconds = Math.floor((seconds % 1) * 1000);

    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")},${String(milliseconds).padStart(3, "0")}`;
  }

  /**
   * Save transcription in both formats
   */
  async saveBoth(
    result: TranscriptionResult,
  ): Promise<{ json: string; srt: string }> {
    const [jsonPath, srtPath] = await Promise.all([
      this.saveAsJson(result),
      this.saveAsSrt(result),
    ]);

    return { json: jsonPath, srt: srtPath };
  }

  /**
   * List all saved transcriptions
   */
  async listTranscriptions(): Promise<SavedTranscription[]> {
    try {
      await this.ensureDirectoryExists();

      const files = await readDirectoryAsync(this.transcriptionsDir);
      const jsonFiles = files.filter((file) => file.endsWith(".json"));

      const transcriptions: SavedTranscription[] = [];

      for (const file of jsonFiles) {
        try {
          const filepath = `${this.transcriptionsDir}${file}`;
          const content = await readAsStringAsync(filepath);
          const data = JSON.parse(content);

          transcriptions.push({
            id: data.id,
            filename: file,
            timestamp: data.timestamp,
            duration: data.duration,
            textPreview:
              data.text.substring(0, 100) +
              (data.text.length > 100 ? "..." : ""),
            language: data.language,
            audioUri: data.audioUri,
          });
        } catch (error) {
          console.error(`Failed to read transcription: ${file}`, error);
        }
      }

      // Sort by timestamp (newest first)
      transcriptions.sort((a, b) => b.timestamp - a.timestamp);

      return transcriptions;
    } catch (error) {
      console.error("❌ Failed to list transcriptions:", error);
      return [];
    }
  }

  /**
   * Load a specific transcription
   */
  async loadTranscription(
    filename: string,
  ): Promise<TranscriptionResult | null> {
    try {
      const filepath = `${this.transcriptionsDir}${filename}`;
      const content = await readAsStringAsync(filepath);
      const data = JSON.parse(content);

      return {
        text: data.text,
        language: data.language,
        duration: data.duration,
        segments: data.segments,
        audioUri: data.audioUri,
        timestamp: data.timestamp,
      };
    } catch (error) {
      console.error("❌ Failed to load transcription:", error);
      return null;
    }
  }

  /**
   * Clear all transcriptions
   */
  async clearAll(): Promise<void> {
    try {
      await deleteAsync(this.transcriptionsDir, {
        idempotent: true,
      });
      await this.ensureDirectoryExists();
      console.log("✅ Cleared all transcriptions");
    } catch (error) {
      console.error("❌ Failed to clear transcriptions:", error);
      throw error;
    }
  }

  /**
   * Export transcription to a specific location
   */
  async exportTranscription(
    filename: string,
    destinationUri: string,
    format: "json" | "srt" = "json",
  ): Promise<void> {
    try {
      const sourceFile = filename.endsWith(`.${format}`)
        ? filename
        : filename.replace(/\.(json|srt)$/, `.${format}`);
      const sourcePath = `${this.transcriptionsDir}${sourceFile}`;

      await copyAsync({
        from: sourcePath,
        to: destinationUri,
      });

      console.log(`✅ Exported transcription to: ${destinationUri}`);
    } catch (error) {
      console.error("❌ Failed to export transcription:", error);
      throw error;
    }
  }
}

// Export singleton instance
export default new TranscriptionStorage();
