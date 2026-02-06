/**
 * AppInitializer - Handles model download and initialization on app launch
 */

import { useState, useEffect } from 'react';
import ModelStorage from '@/services/storage/ModelStorage';
import ModelManager from '@/services/llm/ModelManager';
import { DEFAULT_MODEL } from '@/constants/models';

export interface InitializationState {
  isInitializing: boolean;
  isReady: boolean;
  progress: number;
  currentStep: string;
  error?: string;
}

export function useAppInitialization() {
  const [state, setState] = useState<InitializationState>({
    isInitializing: true,
    isReady: false,
    progress: 0,
    currentStep: 'Starting...',
  });

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      console.log('🚀 Starting app initialization...');
      
      setState({
        isInitializing: true,
        isReady: false,
        progress: 10,
        currentStep: 'Checking for model...',
      });

      // Check if model exists
      const modelPath = await ModelStorage.getModelPath(DEFAULT_MODEL.id);
      const modelExists = await ModelStorage.checkModelExists(DEFAULT_MODEL.id);

      console.log('Model path:', modelPath);
      console.log('Model exists:', modelExists);

      if (!modelExists) {
        console.log('📥 Model not found, downloading...');
        setState((prev) => ({
          ...prev,
          progress: 20,
          currentStep: `Downloading ${DEFAULT_MODEL.name}...`,
        }));

        // Download model with progress tracking
        await ModelStorage.downloadModel(
          DEFAULT_MODEL.id,
          DEFAULT_MODEL.url || '',
          (progress) => {
            setState((prev) => ({
              ...prev,
              progress: 20 + (progress * 0.6), // 20-80%
              currentStep: `Downloading... ${Math.round(progress * 100)}%`,
            }));
          }
        );
      }

      // Skip loading model on startup - load it lazily when needed
      console.log('✅ Model file ready, skipping load on startup (will load when needed)');

      setState({
        isInitializing: false,
        isReady: true,
        progress: 100,
        currentStep: 'Ready!',
      });
    } catch (error) {
      console.error('❌ Initialization error:', error);
      setState({
        isInitializing: false,
        isReady: false,
        progress: 0,
        currentStep: 'Error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const retry = () => {
    setState({
      isInitializing: true,
      isReady: false,
      progress: 0,
      currentStep: 'Retrying...',
      error: undefined,
    });
    initializeApp();
  };

  return { ...state, retry };
}
