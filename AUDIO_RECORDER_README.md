# Audio Recorder App - Modern Expo Implementation

A full-featured audio recording application built with React Native, Expo, and TypeScript. Features real-time waveform visualization, persistent storage, dark mode support, and a beautiful glassmorphic UI.

## 🎯 Features

### Phase 1: Core Libraries

- **expo-av** - High-quality audio recording and playback
- **expo-file-system** - Persistent file management and storage
- **@expo/vector-icons** - Modern Material Design icons
- **react-native-reanimated** - Smooth waveform animations
- **@gorhom/bottom-sheet** - Bottom sheet UI (ready for future enhancements)
- **@react-native-async-storage/async-storage** - Metadata persistence
- **@shopify/flash-list** - Optimized list rendering

### Phase 2: Audio Engine & Storage

✅ **Permissions**

- Automatic RECORD_AUDIO permission requests
- iOS microphone usage description in app.json
- Android permission manifest configuration
- Background audio capability enabled

✅ **Recording Configuration**

- High-quality .m4a audio format (preset: HIGH_QUALITY)
- Real-time metering/level detection
- Duration tracking with millisecond precision
- Pause/resume functionality
- Automatic file movement from cache to permanent storage

✅ **Persistent Storage**

- Timestamped filenames: `recording_${timestamp}.m4a`
- Recordings stored in app's document directory
- Metadata stored with AsyncStorage (title, tags, duration, file size, date)
- Delete individual recordings or clear all
- Support for custom titles and tags

### Phase 3: Modern UI/UX Design

✅ **Waveform Visualization**

- 40-bar animated waveform
- Real-time audio metering animation
- Spring-based smooth transitions
- Responsive bar heights based on audio levels
- Color-coded by recording state (blue: recording, amber: paused)

✅ **Glassmorphism Design**

- Semi-transparent cards with blur effects
- Gradient backgrounds
- Modern color palette (Tailwind-inspired)
- Smooth shadows and depth

✅ **Dark Mode Support**

- Full light/dark theme support using useColorScheme()
- Automatic theme detection
- All components respect system preferences
- Consistent color palette across themes

✅ **Bottom Navigation**

- Two-tab interface: Recorder & Library
- Custom tab icons (mic & library-music)
- Haptic feedback on tab press

### Phase 4: Data Management & Features

✅ **Recording Library**

- Browse saved recordings with FlatList
- Metadata display: title, date, duration, file size
- Sortable by date (newest first)
- Play/pause individual recordings
- Delete with confirmation dialogs

✅ **Metadata Management**

- Custom titles (with sensible defaults)
- Tag system support (ready for UI)
- File duration and size tracking
- Creation timestamps
- MIME type information

✅ **Background Recording**

- Configured in app.json with UIBackgroundModes: ["audio"]
- Recordings continue when device is locked
- Proper audio session handling

## 📁 Project Structure

```
/src
  /components
    - RecorderButton.tsx         # Record/pause/stop controls
    - Waveform.tsx              # Animated waveform visualization
    - RecordingCard.tsx         # Recording list item component
  /hooks
    - useAudioRecorder.ts       # Custom hook for all audio logic
  /services
    - fileStorage.ts            # File management & metadata persistence
  /screens
    - HomeScreen.tsx            # Main recorder interface
    - LibraryScreen.tsx         # Saved recordings list
  /types
    - index.ts                  # TypeScript interfaces
```

## 🚀 Getting Started

### Installation

```bash
npm install
```

### Running the App

```bash
# iOS
npm run ios

# Android
npm run android

# Web
npm run web

# Start development server
npm start
```

## 🔧 Key Implementation Details

### useAudioRecorder Hook

The custom `useAudioRecorder` hook provides a complete recording interface:

```typescript
const {
  state, // {isRecording, isPaused, duration, metering}
  requestPermissions, // Request microphone access
  startRecording, // Begin recording
  stopRecording, // Stop and save recording
  pauseRecording, // Pause recording
  resumeRecording, // Resume paused recording
  playRecording, // Play saved recording
  stopPlayback, // Stop playback
  formatDuration, // Format ms to MM:SS
  waveValue, // Animated.Shared<number> for waveform
} = useAudioRecorder();
```

### File Storage Service

The `fileStorageService` handles all persistence:

```typescript
// Save a recording
const metadata = await fileStorageService.saveRecording(uri, title);

// Get all recordings
const recordings = await fileStorageService.getRecordings();

// Delete recording
await fileStorageService.deleteRecording(id);

// Update metadata (title, tags, etc)
await fileStorageService.updateMetadata(id, updates);

// Clear all recordings
await fileStorageService.clearAllRecordings();
```

### HomeScreen Features

- Live duration counter (MM:SS format)
- Animated waveform during recording
- Pause/resume/stop controls
- Paused state indicator
- Recording tips section
- Background recording notice
- Automatic permission handling

### LibraryScreen Features

- Browse all saved recordings
- Play/pause individual files
- Delete with confirmation
- Sort by creation date (newest first)
- Statistics: Total duration, Total size
- Empty state messaging
- Loading state

## 🎨 UI Components

### RecorderButton

Responsive recording controls that change based on state:

- **Idle**: Large red mic button
- **Recording**: Pause (amber) + Stop (red) buttons
- **Paused**: Play (amber) + Stop (red) buttons

### Waveform

40-bar animated visualization:

- Responsive to audio metering levels
- Center-focused animation emphasis
- Smooth spring-based transitions
- Theme-aware colors

### RecordingCard

Detailed recording metadata display:

- Title with date/time
- Duration and file size stats
- Play/delete actions
- Tag badges (if present)
- Dark mode support

## 🔐 Permissions

### iOS

```json
{
  "NSMicrophoneUsageDescription": "This app uses your microphone to record audio.",
  "UIBackgroundModes": ["audio"]
}
```

### Android

```xml
<uses-permission android:name="android.permission.RECORD_AUDIO" />
```

## 💾 Data Storage

### Recordings Directory

- Location: `${FileSystem.documentDirectory}recordings/`
- Format: `.m4a` (MP4 audio)
- Naming: `recording_${timestamp}.m4a`

### Metadata Storage

- Service: AsyncStorage
- Key: `@audio_recordings_metadata`
- Format: JSON object indexed by recording ID

## 🎬 Recording Configuration

**Preset**: `Audio.RecordingOptionsPresets.HIGH_QUALITY`

- Bitrate: 128 kbps
- Sample rate: 44100 Hz
- Channels: 2 (stereo)
- Format: m4a (MPEG-4 audio)

## 🌙 Dark Mode Support

All components automatically adapt to system theme:

- Uses `useColorScheme()` hook from React Native
- Consistent color palette across light/dark modes
- Automatic theme detection on app launch
- Real-time theme switching support

## 📊 State Management

### Recording State

```typescript
{
  isRecording: boolean; // Currently recording
  isPaused: boolean; // Recording is paused
  duration: number; // Duration in milliseconds
  metering: number; // Audio level (0-1) for waveform
}
```

### Recording Metadata

```typescript
{
  id: string;              // Unique identifier
  filename: string;        // File name
  fileUri: string;         // File path
  duration: number;        // Duration in ms
  createdAt: string;       // ISO timestamp
  title: string;           // Custom title
  tags: string[];          // Tag list
  mimeType: string;        // audio/mp4
  fileSize: number;        // Size in bytes
}
```

## 🔄 Lifecycle Hooks

### HomeScreen

- Requests permissions on mount
- Shows error alert if denied
- Initializes file storage system
- Cleans up recording intervals on unmount

### LibraryScreen

- Loads recordings when screen is focused
- Handles sound playback lifecycle
- Manages sound unloading
- Confirms deletion before removing files

## ✅ Quality Assurance

- **TypeScript**: Strict mode enabled
- **ESLint**: Configured for React Native + Expo
- **Permissions**: Automatic request + graceful fallback
- **Error Handling**: Try-catch blocks throughout
- **Memory Management**: Proper cleanup of intervals and sounds
- **Performance**: Optimized re-renders and animations

## 🚀 Future Enhancements

- [ ] Bottom sheet for recording list preview
- [ ] Recording trimming/editing
- [ ] Audio format selection
- [ ] Cloud backup integration (Firebase, Supabase)
- [ ] SQLite local database (instead of AsyncStorage)
- [ ] Waveform thumbnail generation
- [ ] Recording sharing
- [ ] Advanced filtering/search
- [ ] Recording categories
- [ ] Playback speed control
- [ ] Multi-track recording
- [ ] Audio visualization during playback

## 📝 Notes

- Recordings are saved in the app's document directory (not accessible by other apps)
- Audio continues in background when device is locked (iOS/Android)
- Metadata is stored locally; no cloud sync by default
- Pause/resume doesn't create new files (single continuous audio file)
- Metering updates at 100ms intervals for smooth waveform animation

## 🐛 Troubleshooting

### No microphone permission

- Ensure you've clicked "Allow" when prompted
- On iOS, check Settings > Privacy > Microphone
- On Android, check App Permissions > Microphone

### Recordings not persisting

- Check that document directory is accessible
- Verify AsyncStorage is properly initialized
- Clear app cache/data and try again

### Waveform not animating

- Ensure react-native-reanimated is installed and linked
- Check console for errors during recording start

### Background recording not working

- Verify `UIBackgroundModes: ["audio"]` is in app.json (iOS)
- Ensure Android manifest has proper permissions

## 📄 License

This project is part of the aiwrapper application.

---

**Built with ❤️ using Expo, React Native, and TypeScript**
