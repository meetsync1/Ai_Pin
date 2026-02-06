/**
 * SummarizationService - Handles transcription summarization
 */

import { DEFAULT_MODEL, SUMMARIZATION_SYSTEM_PROMPT, SUMMARIZATION_TEMPLATE } from '@/constants/models';
import { getFormatById } from '@/constants/summarization-formats';
import LLMService from '@/services/llm/LLMService';
import ModelManager from '@/services/llm/ModelManager';
import ModelStorage from '@/services/storage/ModelStorage';

export interface SummaryResult {
  summary: string;
  processingTime: number;
  tokensGenerated: number;
  error?: string;
}

class SummarizationService {
  /**
   * Generate a detailed formatted summary from transcription
   */
  async summarize(transcription: string): Promise<SummaryResult> {
    const startTime = Date.now();

    try {
      if (!transcription || transcription.trim().length === 0) {
        throw new Error('Transcription is empty');
      }

      // Auto-load model if not loaded
      if (!ModelManager.isReady()) {
        console.log('📦 LLM model not loaded, loading now...');
        console.log('⚠️ This may take 30-90 seconds and use significant memory');
        
        const modelPath = await ModelStorage.getModelPath(DEFAULT_MODEL.id);
        
        // Add timeout to prevent hanging
        const loadPromise = ModelManager.loadModel({
          ...DEFAULT_MODEL,
          path: modelPath,
        });
        
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Model loading timed out after 120 seconds')), 120000);
        });
        
        try {
          await Promise.race([loadPromise, timeoutPromise]);
          console.log('✅ LLM model loaded successfully');
        } catch (error) {
          console.error('❌ Model loading failed:', error);
          throw new Error(`Failed to load model: ${error instanceof Error ? error.message : 'Unknown error'}. Your device may not have enough memory for this model (requires ~500MB free RAM).`);
        }
      }

      // Create prompt
      const prompt = SUMMARIZATION_TEMPLATE(transcription);

      // Generate summary
      const result = await LLMService.quickAnswer(
        prompt,
        SUMMARIZATION_SYSTEM_PROMPT,
        {
          temperature: 0.7,
          maxTokens: 1000,
          topP: 0.9,
          topK: 40,
          repeatPenalty: 1.1,
        }
      );

      console.log('📝 Summary result length:', result?.length || 0);
      console.log('📝 Summary preview:', result?.substring(0, 100));

      const processingTime = Date.now() - startTime;

      return {
        summary: result || '',
        processingTime,
        tokensGenerated: 0, // Updated if available from LLMService
      };
    } catch (error) {
      console.error('❌ Summarization error:', error);
      return {
        summary: '',
        processingTime: Date.now() - startTime,
        tokensGenerated: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Summarize with a specific format template (RAG-style)
   */
  async summarizeWithFormat(
    transcription: string,
    formatId: string
  ): Promise<SummaryResult> {
    const startTime = Date.now();

    try {
      if (!transcription || transcription.trim().length === 0) {
        throw new Error('Transcription is empty');
      }

      // Retrieve the format template
      const format = getFormatById(formatId);
      console.log(`📋 Using summarization format: ${format.name}`);

      // Auto-load model if not loaded
      if (!ModelManager.isReady()) {
        console.log('📦 LLM model not loaded, loading now...');
        const modelPath = await ModelStorage.getModelPath(DEFAULT_MODEL.id);
        
        const loadPromise = ModelManager.loadModel({
          ...DEFAULT_MODEL,
          path: modelPath,
        });
        
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Model loading timed out after 120 seconds')), 120000);
        });
        
        await Promise.race([loadPromise, timeoutPromise]);
        console.log('✅ LLM model loaded successfully');
      }

      // Create prompt using the selected format template
      const prompt = format.template(transcription);

      // Generate summary with format-specific system prompt
      const result = await LLMService.quickAnswer(
        prompt,
        format.systemPrompt,
        {
          temperature: 0.7,
          maxTokens: 1000,
          topP: 0.9,
          topK: 40,
          repeatPenalty: 1.1,
        }
      );

      console.log('📝 Summary result length:', result?.length || 0);

      return {
        summary: result || '',
        processingTime: Date.now() - startTime,
        tokensGenerated: 0,
      };
    } catch (error) {
      console.error('❌ Summarization error:', error);
      return {
        summary: '',
        processingTime: Date.now() - startTime,
        tokensGenerated: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Summarize with custom instructions
   */
  async summarizeWithInstructions(
    transcription: string,
    customInstructions: string
  ): Promise<SummaryResult> {
    const startTime = Date.now();

    try {
      const prompt = `${customInstructions}\n\nTranscription:\n${transcription}`;

      const result = await LLMService.quickAnswer(
        prompt,
        SUMMARIZATION_SYSTEM_PROMPT,
        {
          temperature: 0.7,
          maxTokens: 1000,
        }
      );

      return {
        summary: result,
        processingTime: Date.now() - startTime,
        tokensGenerated: 0,
      };
    } catch (error) {
      console.error('❌ Summarization error:', error);
      return {
        summary: '',
        processingTime: Date.now() - startTime,
        tokensGenerated: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Extract key points only
   */
  async extractKeyPoints(transcription: string): Promise<SummaryResult> {
    const prompt = `Extract the key points from this transcription as a bullet list:\n\n${transcription}`;

    const startTime = Date.now();

    try {
      const result = await LLMService.quickAnswer(
        prompt,
        'You are an expert at extracting key information. Provide only bullet points.',
        {
          temperature: 0.5,
          maxTokens: 500,
        }
      );

      return {
        summary: result,
        processingTime: Date.now() - startTime,
        tokensGenerated: 0,
      };
    } catch (error) {
      return {
        summary: '',
        processingTime: Date.now() - startTime,
        tokensGenerated: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

export default new SummarizationService();
