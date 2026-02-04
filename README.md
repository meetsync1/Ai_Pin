# 🎤 AI Notes - On-Device Voice Transcription

> **100% Offline AI-powered speech-to-text using Whisper AI**

A powerful React Native application built with Expo that provides real-time speech-to-text transcription using Whisper AI, completely offline on your device. Features a beautiful modern UI, comprehensive history management, and multiple export formats.

![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Expo](https://img.shields.io/badge/Expo-000020?style=for-the-badge&logo=expo&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Whisper](https://img.shields.io/badge/Whisper_AI-412991?style=for-the-badge&logo=openai&logoColor=white)

## ✨ Features

### 🎙️ Real-Time Transcription
- **Live transcription** - See words appear as you speak
- **Realtime processing** - Uses whisper.rn's built-in recorder (16kHz PCM)
- **Long recordings** - Record up to 10 minutes continuously
- **Segment tracking** - Individual segments with precise timestamps
- **Auto-save** - Saves to JSON and SRT formats automatically

### 📚 History Management
- **Beautiful card list** - Browse all transcriptions with rich previews
- **Statistics dashboard** - Track total transcriptions and characters
- **Quick actions** - View, Share, or Delete from each card
- **Pull to refresh** - Update your library with a swipe
- **Smart previews** - Date, duration, language badges

### 📄 Multi-Format Export
- **Text View** - Clean, readable full transcription
- **Segments View** - Time-stamped segments (e.g., 0.5s - 3.2s)
- **JSON View** - Complete data with syntax highlighting
- **SRT View** - Standard SubRip subtitle format
- **Share any format** - Export to other apps instantly

### 🔒 Privacy First
- **100% Offline** - All processing happens on your device
- **No Cloud** - No data ever sent to servers
- **No Tracking** - No analytics or telemetry
- **No Account** - No sign-up required

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Android SDK (for Android) or Xcode (for iOS)
- Physical device recommended (native modules won't work in Expo Go)

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd ai_notes

# Install dependencies
npm install

# Prebuild for native modules
npx expo prebuild

# Run on Android
npx expo run:android

# Run on iOS
npx expo run:ios
```

### First Launch

The app will automatically download the Whisper Base model (~142MB) on first launch. This requires an internet connection but only happens once.

## 📱 App Screens

### Home Screen
- Modern gradient-based UI design
- Quick access to Start Transcribing
- History navigation

### Transcribe Screen
- ⏱️ Large timer display with recording time
- 🎙️ Animated record button (pulses during recording)
- 📝 Real-time transcription display
- 📊 Progress indicator during processing
- ✅ Success banner with saved file names

### History Screen
- 📊 Statistics dashboard (count & characters)
- 📇 Card-based list with previews
- 🏷️ Date, duration, and language badges
- 👁️ View, 📤 Share, 🗑️ Delete actions

### Viewer Screen
- 📑 Four tab views (Text, Segments, JSON, SRT)
- ℹ️ Metadata panel (date, language, duration, segments)
- 💾 Syntax-highlighted code views
- 📤 Format-specific sharing

## 🔧 Configuration

### Change Whisper Model

Edit `constants/whisper.ts`:

```typescript
export const DEFAULT_WHISPER_MODEL = WHISPER_BASE_MODEL;
```

Available models:

| Model | Size | Speed | Accuracy |
|-------|------|-------|----------|
| Tiny | 75MB | Fastest | Lower |
| **Base** | 142MB | Fast | **Recommended ✅** |
| Small | 466MB | Medium | Better |
| Medium | 1.5GB | Slow | High |

### Supported Languages

Auto-detect (default) or specify:
- English, Spanish, French, German, Italian
- Portuguese, Dutch, Japanese, Korean, Chinese
- Russian, Arabic, Hindi

## 📂 Project Structure

```
ai_notes/
├── app/
│   ├── (tabs)/
│   │   └── index.tsx              # Home screen
│   ├── transcribe.tsx             # Recording & transcription
│   ├── history.tsx                # Transcription list
│   └── view-transcription.tsx     # File viewer
│
├── services/
│   ├── whisper/
│   │   ├── WhisperService.ts      # Core transcription service
│   │   └── types.ts               # TypeScript types
│   ├── storage/
│   │   ├── ModelStorage.ts        # Model management
│   │   ├── TranscriptionStorage.ts # File storage
│   │   └── RecordingStorage.ts    # Audio cache management
│   └── audio/
│       └── AudioConverter.ts      # Audio format utilities
│
├── constants/
│   └── whisper.ts                 # Model configurations
│
└── docs/
    ├── USER_GUIDE.md              # User documentation
    ├── PROJECT_OVERVIEW.md        # Technical architecture
    └── TRANSCRIPTION_TROUBLESHOOTING.md  # Debug guide
```

## 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| Framework | React Native + Expo SDK 54 |
| Language | TypeScript 5.9 |
| Navigation | Expo Router (file-based) |
| AI Engine | whisper.rn (whisper.cpp wrapper) |
| Audio | expo-av |
| Storage | expo-file-system |
| UI | Linear Gradient, Custom Components |

## 📊 Performance

| Metric | Value |
|--------|-------|
| App Launch | < 2 seconds |
| History Load | < 500ms (100 items) |
| Transcription Speed | ~1 minute audio = 30-60s processing |
| Memory Usage | ~200MB with model loaded |
| Storage | ~350MB (app + model + transcriptions) |

## 🐛 Troubleshooting

### Model Download Fails
- Check internet connection
- Try cellular data if WiFi is unstable
- Download resumes automatically on retry

### Recording Permission Denied
- Settings → Apps → AI Notes → Permissions
- Enable "Microphone"
- Restart app

### Transcription Empty
- Speak louder and closer to microphone
- Check audio is being recorded
- Ensure model is fully loaded

### Build Errors

```bash
# Android SDK not found
echo "sdk.dir=C:\\Users\\YourUsername\\AppData\\Local\\Android\\Sdk" > android/local.properties

# Clean build
cd android && ./gradlew clean && cd ..
npx expo prebuild --clean
npx expo run:android
```

See [TRANSCRIPTION_TROUBLESHOOTING.md](TRANSCRIPTION_TROUBLESHOOTING.md) for detailed debugging.

## 🚧 Roadmap

- [x] Real-time transcription
- [x] History management
- [x] Multi-format export (JSON, SRT)
- [x] Modern gradient UI
- [ ] Dark mode toggle
- [ ] Search within transcriptions
- [ ] Export to PDF/DOCX
- [ ] Tags and folders
- [ ] Multi-speaker detection (diarization)

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

## 🙏 Acknowledgments

- [Whisper AI](https://github.com/openai/whisper) by OpenAI
- [whisper.rn](https://github.com/mybigday/whisper.rn) by mybigday
- [Expo](https://expo.dev) framework
- React Native community

---

**Built with ❤️ using React Native, Expo, and Whisper AI**

*On-device ASR - Your voice, your privacy! 🎤*
