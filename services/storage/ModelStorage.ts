/**
 * ModelStorage - Download and manage Whisper/LLM model files
 */

import * as FileSystem from "expo-file-system";

export interface DownloadProgress {
  totalBytesWritten: number;
  totalBytesExpectedToWrite: number;
  progress: number; // 0-1
}

class ModelStorage {
  private readonly modelsDir = `${FileSystem.documentDirectory}models/`;

  constructor() {
    this.ensureDirectoryExists();
  }

  /**
   * Ensure models directory exists
   */
  private async ensureDirectoryExists(): Promise<void> {
    try {
      const dirInfo = await FileSystem.getInfoAsync(this.modelsDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.modelsDir, {
          intermediates: true,
        });
        console.log(`📁 Created models directory: ${this.modelsDir}`);
      }
    } catch (error) {
      console.error("❌ Failed to create models directory:", error);
    }
  }

  /**
   * Download a model from URL with progress tracking
   */
  async downloadModel(
    modelId: string,
    url: string,
    onProgress?: (progress: number) => void,
  ): Promise<string> {
    try {
      await this.ensureDirectoryExists();

      const filename = url.split("/").pop() || modelId;
      const filepath = `${this.modelsDir}${filename}`;

      console.log(`📥 Downloading model: ${filename}`);
      console.log(`📍 URL: ${url}`);
      console.log(`💾 Destination: ${filepath}`);

      const downloadResumable = FileSystem.createDownloadResumable(
        url,
        filepath,
        {},
        (downloadProgress) => {
          const progress =
            downloadProgress.totalBytesWritten /
            downloadProgress.totalBytesExpectedToWrite;
          onProgress?.(progress);

          const percent = (progress * 100).toFixed(1);
          const downloaded = (
            downloadProgress.totalBytesWritten /
            1024 /
            1024
          ).toFixed(1);
          const total = (
            downloadProgress.totalBytesExpectedToWrite /
            1024 /
            1024
          ).toFixed(1);

          console.log(
            `📊 Download progress: ${percent}% (${downloaded}/${total} MB)`,
          );
        },
      );

      const result = await downloadResumable.downloadAsync();

      if (!result) {
        throw new Error("Download failed - no result returned");
      }

      console.log(`✅ Model downloaded successfully: ${result.uri}`);
      return result.uri;
    } catch (error) {
      console.error("❌ Model download error:", error);
      throw error;
    }
  }

  /**
   * Check if a model exists locally
   */
  async checkModelExists(modelId: string): Promise<boolean> {
    try {
      const filepath = await this.getModelPath(modelId);
      const info = await FileSystem.getInfoAsync(filepath);
      return info.exists;
    } catch {
      return false;
    }
  }

  /**
   * Get the full path for a model
   */
  async getModelPath(modelId: string): Promise<string> {
    await this.ensureDirectoryExists();

    // If modelId is already a full path, return it
    if (modelId.includes(this.modelsDir)) {
      return modelId;
    }

    // If it's just a filename, prepend the models directory
    if (modelId.includes(".")) {
      return `${this.modelsDir}${modelId}`;
    }

    // Try to find the model file in the directory
    try {
      const files = await FileSystem.readDirectoryAsync(this.modelsDir);

      // For whisper models, map ID to actual filenames
      const modelFileMap: Record<string, string> = {
        "whisper-base": "ggml-base.bin",
        "whisper-tiny": "ggml-tiny.bin",
        "whisper-small": "ggml-small.bin",
      };

      // Check if we have a mapping
      if (modelFileMap[modelId]) {
        return `${this.modelsDir}${modelFileMap[modelId]}`;
      }

      // Otherwise search for matching file
      const matchingFile = files.find((file) => file.includes(modelId));
      if (matchingFile) {
        return `${this.modelsDir}${matchingFile}`;
      }
    } catch (error) {
      console.log("⚠️ Could not read models directory:", error);
    }

    // Default: assume it's a .bin file
    return `${this.modelsDir}${modelId}.bin`;
  }

  /**
   * Delete a model file
   */
  async deleteModel(modelId: string): Promise<void> {
    try {
      const filepath = await this.getModelPath(modelId);
      await FileSystem.deleteAsync(filepath, { idempotent: true });
      console.log(`✅ Deleted model: ${modelId}`);
    } catch (error) {
      console.error("❌ Failed to delete model:", error);
      throw error;
    }
  }

  /**
   * List all downloaded models
   */
  async listModels(): Promise<string[]> {
    try {
      await this.ensureDirectoryExists();
      const files = await FileSystem.readDirectoryAsync(this.modelsDir);
      return files;
    } catch (error) {
      console.error("❌ Failed to list models:", error);
      return [];
    }
  }

  /**
   * Get model file info
   */
  async getModelInfo(modelId: string): Promise<FileSystem.FileInfo | null> {
    try {
      const filepath = await this.getModelPath(modelId);
      return await FileSystem.getInfoAsync(filepath);
    } catch (error) {
      console.error("❌ Failed to get model info:", error);
      return null;
    }
  }

  /**
   * Get models directory path
   */
  getModelsDirectory(): string {
    return this.modelsDir;
  }

  /**
   * Clear all models
   */
  async clearAllModels(): Promise<void> {
    try {
      await FileSystem.deleteAsync(this.modelsDir, { idempotent: true });
      await this.ensureDirectoryExists();
      console.log("✅ Cleared all models");
    } catch (error) {
      console.error("❌ Failed to clear models:", error);
      throw error;
    }
  }
}

// Export singleton instance
export default new ModelStorage();
