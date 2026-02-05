/**
 * Model configurations for bundled AI models
 */

import { ModelConfig } from '@/services/llm/types';

// Qwen 2.5 0.5B Instruct - Small, fast model perfect for on-device use
export const QWEN_MODEL: ModelConfig = {
  id: 'qwen2.5-0.5b-instruct-q4_k_m.gguf',
  name: 'Qwen 2.5 0.5B Instruct',
  path: 'qwen2.5-0.5b-instruct-q4_k_m.gguf', // Will be prefixed with models directory
  size: 350, // ~350 MB
  quantization: 'Q4',
  contextLength: 4096,
  type: 'chat',
  url: 'https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/qwen2.5-0.5b-instruct-q4_k_m.gguf',
};

// Hugging Face download URL for Qwen model
export const QWEN_DOWNLOAD_URL = 
  'https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/qwen2.5-0.5b-instruct-q4_k_m.gguf';

// Default model to use in the app
export const DEFAULT_MODEL = QWEN_MODEL;

// Model prompt templates
export const SUMMARIZATION_SYSTEM_PROMPT = `You are an expert at creating clear, detailed summaries. 
Your summaries should be:
- Well-structured with clear sections
- Include key points and main ideas
- Use bullet points and formatting for clarity
- Highlight important information
- Be comprehensive yet concise`;

export const SUMMARIZATION_TEMPLATE = (transcription: string) => `
Please provide a detailed, well-formatted summary of the following transcription:

${transcription}

Format your summary with:
1. **Main Topic** - What is this about?
2. **Key Points** - Main ideas (use bullet points)
3. **Important Details** - Specific facts or information mentioned
4. **Action Items** (if any) - Tasks or next steps mentioned
5. **Conclusion** - Brief wrap-up

Make it clear, organized, and easy to read.
`;
