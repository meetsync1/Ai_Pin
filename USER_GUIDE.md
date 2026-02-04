# 🎤 AI Notes - Voice Transcription App

A robust, on-device AI-powered voice transcription application built with React Native and Expo. Features real-time speech-to-text transcription using Whisper AI, with automatic JSON and SRT file generation.

## ✨ Features

### 🎙️ Voice Recording & Transcription

- **Real-time Transcription**: See your words appear as you speak
- **High-Quality Audio**: 16kHz mono WAV recording optimized for Whisper
- **Segment Tracking**: View individual transcription segments with timestamps
- **Progress Indicators**: Visual feedback during recording and transcription
- **Auto-save**: Automatically saves transcriptions in both JSON and SRT formats

### 📚 Transcription History

- **View All Transcriptions**: Browse all your saved transcriptions
- **Rich Preview**: See date, duration, language, and text preview
- **Statistics Dashboard**: Track total transcriptions and characters
- **Search & Filter**: Easy navigation through your transcription library
- **Pull to Refresh**: Update your history with a simple swipe

### 📄 File Viewer

- **Multiple View Modes**:
  - **Text View**: Clean, readable full transcription
  - **Segments View**: Time-stamped segments with precise timing
  - **JSON View**: Complete transcription data with metadata
  - **SRT View**: Standard SubRip subtitle format
- **Syntax Highlighting**: Code-style formatting for JSON and SRT
- **Share Functionality**: Share transcriptions in any format
- **Metadata Display**: View language, duration, timestamp, and segment count

### 🛡️ Robust Features

- **Error Handling**: Comprehensive error messages and recovery options
- **Offline First**: Works completely offline after initial model download
- **Auto Model Download**: Seamlessly downloads Whisper model on first use
- **Model Caching**: Smart caching system to avoid re-downloads
- **State Management**: Persistent state across app restarts
- **Permission Handling**: Clear permission requests and status
- **Loading States**: Beautiful loading animations and progress bars

### 🎨 Enhanced UI/UX

- **Modern Design**: Clean, intuitive interface with smooth animations
- **Pulse Animation**: Visual feedback during recording
- **Status Indicators**: Clear recording/transcribing/ready states
- **Responsive Layout**: Optimized for all screen sizes
- **Dark-friendly Colors**: Accessible color scheme
- **Touch Feedback**: Haptic-style visual responses
- **Empty States**: Helpful messages when no data is available

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Android SDK (for Android development)
- Xcode (for iOS development)
- Physical device recommended (Expo Go won't work due to native modules)

### Installation

1. **Clone the repository**

```bash
git clone <repository-url>
cd ai_notes
```

2. **Install dependencies**

```bash
npm install
```

3. **Install Expo CLI globally** (if not already installed)

```bash
npm install -g expo-cli
```

4. **Prebuild for native modules**

```bash
npx expo prebuild
```

### Running the App

#### Android

```bash
# Connect your Android device via USB and enable USB debugging
npx expo run:android
```

#### iOS

```bash
npx expo run:ios
```

### First Launch

On the first launch, the app will automatically download the Whisper Base model (~142MB). This is a one-time process and requires an internet connection. Subsequent launches work completely offline.

## 📱 App Structure

```
app/
├── (tabs)/
│   └── index.tsx              # Home screen with navigation
├── transcribe.tsx             # Enhanced recording & transcription UI
├── history.tsx                # Transcription history list
└── view-transcription.tsx     # Individual transcription viewer

services/
├── whisper/
│   ├── WhisperService.ts      # Core transcription service
│   └── types.ts               # TypeScript interfaces
└── storage/
    ├── ModelStorage.ts        # AI model management
    └── TranscriptionStorage.ts # File storage & retrieval

constants/
└── whisper.ts                 # Whisper model configurations
```

## 🎯 Usage Guide

### Recording Audio

1. **Start Recording**
   - Tap the blue "Start Recording" button
   - Grant microphone permission if prompted
   - Speak clearly into your device microphone
   - Watch the timer count up

2. **Stop Recording**
   - Tap the red "Stop Recording" button
   - App automatically begins transcription
   - Watch real-time segments appear on screen

3. **View Results**
   - Full transcription appears at the top
   - Individual segments show below with timestamps
   - Green success banner confirms files are saved
   - Tap "View in History" to see in library

### Viewing History

1. **Access History**
   - Tap "📚 View History" from home screen
   - Or tap the 📚 icon from transcribe screen

2. **Browse Transcriptions**
   - Scroll through your saved transcriptions
   - Each card shows date, duration, language, and preview
   - Pull down to refresh the list

3. **Card Actions**
   - **👁 View**: Open detailed view with all formats
   - **📤 Share**: Share transcription text
   - **🗑 Delete**: Remove transcription (confirms before deleting)

### Viewing Individual Transcriptions

1. **Open Viewer**
   - Tap any transcription card in history
   - View metadata: date, language, duration, segments

2. **Switch View Modes**
   - **Text**: Full transcription in readable format
   - **Segments**: Time-stamped segments (e.g., "0.5s - 3.2s")
   - **JSON**: Complete data with metadata
   - **SRT**: Standard subtitle format with timecodes

3. **Share Formats**
   - Tap 📤 Share button in top-right
   - Current view mode determines share format
   - Share via messaging, email, or save to files

## 🔧 Configuration

### Whisper Models

Edit `constants/whisper.ts` to use different Whisper models:

```typescript
export const WHISPER_TINY_MODEL = {
  id: "whisper-tiny",
  name: "Whisper Tiny",
  path: "models/ggml-tiny.bin",
  url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin",
  size: 75 * 1024 * 1024, // 75 MB
};
```

Available models:

- **Tiny** (75MB) - Fastest, lowest accuracy
- **Base** (142MB) - Recommended balance ✅
- **Small** (466MB) - Better accuracy, slower
- **Medium** (1.5GB) - High accuracy, requires powerful device
- **Large** (2.9GB) - Best accuracy, very slow

### Audio Settings

Edit `constants/whisper.ts` to change audio parameters:

```typescript
export const AUDIO_SETTINGS = {
  sampleRate: 16000, // Whisper requires 16kHz
  channels: 1, // Mono audio
  bitRate: 128000, // 128 kbps
  format: "wav", // WAV format for best compatibility
};
```

### Supported Languages

The app supports 13 languages with auto-detection:

- English (en)
- Spanish (es)
- French (fr)
- German (de)
- Italian (it)
- Portuguese (pt)
- Dutch (nl)
- Japanese (ja)
- Korean (ko)
- Chinese (zh)
- Russian (ru)
- Arabic (ar)
- Hindi (hi)
- Auto-detect (auto) ✅ Default

## 📂 File Formats

### JSON Format

```json
{
  "id": "transcription_2026-02-03T10-30-00-000Z",
  "timestamp": 1706956200000,
  "duration": 15000,
  "language": "en",
  "text": "Full transcription text here...",
  "segments": [
    {
      "start": 0.0,
      "end": 3.5,
      "text": "First segment text"
    }
  ],
  "audioUri": "file:///path/to/recording.wav"
}
```

### SRT Format

```srt
1
00:00:00,000 --> 00:00:03,500
First segment text

2
00:00:03,500 --> 00:00:07,200
Second segment text
```

## 🛠️ Troubleshooting

### Model Download Issues

**Problem**: Model download fails or times out
**Solutions**:

- Check internet connection
- Try cellular data if WiFi is unstable
- Download may take 5-10 minutes on slow connections
- Restart app to resume download (it's resumable)

### Recording Permission Denied

**Problem**: Cannot access microphone
**Solutions**:

- Go to device Settings → Apps → AI Notes → Permissions
- Enable "Microphone" permission
- Restart the app

### Build Errors (Android)

**Problem**: `SDK location not found`
**Solution**:

```bash
# Create android/local.properties
echo "sdk.dir=C:\\Users\\YourUsername\\AppData\\Local\\Android\\Sdk" > android/local.properties
```

**Problem**: Build fails with "execution failed for task"
**Solution**:

```bash
cd android
./gradlew clean
cd ..
npx expo run:android
```

### App Crashes on Launch

**Problem**: App crashes immediately after opening
**Solutions**:

1. Check device logs: `adb logcat | grep "ai_notes"`
2. Verify model file exists: Check app files for `models/ggml-base.bin`
3. Clear app data: Settings → Apps → AI Notes → Clear Data
4. Reinstall the app

### Transcription Not Working

**Problem**: Recording completes but no transcription appears
**Solutions**:

1. Check audio file was created (should be in app's cache directory)
2. Verify Whisper model is loaded (check logs for "Whisper ready!")
3. Try recording for at least 2-3 seconds
4. Speak clearly and ensure microphone isn't muffled
5. Check device has sufficient storage space

## 🚀 Performance Tips

1. **First Transcription**: May take longer as model initializes
2. **Short Recordings**: Process faster (5-10 seconds ideal for testing)
3. **Long Recordings**: May take 30-60 seconds to transcribe 1 minute of audio
4. **Background Apps**: Close other apps for better performance
5. **Device Storage**: Ensure 500MB+ free space for smooth operation

## 📊 File Storage

All files are stored in the app's document directory:

```
{DocumentDirectory}/
├── models/
│   └── ggml-base.bin          # Whisper AI model (142MB)
├── transcriptions/
│   ├── transcription_*.json   # JSON transcriptions
│   └── transcription_*.srt    # SRT subtitles
└── recordings/
    └── recording_*.wav         # Temporary audio files
```

**Storage Requirements**:

- Whisper Base Model: 142 MB
- Each recording: ~1-5 MB (depends on length)
- Each transcription: 5-50 KB (JSON + SRT combined)
- Total for 100 transcriptions: ~150-200 MB

## 🔐 Privacy & Security

- **100% Offline**: All processing happens on-device
- **No Cloud Services**: No data sent to external servers
- **No Analytics**: No tracking or telemetry
- **Local Storage**: All files stored only on your device
- **No Account Required**: No sign-up or login needed
- **Full Control**: Delete any transcription at any time

## 🤝 Contributing

Contributions are welcome! Areas for improvement:

1. **More Languages**: Add support for more languages
2. **Cloud Sync**: Optional cloud backup feature
3. **Export Options**: PDF, DOCX export formats
4. **Voice Commands**: Control app with voice
5. **Timestamps in Text**: Add inline timestamps
6. **Search**: Search within transcriptions
7. **Tags**: Organize transcriptions with tags
8. **Speaker Diarization**: Identify multiple speakers

## 📄 License

This project is open source and available under the MIT License.

## 🙏 Acknowledgments

- **Whisper AI** by OpenAI - Speech recognition model
- **whisper.rn** - React Native wrapper for whisper.cpp
- **Expo** - React Native framework and tooling
- **React Native Community** - Components and libraries

## 📞 Support

For issues, questions, or feature requests:

1. Check this README thoroughly
2. Review troubleshooting section
3. Check app logs: `adb logcat` (Android) or Xcode console (iOS)
4. Open an issue on GitHub with:
   - Device model and OS version
   - App version
   - Steps to reproduce
   - Logs or screenshots

---

**Built with ❤️ using React Native, Expo, and Whisper AI**

_Last Updated: February 3, 2026_
