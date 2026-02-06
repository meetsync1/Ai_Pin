/**
 * ModelManager - Handles loading, unloading, and managing GGUF models
 * Using react-native-llama for on-device inference
 */

import { initLlama, LlamaContext, loadLlamaModelInfo } from 'llama.rn';
import { getInfoAsync } from 'expo-file-system/legacy';
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
   * Load a GGUF model from file system with corruption detection and recovery
   */
  async loadModel(config: ModelConfig): Promise<void> {
    const maxAttempts = 2; // Try twice: once with existing file, once with fresh download
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`📦 Loading model attempt ${attempt}/${maxAttempts}: ${config.name}`);
        await this._loadModelInternal(config);
        console.log(`✅ Model loaded successfully on attempt ${attempt}`);
        return; // Success!
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`❌ Model load attempt ${attempt} failed:`, errorMsg);
        
        // Check if error indicates corruption
        const isCorruption = 
          errorMsg.includes('corrupted') ||
          errorMsg.includes('not within the file bounds') ||
          errorMsg.includes('failed to load model') ||
          errorMsg.includes('invalid') ||
          errorMsg.toLowerCase().includes('crash');
        
        if (isCorruption && attempt < maxAttempts) {
          console.log(`🔄 Corruption detected, deleting and re-downloading model...`);
          
          // Delete the corrupted file
          try {
            const modelStorage = (await import('@/services/storage/ModelStorage')).default;
            const filepath = config.path.replace('file://', '');
            await modelStorage.deleteModel(filepath);
            console.log(`🗑️ Deleted corrupted model file`);
            
            // Re-download the model
            if (config.url) {
              console.log(`📥 Re-downloading model from ${config.url}...`);
              const newPath = await modelStorage.downloadModel(config.id, config.url);
              config.path = newPath; // Update path for next attempt
              console.log(`✅ Model re-downloaded successfully`);
            } else {
              throw new Error('Cannot re-download: no URL provided');
            }
          } catch (recoveryError) {
            console.error(`❌ Failed to recover from corruption:`, recoveryError);
            throw error; // Throw original error
          }
        } else {
          // Not corruption or last attempt failed
          throw error;
        }
      }
    }
  }

  /**
   * Internal model loading implementation
   */
  private async _loadModelInternal(config: ModelConfig): Promise<void> {
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
      // Strip file:// prefix if present - native APIs need raw paths
      const modelPath = config.path.replace(/^file:\/\//, '');

      // Check if model file exists
      const modelExists = await this.checkModelExists(config.path);
      if (!modelExists) {
        throw new Error(`Model file not found: ${config.path}`);
      }

      console.log(`📦 Loading model: ${config.name} from ${modelPath}`);

      // Load model info first (optional, for debugging)
      try {
        console.log('📋 Attempting to load model info...');
        const modelInfo = await loadLlamaModelInfo(modelPath);
        console.log('📊 Model info:', modelInfo);
      } catch (e) {
        console.log('⚠️ Could not load model info (non-critical)');
        console.log('⚠️ Error details:', e);
      }

      // Create context with the model
      console.log('🔄 Initializing LLM context (this may take 30-60 seconds)...');
      console.log('📊 Config: n_ctx=512, n_batch=64, n_gpu_layers=0');
      
      try {
        this.currentContext = await initLlama({
          model: modelPath,
          use_mmap: true, // Use memory mapping instead of loading entire file
          n_ctx: 512, // Minimal context to reduce memory (was 2048)
          n_batch: 64, // Minimal batch size (was 128)
          n_gpu_layers: 0, // CPU only to save memory
        });
        console.log('✅ LLM context initialized successfully');
      } catch (initError) {
        console.error('❌ initLlama failed:', initError);
        throw new Error(`Failed to initialize model: ${initError instanceof Error ? initError.message : 'Native crash - model may be incompatible or corrupted'}`);
      }

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
      const info = await getInfoAsync(path);
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
