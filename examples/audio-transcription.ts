/**
 * Example: Audio Transcription with Whisper
 * Demonstrates speech-to-text and AI analysis
 */

import { WhisperService, ModelManager, LLMService } from '@/services';

async function audioExample() {
  try {
    // 1. Initialize Whisper
    console.log('🎙️ Initializing Whisper...');
    await WhisperService.initialize('/path/to/whisper-small.bin');
    console.log('✅ Whisper ready');

    // 2. Record audio (5 seconds)
    console.log('🎤 Recording for 5 seconds...');
    const transcription = await WhisperService.recordAndTranscribe(5000, {
      language: 'en',
      task: 'transcribe',
    });

    console.log('\n📝 Transcription:');
    console.log(transcription.text);
    console.log(`⏱️  Processed in ${transcription.duration}ms\n`);

    // 3. Load LLM
    console.log('🤖 Loading LLM...');
    await ModelManager.loadModel({
      name: 'Llama 3.2 3B Q4',
      path: '/path/to/llama-3.2-3b-q4.gguf',
      size: 2000,
      quantization: 'Q4',
      contextLength: 2048,
      type: 'chat',
    });

    // 4. Analyze transcription with LLM
    console.log('💭 Analyzing with AI...');
    const analysis = await LLMService.quickAnswer(
      `Summarize this in one sentence: "${transcription.text}"`,
      'You are a helpful AI assistant that creates concise summaries.'
    );

    console.log('\n📊 AI Summary:');
    console.log(analysis);

    // 5. Cleanup
    await ModelManager.unloadModel();
    console.log('\n✅ Done!');
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

audioExample();
