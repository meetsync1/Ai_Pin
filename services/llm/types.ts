/**
 * Type definitions for LLM services
 */

export interface ModelConfig {
  id: string; // Unique identifier / filename
  name: string;
  path: string;
  size: number; // in MB
  quantization: 'Q4' | 'Q5' | 'Q6' | 'Q8' | 'F16';
  contextLength: number;
  type: 'chat' | 'instruct' | 'completion';
  url?: string; // Download URL if available
}

export interface LLMOptions {
  temperature?: number;
  topP?: number;
  topK?: number;
  maxTokens?: number;
  repeatPenalty?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string[];
  seed?: number;
  systemPrompt?: string;
}

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp?: number;
}

export interface GenerationResult {
  text: string;
  tokensGenerated: number;
  tokensPerSecond: number;
  duration: number; // in milliseconds
}

export interface ModelLoadState {
  isLoading: boolean;
  isLoaded: boolean;
  progress: number; // 0-100
  error?: string;
  modelName?: string;
}

export type ModelDownloadProgress = {
  bytesDownloaded: number;
  totalBytes: number;
  percentage: number;
};
