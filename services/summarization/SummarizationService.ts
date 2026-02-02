/**
 * SummarizationService - Handles transcription summarization
 */

import LLMService from '@/services/llm/LLMService';
import { SUMMARIZATION_SYSTEM_PROMPT, SUMMARIZATION_TEMPLATE } from '@/constants/models';

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
