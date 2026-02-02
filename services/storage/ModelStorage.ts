/**
 * ModelStorage - Manages model downloads and local storage
 */

import * as FileSystem from 'expo-file-system';
import { ModelConfig } from '../llm/types';

export interface DownloadProgress {
  bytesWritten: number;
  contentLength: number;
  percentage: number;
}

class ModelStorage {
  private readonly modelsDir = `${FileSystem.documentDirectory}models/`;

  constructor() {
    this.ensureModelsDirectory();
  }

  /**
   * Ensure models directory exists
   */
  private async ensureModelsDirectory() {
    try {
      const info = await FileSystem.getInfoAsync(this.modelsDir);
      if (!info.exists) {
        await FileSystem.makeDirectoryAsync(this.modelsDir, {
          intermediates: true,
        });
        console.log('✅ Models directory created');
      }
    } catch (error) {
      console.error('❌ Error creating models directory:', error);
    }
  }

  /**
   * Download a model from URL with new API
   */
  async downloadModel(
    modelId: string,
    url: string,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    const destination = `${this.modelsDir}${modelId}`;

    try {
      // Check if already downloaded
      const exists = await this.checkModelExists(modelId);
      if (exists) {
        console.log(`✅ Model already exists: ${modelId}`);
        return destination;
      }

      console.log(`⬇️ Downloading model from: ${url}`);
      console.log(`⬇️ Destination: ${destination}`);

      // Create download resumable
      const downloadResumable = FileSystem.createDownloadResumable(
        url,
        destination,
        {},
        (downloadProgress) => {
          const percentage =
            downloadProgress.totalBytesWritten /
            downloadProgress.totalBytesExpectedToWrite * 100;
          onProgress?.(percentage);
        }
      );

      const result = await downloadResumable.downloadAsync();
      
      if (!result) {
        throw new Error('Download failed');
      }

      console.log(`✅ Model downloaded: ${modelId}`);
      return result.uri;
    } catch (error) {
      console.error('❌ Download error:', error);
      // Clean up partial download
      await this.deleteModel(modelId);
      throw error;
    }
  }

  /**
   * Get model path by model ID
   */
  async getModelPath(modelId: string): Promise<string> {
    return `${this.modelsDir}${modelId}`;
  }

  /**
   * Check if model exists by model ID
   */
  async checkModelExists(modelId: string): Promise<boolean> {
    try {
      const path = await this.getModelPath(modelId);
      const info = await FileSystem.getInfoAsync(path);
      return info.exists;
    } catch {
      return false;
    }
  }

  /**
   * Check if model exists by filename (legacy)
   */
  async modelExists(filename: string): Promise<boolean> {
    try {
      const path = this.getModelPath(filename);
      const info = await FileSystem.getInfoAsync(path);
      return info.exists;
    } catch {
      return false;
    }
  }

  /**
   * Delete a model
   */
  async deleteModel(filename: string): Promise<void> {
    try {
      const path = this.getModelPath(filename);
      const exists = await this.modelExists(filename);
      if (exists) {
        await FileSystem.deleteAsync(path);
        console.log(`✅ Model deleted: ${filename}`);
      }
    } catch (error) {
      console.error('❌ Error deleting model:', error);
      throw error;
    }
  }

  /**
   * List all downloaded models
   */
  async listModels(): Promise<string[]> {
    try {
      const files = await FileSystem.readDirectoryAsync(this.modelsDir);
      return files.filter((file) => file.endsWith('.gguf') || file.endsWith('.bin'));
    } catch (error) {
      console.error('❌ Error listing models:', error);
      return [];
    }
  }

  /**
   * Get model file info
   */
  async getModelInfo(filename: string): Promise<FileSystem.FileInfo | null> {
    try {
      const path = this.getModelPath(filename);
      const info = await FileSystem.getInfoAsync(path, { size: true });
      return info.exists ? info : null;
    } catch {
      return null;
    }
  }

  /**
   * Get total storage used by models
   */
  async getTotalStorageUsed(): Promise<number> {
    try {
      const files = await this.listModels();
      let total = 0;

      for (const file of files) {
        const info = await this.getModelInfo(file);
        if (info && 'size' in info) {
          total += info.size;
        }
      }

      return total;
    } catch {
      return 0;
    }
  }

  /**
   * Clear all models
   */
  async clearAllModels(): Promise<void> {
    try {
      await FileSystem.deleteAsync(this.modelsDir);
      await this.ensureModelsDirectory();
      console.log('✅ All models cleared');
    } catch (error) {
      console.error('❌ Error clearing models:', error);
      throw error;
    }
  }
}

export default new ModelStorage();
