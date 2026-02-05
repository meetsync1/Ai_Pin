/**
 * ModelManager - Handles loading, unloading, and managing GGUF models
 * Using react-native-llama for on-device inference
 */

import { initLlama, LlamaContext, loadLlamaModelInfo } from 'llama.rn';
import * as FileSystem from 'expo-file-system';
import { ModelConfig, ModelLoadState } from './types';

class ModelManager {
  private currentContext: LlamaContext | null = null;
  private modelConfig: ModelConfig | null = null;
  private loadState: ModelLoadState = {
    isLoading: false,
    isLoaded: false,
    progress: 0,
  };
  private listeners: Set<(state: ModelLoadState) => void> = new Set();

  constructor() {
    console.log('✅ ModelManager initialized with react-native-llama');
  }

  /**
   * Load a GGUF model from file system
   */
  async loadModel(config: ModelConfig): Promise<void> {
    if (this.currentContext) {
      await this.unloadModel();
    }

    this.updateLoadState({
      isLoading: true,
      isLoaded: false,
      progress: 0,
      modelName: config.name,
    });

    try {
      // Check if model file exists
      const modelExists = await this.checkModelExists(config.path);
      if (!modelExists) {
        throw new Error(`Model file not found: ${config.path}`);
      }

      console.log(`📦 Loading model: ${config.name} from ${config.path}`);

      // Load model info first (optional, for debugging)
      try {
        const modelInfo = await loadLlamaModelInfo(config.path);
        console.log('📊 Model info:', modelInfo);
      } catch (e) {
        console.log('⚠️ Could not load model info (non-critical)');
      }

      // Create context with the model
      this.currentContext = await initLlama({
        model: config.path,
        use_mlock: true,
        n_ctx: config.contextLength,
        n_batch: 512,
        n_gpu_layers: 0, // Set to > 0 for GPU acceleration on supported devices
      });

      this.modelConfig = config;

      this.updateLoadState({
        isLoading: false,
        isLoaded: true,
        progress: 100,
        modelName: config.name,
      });

      console.log(`✅ Model loaded: ${config.name}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.updateLoadState({
        isLoading: false,
        isLoaded: false,
        progress: 0,
        error: errorMessage,
      });
      console.error('❌ Model loading error:', error);
      throw error;
    }
  }

  /**
   * Unload current model
   */
  async unloadModel(): Promise<void> {
    if (this.currentContext) {
      try {
        await this.currentContext.release();
        this.currentContext = null;
        this.modelConfig = null;
        this.updateLoadState({
          isLoading: false,
          isLoaded: false,
          progress: 0,
        });
        console.log('✅ Model unloaded');
      } catch (error) {
        console.error('❌ Error unloading model:', error);
      }
    }
  }

  /**
   * Check if a model file exists
   */
  private async checkModelExists(path: string): Promise<boolean> {
    try {
      const info = await FileSystem.getInfoAsync(path);
      return info.exists;
    } catch {
      return false;
    }
  }

  /**
   * Get current model context
   */
  getModel(): LlamaContext | null {
    return this.currentContext;
  }

  /**
   * Get current model config
   */
  getModelConfig(): ModelConfig | null {
    return this.modelConfig;
  }

  /**
   * Get load state
   */
  getLoadState(): ModelLoadState {
    return this.loadState;
  }

  /**
   * Subscribe to load state changes
   */
  subscribe(listener: (state: ModelLoadState) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Update load state and notify listeners
   */
  private updateLoadState(newState: Partial<ModelLoadState>) {
    this.loadState = { ...this.loadState, ...newState };
    this.listeners.forEach(listener => listener(this.loadState));
  }

  /**
   * Check if model is ready
   */
  isReady(): boolean {
    return this.loadState.isLoaded && this.currentContext !== null;
  }
}

export default new ModelManager();
