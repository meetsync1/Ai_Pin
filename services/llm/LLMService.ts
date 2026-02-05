/**
 * LLMService - Main service for text generation and chat
 * Using react-native-llama for real inference
 */

import ModelManager from './ModelManager';
import { Message, LLMOptions, GenerationResult } from './types';

class LLMService {
  /**
   * Generate text completion using real LLM
   */
  async generateText(
    prompt: string,
    options: LLMOptions = {}
  ): Promise<GenerationResult> {
    const context = ModelManager.getModel();
    if (!context) {
      throw new Error('No model loaded. Please load a model first.');
    }

    const startTime = Date.now();

    try {
      console.log('🤖 Generating AI response...');
      
      const stopWords = ['</s>', '<|end|>', '<|eot_id|>', '<|end_of_text|>', '<|im_end|>', '<|EOT|>', '<|END_OF_TURN_TOKEN|>', '<|end_of_turn|>', '<|endoftext|>'];

      // Real LLM completion using prompt mode
      const result = await context.completion(
        {
          prompt,
          n_predict: options.maxTokens || 512,
          temperature: options.temperature || 0.7,
          top_p: options.topP || 0.9,
          top_k: options.topK || 40,
          repeat_penalty: options.repeatPenalty || 1.1,
          stop: options.stop || stopWords,
        },
        (data) => {
          // Streaming callback
          // console.log('Token:', data.token);
        }
      );
      
      const duration = Date.now() - startTime;
      const tokensGenerated = result.timings?.predicted_n || 0;
      const tokensPerSecond = tokensGenerated / (duration / 1000);

      console.log(`✅ Generated ${tokensGenerated} tokens in ${(duration / 1000).toFixed(2)}s (${tokensPerSecond.toFixed(2)} t/s)`);
      console.log('Result text length:', result.text?.length || 0);
      console.log('Result text preview:', result.text?.substring(0, 100));

      return {
        text: result.text || '',
        tokensGenerated,
        tokensPerSecond,
        duration,
      };
    } catch (error) {
      console.error('❌ Generation error:', error);
      throw error;
    }
  }

  /**
   * Chat with the model (supports conversation history)
   */
  async chat(
    messages: Message[],
    options: LLMOptions = {}
  ): Promise<GenerationResult> {
    const context = ModelManager.getModel();
    const modelConfig = ModelManager.getModelConfig();

    if (!context || !modelConfig) {
      throw new Error('No model loaded. Please load a model first.');
    }

    const startTime = Date.now();

    try {
      // Format messages for llama.rn
      const formattedMessages = messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

      // Add system message if provided
      if (options.systemPrompt) {
        formattedMessages.unshift({
          role: 'system',
          content: options.systemPrompt,
        });
      }

      const stopWords = ['</s>', '<|end|>', '<|eot_id|>', '<|end_of_text|>', '<|im_end|>', '<|EOT|>', '<|END_OF_TURN_TOKEN|>', '<|end_of_turn|>', '<|endoftext|>'];

      // Call llama.rn completion with messages
      const result = await context.completion(
        {
          messages: formattedMessages,
          n_predict: options.maxTokens || 512,
          temperature: options.temperature || 0.7,
          top_p: options.topP || 0.9,
          top_k: options.topK || 40,
          repeat_penalty: options.repeatPenalty || 1.1,
          stop: options.stop || stopWords,
        },
        (data) => {
          // Streaming callback - can be used for real-time updates
          // console.log('Token:', data.token);
        }
      );

      const duration = Date.now() - startTime;
      const tokensGenerated = result.timings?.predicted_n || 0;
      const tokensPerSecond = tokensGenerated / (duration / 1000);

      console.log(`✅ Generated ${tokensGenerated} tokens in ${(duration / 1000).toFixed(2)}s`);
      console.log('Timings:', result.timings);
      console.log('Result text length:', result.text?.length || 0);
      console.log('Result text preview:', result.text?.substring(0, 100));

      return {
        text: result.text || '',
        tokensGenerated,
        tokensPerSecond,
        duration,
      };
    } catch (error) {
      console.error('❌ Chat error:', error);
      throw error;
    }
  }

  /**
   * Generate text using prompt (legacy/simpler interface)
   */
  private formatChatPrompt(
    messages: Message[],
    modelType: string,
    systemPrompt?: string
  ): string {
    // This method is no longer needed with llama.rn's native message support
    // Keeping for backwards compatibility
    let prompt = '';

    if (systemPrompt) {
      prompt += `<|im_start|>system\n${systemPrompt}<|im_end|>\n`;
    }

    messages.forEach((msg) => {
      if (msg.role === 'system' && !systemPrompt) {
        prompt += `<|im_start|>system\n${msg.content}<|im_end|>\n`;
      } else if (msg.role === 'user') {
        prompt += `<|im_start|>user\n${msg.content}<|im_end|>\n`;
      } else if (msg.role === 'assistant') {
        prompt += `<|im_start|>assistant\n${msg.content}<|im_end|>\n`;
      }
    });

    prompt += '<|im_start|>assistant\n';

    return prompt;
  }

  /**
   * Stream text generation (for real-time output)
   */
  async *streamText(
    prompt: string,
    options: LLMOptions = {}
  ): AsyncGenerator<string, void, unknown> {
    const model = ModelManager.getModel();
    if (!model) {
      throw new Error('No model loaded. Please load a model first.');
    }

    try {
      // Note: Streaming support depends on llama.rn version
      // This is a placeholder for streaming implementation
      const result = await this.generateText(prompt, options);
      yield result.text;
    } catch (error) {
      console.error('❌ Streaming error:', error);
      throw error;
    }
  }

  /**
   * Get model info
   */
  getModelInfo() {
    const config = ModelManager.getModelConfig();
    const state = ModelManager.getLoadState();
    
    return {
      config,
      state,
      isReady: ModelManager.isReady(),
    };
  }

  /**
   * Quick answer - simplified interface for single questions
   */
  async quickAnswer(
    question: string,
    systemPrompt?: string,
    options?: LLMOptions
  ): Promise<string> {
    const messages: Message[] = [
      {
        role: 'user',
        content: question,
      },
    ];

    const result = await this.chat(messages, {
      ...options,
      systemPrompt: systemPrompt || 'You are a helpful AI assistant.',
    });

    return result.text;
  }
}

export default new LLMService();
