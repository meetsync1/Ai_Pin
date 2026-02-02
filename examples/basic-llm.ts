/**
 * Example: Basic LLM Usage
 * Demonstrates loading a model and generating text
 */

import { ModelManager, LLMService } from '@/services';

async function basicExample() {
  try {
    console.log('📦 Loading model...');

    // Load a GGUF model
    await ModelManager.loadModel({
      name: 'Llama 3.2 3B Q4',
      path: '/path/to/llama-3.2-3b-q4.gguf',
      size: 2000,
      quantization: 'Q4',
      contextLength: 2048,
      type: 'chat',
    });

    console.log('✅ Model loaded!');

    // Generate text
    console.log('🤖 Generating response...');
    const result = await LLMService.generateText(
      'Write a short poem about artificial intelligence',
      {
        temperature: 0.8,
        maxTokens: 150,
      }
    );

    console.log('\n📝 Generated Text:');
    console.log(result.text);
    console.log(`\n⚡ Speed: ${result.tokensPerSecond.toFixed(2)} tokens/sec`);
    console.log(`⏱️  Duration: ${result.duration}ms`);

    // Unload model when done
    await ModelManager.unloadModel();
    console.log('✅ Model unloaded');
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run example
basicExample();
