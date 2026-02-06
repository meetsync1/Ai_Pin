/**
 * ModelStorage - Download and manage Whisper/LLM model files
 */

import type { FileInfo } from "expo-file-system";
import { 
  createDownloadResumable, 
  getInfoAsync, 
  makeDirectoryAsync, 
  readDirectoryAsync,
  deleteAsync,
  documentDirectory
} from "expo-file-system/legacy";

export interface DownloadProgress {
  totalBytesWritten: number;
  totalBytesExpectedToWrite: number;
  progress: number; // 0-1
}

interface ModelFileInfo {
  expectedSize?: number;
  checksum?: string;
  lastValidated?: number;
}

class ModelStorage {
  private activeDownloads: Map<string, Promise<string>> = new Map();
  private modelInfo: Map<string, ModelFileInfo> = new Map();
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly INTEGRITY_CHECK_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
  
  private get modelsDir(): string {
    if (!documentDirectory) {
      throw new Error("FileSystem.documentDirectory is not available");
    }
    return `${documentDirectory}models/`;
  }

  /**
   * Ensure models directory exists
   */
  private async ensureDirectoryExists(): Promise<void> {
    try {
      const dirInfo = await getInfoAsync(this.modelsDir);
      if (!dirInfo.exists) {
        await makeDirectoryAsync(this.modelsDir, {
          intermediates: true,
        });
        console.log(`📁 Created models directory: ${this.modelsDir}`);
      }
    } catch (error) {
      console.error("❌ Failed to create models directory:", error);
      throw error;
    }
  }

  /**
   * Validate file integrity by checking size and basic structure
   */
  private async validateFileIntegrity(
    filepath: string,
    expectedSize?: number
  ): Promise<boolean> {
    try {
      const fileInfo = await getInfoAsync(filepath);
      
      if (!fileInfo.exists) {
        console.log(`⚠️ File does not exist: ${filepath}`);
        return false;
      }

      // Check file size
      if (!fileInfo.size || fileInfo.size === 0) {
        console.log(`❌ File is empty: ${filepath}`);
        return false;
      }

      // If we know the expected size, validate it
      if (expectedSize && fileInfo.size !== expectedSize) {
        console.log(
          `❌ File size mismatch: expected ${expectedSize}, got ${fileInfo.size}`
        );
        return false;
      }

      // For GGUF files, check magic number (basic structure validation)
      if (filepath.endsWith('.gguf')) {
        // GGUF files should be at least 1KB (metadata header)
        if (fileInfo.size < 1024) {
          console.log(`❌ GGUF file too small: ${fileInfo.size} bytes`);
          return false;
        }
      }

      console.log(`✅ File integrity check passed: ${filepath}`);
      return true;
    } catch (error) {
      console.error(`❌ File integrity check failed:`, error);
      return false;
    }
  }

  /**
   * Download a model from URL with progress tracking and retry logic
   */
  async downloadModel(
    modelId: string,
    url: string,
    onProgress?: (progress: number) => void,
  ): Promise<string> {
    // Check if download is already in progress for this model
    const filename = url.split("/").pop() || modelId;
    const filepath = `${this.modelsDir}${filename}`;
    
    if (this.activeDownloads.has(filepath)) {
      console.log(`⏳ Download already in progress for ${filename}, waiting...`);
      return this.activeDownloads.get(filepath)!;
    }
    
    // Create download promise with retry logic
    const downloadPromise = this._performDownloadWithRetry(
      modelId,
      url,
      onProgress,
      filepath,
      filename
    );
    
    // Store it to prevent duplicate downloads
    this.activeDownloads.set(filepath, downloadPromise);
    
    try {
      const result = await downloadPromise;
      return result;
    } finally {
      // Clean up when done (success or failure)
      this.activeDownloads.delete(filepath);
    }
  }

  /**
   * Download with automatic retry on failure
   */
  private async _performDownloadWithRetry(
    modelId: string,
    url: string,
    onProgress: ((progress: number) => void) | undefined,
    filepath: string,
    filename: string
  ): Promise<string> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.MAX_RETRY_ATTEMPTS; attempt++) {
      try {
        console.log(`📥 Download attempt ${attempt}/${this.MAX_RETRY_ATTEMPTS}`);
        
        // Delete any partial/corrupted file from previous attempt
        if (attempt > 1) {
          try {
            await deleteAsync(filepath, { idempotent: true });
            console.log(`🗑️ Deleted partial file from previous attempt`);
          } catch (e) {
            // Ignore deletion errors
          }
        }
        
        const result = await this._performDownload(
          modelId,
          url,
          onProgress,
          filepath,
          filename
        );
        
        // Validate the downloaded file
        const isValid = await this.validateFileIntegrity(filepath);
        
        if (!isValid) {
          throw new Error('Downloaded file failed integrity check');
        }
        
        console.log(`✅ Download completed and validated successfully`);
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.error(`❌ Download attempt ${attempt} failed:`, lastError.message);
        
        if (attempt < this.MAX_RETRY_ATTEMPTS) {
          const waitTime = attempt * 2000; // Exponential backoff: 2s, 4s, 6s
          console.log(`⏳ Waiting ${waitTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }
    
    throw new Error(
      `Failed to download model after ${this.MAX_RETRY_ATTEMPTS} attempts. ` +
      `Last error: ${lastError?.message || 'Unknown error'}`
    );
  }

  /**
   * Internal download implementation
   */
  private async _performDownload(
    modelId: string,
    url: string,
    onProgress: ((progress: number) => void) | undefined,
    filepath: string,
    filename: string
  ): Promise<string> {
    try {
      await this.ensureDirectoryExists();

      console.log(`📥 Downloading model: ${filename}`);
      console.log(`📍 URL: ${url}`);
      console.log(`💾 Destination: ${filepath}`);

      const downloadResumable = createDownloadResumable(
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

      // Store file info for future validation
      const fileInfo = await getInfoAsync(filepath);
      if (fileInfo.exists && fileInfo.size) {
        this.modelInfo.set(filepath, {
          expectedSize: fileInfo.size,
          lastValidated: Date.now(),
        });
      }

      console.log(`✅ Model downloaded successfully: ${result.uri}`);
      return result.uri;
    } catch (error) {
      console.error("❌ Model download error:", error);
      throw error;
    }
  }

  /**
   * Check if a model exists locally and is valid
   */
  async checkModelExists(modelId: string): Promise<boolean> {
    try {
      const filepath = await this.getModelPath(modelId);
      const info = await getInfoAsync(filepath);
      
      if (!info.exists) {
        return false;
      }

      // Check if file is empty or suspiciously small
      if (!info.size || info.size < 1024) {
        console.log(`⚠️ Model file is too small (${info.size} bytes), marking as invalid`);
        // Delete the invalid file
        await deleteAsync(filepath, { idempotent: true });
        return false;
      }

      // Periodic integrity check (every 24 hours)
      const storedInfo = this.modelInfo.get(filepath);
      if (storedInfo?.lastValidated) {
        const timeSinceValidation = Date.now() - storedInfo.lastValidated;
        if (timeSinceValidation < this.INTEGRITY_CHECK_INTERVAL) {
          // Recently validated, trust it
          return true;
        }
      }

      // Perform integrity check
      const isValid = await this.validateFileIntegrity(
        filepath,
        storedInfo?.expectedSize
      );

      if (!isValid) {
        console.log(`⚠️ Model file failed integrity check, will re-download`);
        await deleteAsync(filepath, { idempotent: true });
        this.modelInfo.delete(filepath);
        return false;
      }

      // Update validation timestamp
      this.modelInfo.set(filepath, {
        ...storedInfo,
        expectedSize: info.size,
        lastValidated: Date.now(),
      });

      return true;
    } catch (error) {
      console.error(`❌ Error checking model existence:`, error);
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
      const files = await readDirectoryAsync(this.modelsDir);

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
      await deleteAsync(filepath, { idempotent: true });
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
      const files = await readDirectoryAsync(this.modelsDir);
      return files;
    } catch (error) {
      console.error("❌ Failed to list models:", error);
      return [];
    }
  }

  /**
   * Get model file info
   */
  async getModelInfo(modelId: string): Promise<FileInfo | null> {
    try {
      const filepath = await this.getModelPath(modelId);
      return await getInfoAsync(filepath);
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
      await deleteAsync(this.modelsDir, { idempotent: true });
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
