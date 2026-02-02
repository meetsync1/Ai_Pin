/**
 * Example: Chat Conversation
 * Demonstrates multi-turn conversation with context
 */

import { ModelManager, LLMService, Message } from '@/services';

async function chatExample() {
  try {
    // Load model
    await ModelManager.loadModel({
      name: 'Llama 3.2 3B Q4',
      path: '/path/to/llama-3.2-3b-q4.gguf',
      size: 2000,
      quantization: 'Q4',
      contextLength: 2048,
      type: 'chat',
    });

    console.log('✅ Model loaded');

    // Conversation history
    const messages: Message[] = [];

    // Turn 1
    messages.push({
      role: 'user',
      content: 'What is React Native?',
    });

    let response = await LLMService.chat(messages, {
      systemPrompt: 'You are a helpful programming assistant. Keep responses concise.',
      temperature: 0.7,
      maxTokens: 200,
    });

    messages.push({
      role: 'assistant',
      content: response.text,
    });

    console.log('User: What is React Native?');
    console.log(`Assistant: ${response.text}\n`);

    // Turn 2
    messages.push({
      role: 'user',
      content: 'Can it run on iOS?',
    });

    response = await LLMService.chat(messages, {
      systemPrompt: 'You are a helpful programming assistant. Keep responses concise.',
      temperature: 0.7,
      maxTokens: 200,
    });

    messages.push({
      role: 'assistant',
      content: response.text,
    });

    console.log('User: Can it run on iOS?');
    console.log(`Assistant: ${response.text}\n`);

    // Turn 3
    messages.push({
      role: 'user',
      content: 'Show me a simple example',
    });

    response = await LLMService.chat(messages, {
      systemPrompt: 'You are a helpful programming assistant. Keep responses concise.',
      temperature: 0.7,
      maxTokens: 300,
    });

    console.log('User: Show me a simple example');
    console.log(`Assistant: ${response.text}\n`);

    // Cleanup
    await ModelManager.unloadModel();
    console.log('✅ Conversation ended');
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

chatExample();
