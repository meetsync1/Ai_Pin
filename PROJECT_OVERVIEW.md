# AI Notes - Project Overview & Architecture

## 📱 Project Description

**AI Notes** is a privacy-first React Native mobile application that provides **on-device AI capabilities** for text summarization and transcription processing. The app runs AI models locally on your device, ensuring complete privacy and offline functionality.

### Key Features

- 🔒 **100% Offline** - All AI processing happens on-device
- 🚀 **Fast Inference** - Optimized GGUF models for mobile
- 🎯 **Smart Summarization** - Generates formatted, structured summaries
- 🔐 **Privacy First** - No data leaves your device
- 💰 **No API Costs** - No cloud service dependencies

---

## 🏗️ Architecture Overview

### Technology Stack

- **Framework**: React Native with Expo (v54)
- **Language**: TypeScript
- **Navigation**: Expo Router (file-based routing)
- **AI Engine**: llama.rn (React Native wrapper for llama.cpp)
- **Model Format**: GGUF (Quantized models)
- **Default Model**: Qwen 2.5 0.5B Instruct (Q4 quantization, ~350MB)

### Project Structure

```
ai_notes/
├── app/                          # Expo Router screens
│   ├── (tabs)/                   # Tab-based navigation
│   │   ├── index.tsx             # Home screen
│   │   └── explore.tsx           # Explore features
│   ├── summarize.tsx             # Main summarization UI
│   └── _layout.tsx               # Root layout
│
├── services/                     # Core business logic
│   ├── llm/                      # LLM services
│   │   ├── ModelManager.ts       # Model lifecycle management
│   │   ├── LLMService.ts         # Text generation API
│   │   └── types.ts              # TypeScript interfaces
│   │
│   ├── whisper/                  # Speech-to-text (future)
│   │   └── WhisperService.ts     # Transcription service
│   │
│   ├── storage/                  # Model storage & downloads
│   │   └── ModelStorage.ts       # Model file management
│   │
│   └── summarization/            # Summarization logic
│       └── SummarizationService.ts
│
├── constants/                    # Configuration
│   ├── models.ts                 # Model configs & prompts
│   └── theme.ts                  # UI theme settings
│
├── components/                   # Reusable UI components
├── hooks/                        # Custom React hooks
│   └── useAppInitialization.ts   # App startup logic
│
└── assets/                       # Images & resources
```

---

## 🔄 Application Workflow

### 1. **App Initialization Flow**

```
App Launch
    ↓
useAppInitialization Hook
    ↓
Check if Model Exists
    ├─ No → Download from HuggingFace
    │       (Progress: 20-80%)
    │       ModelStorage.downloadModel()
    └─ Yes → Skip download
    ↓
Load Model into Memory
ModelManager.loadModel()
    ↓
Initialize llama.rn Context
    ↓
App Ready ✅
```

**File**: [hooks/useAppInitialization.ts](hooks/useAppInitialization.ts)

**Key Steps**:

1. Check if `qwen2.5-0.5b-instruct-q4_k_m.gguf` exists locally
2. Download from HuggingFace if missing (~350MB)
3. Load model into memory using `llama.rn`
4. Display loading screen with progress

---

### 2. **Summarization Flow**

```
User Opens Summarizer
    ↓
Enters/Pastes Transcription Text
    ↓
Taps "Generate Summary"
    ↓
SummarizationService.summarize()
    ↓
Formats prompt with template
(SUMMARIZATION_TEMPLATE)
    ↓
LLMService.quickAnswer()
    ↓
ModelManager.getModel().completion()
    ↓
llama.rn generates text
(Token-by-token streaming)
    ↓
Formatted Summary Displayed
```

**Key Files**:

- UI: [app/summarize.tsx](app/summarize.tsx)
- Logic: [services/summarization/SummarizationService.ts](services/summarization/SummarizationService.ts)
- Prompts: [constants/models.ts](constants/models.ts)

---

## 🧩 Core Services Explained

### **1. ModelManager** - Model Lifecycle

**Location**: [services/llm/ModelManager.ts](services/llm/ModelManager.ts)

**Responsibilities**:

- Load/unload GGUF models
- Manage `LlamaContext` instances
- Track loading state and progress
- Notify listeners of state changes

**Key Methods**:

```typescript
loadModel(config: ModelConfig)      // Load model from file
unloadModel()                        // Release model from memory
getModel(): LlamaContext | null      // Get active model context
subscribe(listener)                  // Listen to state changes
```

**Usage**:

```typescript
await ModelManager.loadModel({
  name: "Qwen 2.5 0.5B",
  path: "/path/to/model.gguf",
  contextLength: 4096,
});
```

---

### **2. LLMService** - Text Generation API

**Location**: [services/llm/LLMService.ts](services/llm/LLMService.ts)

**Responsibilities**:

- High-level text generation interface
- Chat conversation handling
- Prompt formatting
- Token streaming

**Key Methods**:

```typescript
generateText(prompt, options); // Generate text from prompt
chat(messages, options); // Multi-turn conversations
quickAnswer(question, system); // Simple Q&A
```

**Example**:

```typescript
const result = await LLMService.generateText("Summarize this text...", {
  temperature: 0.7,
  maxTokens: 512,
  topP: 0.9,
});
```

---

### **3. ModelStorage** - Model File Management

**Location**: [services/storage/ModelStorage.ts](services/storage/ModelStorage.ts)

**Responsibilities**:

- Download models from HuggingFace
- Store models in device file system
- Check model existence
- Track download progress

**Key Methods**:

```typescript
downloadModel(id, url, onProgress); // Download with progress
checkModelExists(id); // Check if model exists
getModelPath(id); // Get absolute path
```

---

### **4. SummarizationService** - Summarization Logic

**Location**: [services/summarization/SummarizationService.ts](services/summarization/SummarizationService.ts)

**Responsibilities**:

- Create summarization prompts
- Call LLM for summary generation
- Format and structure output
- Handle errors gracefully

**Methods**:

```typescript
summarize(transcription); // Standard summarization
summarizeWithInstructions(text, custom); // Custom instructions
```

---

### **5. WhisperService** - Speech-to-Text (Future)

**Location**: [services/whisper/WhisperService.ts](services/whisper/WhisperService.ts)

**Status**: Mock implementation (requires `react-native-whisper` integration)

**Planned Features**:

- Audio file transcription
- Real-time recording
- Multi-language support
- Timestamps and segments

---

## 🎯 Data Flow Example

### Complete Summarization Request

```
┌──────────────┐
│   User UI    │
│ summarize.tsx│
└──────┬───────┘
       │ handleSummarize()
       ↓
┌──────────────────────────────┐
│  SummarizationService        │
│  - Formats prompt template    │
│  - Adds system instructions   │
└──────┬───────────────────────┘
       │ LLMService.quickAnswer()
       ↓
┌──────────────────────────────┐
│  LLMService                   │
│  - Applies generation options │
│  - Calls model context        │
└──────┬───────────────────────┘
       │ context.completion()
       ↓
┌──────────────────────────────┐
│  llama.rn (Native)            │
│  - Token generation           │
│  - Streaming callbacks        │
│  - Stop word detection        │
└──────┬───────────────────────┘
       │ Returns generated text
       ↓
┌──────────────────────────────┐
│  Back to UI                   │
│  - Display formatted summary  │
│  - Show processing time       │
└──────────────────────────────┘
```

---

## 🛠️ Model Configuration

### Default Model: Qwen 2.5 0.5B Instruct

**Why Qwen?**

- ✅ Small size (~350MB) - fits on mobile devices
- ✅ Fast inference - good mobile performance
- ✅ Q4 quantization - balance of speed/quality
- ✅ 4096 context length - handles long text
- ✅ Instruction-tuned - follows prompts well

**Configuration**: [constants/models.ts](constants/models.ts)

```typescript
export const QWEN_MODEL: ModelConfig = {
  id: "qwen2.5-0.5b-instruct-q4_k_m.gguf",
  name: "Qwen 2.5 0.5B Instruct",
  path: "qwen2.5-0.5b-instruct-q4_k_m.gguf",
  size: 350, // MB
  quantization: "Q4", // 4-bit quantization
  contextLength: 4096, // Max tokens
  type: "chat",
  url: "https://huggingface.co/...",
};
```

---

## 📋 Prompt Engineering

### Summarization System Prompt

Located in [constants/models.ts](constants/models.ts#L21):

```typescript
export const SUMMARIZATION_SYSTEM_PROMPT = `
You are an expert at creating clear, detailed summaries.
Your summaries should be:
- Well-structured with clear sections
- Include key points and main ideas
- Use bullet points and formatting
- Highlight important information
- Be comprehensive yet concise
`;
```

### Summarization Template

```typescript
export const SUMMARIZATION_TEMPLATE = (transcription: string) => `
Please provide a detailed, well-formatted summary:

${transcription}

Format your summary with:
1. **Main Topic** - What is this about?
2. **Key Points** - Main ideas
3. **Important Details** - Specific facts
4. **Action Items** - Tasks mentioned
5. **Conclusion** - Brief wrap-up
`;
```

**This structured prompt ensures**:

- Consistent output format
- Clear section organization
- Comprehensive coverage
- Easy-to-read results

---

## 🎨 User Interface

### Screen Structure

1. **Home Screen** ([app/(tabs)/index.tsx](<app/(tabs)/index.tsx>))
   - Welcome message
   - Feature highlights
   - Quick access to Summarizer

2. **Summarizer** ([app/summarize.tsx](app/summarize.tsx))
   - Text input area (multiline)
   - Character counter
   - Generate/Clear buttons
   - Loading indicator
   - Summary display with scroll
   - Processing time indicator

3. **Explore** ([app/(tabs)/explore.tsx](<app/(tabs)/explore.tsx>))
   - Additional features (future)

### Navigation

Uses **Expo Router** file-based routing:

- `(tabs)/` → Tab navigation
- `summarize.tsx` → Modal/full screen
- Automatic type-safe routing

---

## ⚙️ Configuration & Settings

### LLM Generation Parameters

Default settings for text generation:

```typescript
{
  temperature: 0.7,      // Creativity (0.0-1.0)
  maxTokens: 512,        // Max output length
  topP: 0.9,             // Nucleus sampling
  topK: 40,              // Top-K sampling
  repeatPenalty: 1.1,    // Avoid repetition
  stop: [               // Stop generation at these tokens
    '</s>',
    '<|end|>',
    '<|eot_id|>'
  ]
}
```

**Adjustable per use case**:

- Higher temp (0.8-1.0) = more creative
- Lower temp (0.3-0.5) = more focused
- More tokens = longer output

---

## 🔍 How the AI Works

### llama.cpp & llama.rn

**llama.cpp**:

- C++ library for running LLMs efficiently
- Optimized for CPU inference
- Supports quantized models (GGUF format)

**llama.rn**:

- React Native wrapper for llama.cpp
- Provides JavaScript API
- Handles native module bridging

### Model Loading Process

```typescript
// 1. Initialize llama context
const context = await initLlama({
  model: "/path/to/model.gguf",
  n_ctx: 4096, // Context window size
  n_batch: 512, // Batch size for processing
  n_gpu_layers: 0, // GPU layers (0 = CPU only)
  use_mlock: true, // Keep model in RAM
});

// 2. Generate text
const result = await context.completion({
  prompt: "Your prompt here",
  n_predict: 512, // Max tokens to generate
  temperature: 0.7,
});

// 3. Get result
console.log(result.text); // Generated text
```

---

## 📊 Performance Considerations

### Memory Usage

- Model in RAM: ~350MB (Qwen 0.5B Q4)
- App overhead: ~100-200MB
- Total: ~500-600MB

### Generation Speed

- Varies by device (4-20 tokens/sec)
- Faster on newer devices
- GPU acceleration possible on supported hardware

### Optimization Tips

1. Use quantized models (Q4, Q5)
2. Limit context length when possible
3. Lower `n_batch` for memory-constrained devices
4. Consider GPU layers if available

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Expo CLI
- iOS Simulator / Android Emulator / Physical device

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android
```

### First Run

1. App downloads model (~350MB) on first launch
2. Shows progress indicator
3. Loads model into memory
4. Ready to use!

---

## 🔧 Development Scripts

```bash
npm start              # Start Expo dev server
npm run android        # Run on Android
npm run ios            # Run on iOS
npm run web            # Run in web browser
npm run lint           # Lint code
npm run reset-project  # Reset to clean state
```

---

## 📁 Key Files Reference

| File                                                                                             | Purpose                 |
| ------------------------------------------------------------------------------------------------ | ----------------------- |
| [app/summarize.tsx](app/summarize.tsx)                                                           | Main summarization UI   |
| [services/llm/LLMService.ts](services/llm/LLMService.ts)                                         | Text generation API     |
| [services/llm/ModelManager.ts](services/llm/ModelManager.ts)                                     | Model lifecycle         |
| [services/summarization/SummarizationService.ts](services/summarization/SummarizationService.ts) | Summarization logic     |
| [hooks/useAppInitialization.ts](hooks/useAppInitialization.ts)                                   | App startup             |
| [constants/models.ts](constants/models.ts)                                                       | Model configs & prompts |
| [services/storage/ModelStorage.ts](services/storage/ModelStorage.ts)                             | Model downloads         |

---

## 🔮 Future Enhancements

### Planned Features

1. **Voice Transcription**
   - Integrate `react-native-whisper`
   - Real-time audio recording
   - Multi-language support

2. **Multiple Models**
   - Allow model switching
   - Download different models
   - Compare model outputs

3. **History & Persistence**
   - Save summaries locally
   - Search past summaries
   - Export functionality

4. **Custom Templates**
   - User-defined prompts
   - Template library
   - Sharing templates

5. **Advanced Features**
   - Batch processing
   - Text-to-speech output
   - Cloud sync (optional)

---

## 🐛 Troubleshooting

### Model Loading Issues

- **Check file path**: Ensure model exists at correct location
- **Check storage**: Need ~500MB free space
- **Check permissions**: App needs storage access

### Generation Issues

- **Out of memory**: Reduce `n_ctx` or use smaller model
- **Slow generation**: Normal on older devices
- **Gibberish output**: Check prompt formatting

### Common Errors

```typescript
// Error: Model not loaded
// Solution: Ensure ModelManager.loadModel() completed

// Error: Context length exceeded
// Solution: Reduce input text or increase n_ctx

// Error: Model file not found
// Solution: Re-download model or check path
```

---

## 📚 Additional Resources

- [Expo Documentation](https://docs.expo.dev/)
- [llama.cpp GitHub](https://github.com/ggerganov/llama.cpp)
- [llama.rn Documentation](https://github.com/mybigday/llama.rn)
- [GGUF Model Format](https://github.com/ggerganov/ggml/blob/master/docs/gguf.md)
- [Qwen Models](https://huggingface.co/Qwen)

---

## 👨‍💻 Development Notes

### Code Style

- TypeScript strict mode
- ESLint for linting
- Consistent service pattern
- Error handling everywhere

### Service Architecture

```
UI Layer (React Native)
    ↓
Service Layer (Business Logic)
    ↓
Native Layer (llama.rn)
    ↓
llama.cpp (C++)
```

### State Management

- React hooks for UI state
- Service singletons for app state
- Listeners for cross-component updates

---

## 📄 License & Credits

- **Expo**: MIT License
- **llama.cpp**: MIT License
- **Qwen Models**: Apache 2.0
- **llama.rn**: MIT License

---

## 🎯 Summary

This is a **production-ready on-device AI application** that demonstrates:

1. ✅ Local LLM integration on mobile
2. ✅ GGUF model management
3. ✅ Real-time text generation
4. ✅ Clean service architecture
5. ✅ Privacy-first design
6. ✅ Professional UI/UX

The codebase is **modular, well-documented, and extensible** for future AI features.

---

**Built with ❤️ using Expo, React Native, and llama.rn**
