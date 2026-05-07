# Audio Recorder Architecture Diagram

## System Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                         APP SHELL                               │
│  app/_layout.tsx (Root Layout) + app/(tabs)/_layout.tsx        │
│  ├─ Tabs Navigator                                             │
│  │  ├─ Recorder Tab → app/(tabs)/index.tsx                    │
│  │  └─ Library Tab → app/(tabs)/explore.tsx                   │
└────────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┴────────────────┐
                │                              │
         ┌──────▼─────────┐          ┌────────▼────────┐
         │  HomeScreen    │          │ LibraryScreen   │
         │ (Recorder Tab) │          │  (Library Tab)  │
         └──────┬─────────┘          └────────┬────────┘
                │                              │
      ┌─────────┼─────────┐          ┌────────┴────────┐
      │         │         │          │                 │
  ┌───▼──┐ ┌───▼──┐ ┌───▼─┐    ┌──▼────┐      ┌──▼─────┐
  │Waveform│ │Control│ │Info│    │ Card  │      │ Stats  │
  │        │ │Button │ │Box │    │List   │      │ Panel  │
  └────────┘ └───────┘ └────┘    └───────┘      └────────┘

┌────────────────────────────────────────────────────────────────┐
│                    CUSTOM HOOKS & SERVICES                     │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  useAudioRecorder()                   fileStorageService       │
│  ├─ Recording Control                 ├─ Save Recording       │
│  │  ├─ startRecording()               ├─ Get Recordings       │
│  │  ├─ stopRecording()                ├─ Delete Recording     │
│  │  ├─ pauseRecording()               ├─ Update Metadata     │
│  │  └─ resumeRecording()              ├─ Clear All            │
│  │                                     └─ Initialize Storage  │
│  ├─ Playback Control                                          │
│  │  ├─ playRecording()                                        │
│  │  └─ stopPlayback()                                         │
│  │                                                             │
│  ├─ State Management                                          │
│  │  ├─ isRecording                                            │
│  │  ├─ isPaused                                               │
│  │  ├─ duration                                               │
│  │  └─ metering                                               │
│  │                                                             │
│  └─ Animations                                                │
│     └─ waveValue (Animated.Shared<number>)                   │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
                              │
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
   ┌────▼──────┐      ┌───────▼────────┐    ┌──────▼──────┐
   │  expo-av  │      │ expo-file-      │    │ AsyncStorage│
   │           │      │ system          │    │             │
   │ Audio.    │      │                 │    │ Metadata    │
   │ Recording │      │ • FileSystem    │    │ Storage     │
   │ Audio.    │      │ • moveAsync     │    │             │
   │ Sound     │      │ • deleteAsync   │    └─────────────┘
   │           │      │ • getInfoAsync  │
   └───────────┘      └─────────────────┘

```

## Data Flow Diagram

```
RECORDING FLOW:
═══════════════

User Taps Record Button
       │
       ▼
 Request Permissions
       │
       ▼
 Audio.Recording.startAsync()
       │
       ├─────────────────────────┐
       │                         │
   Track Duration        Track Metering
     (100ms)              (100ms)
       │                         │
       └────┬────────────────────┘
            │
       State Updated
      (duration, metering)
            │
       ▼  (Update UI)
    Waveform Animation
            │
            ▼
User Taps Stop Button
            │
            ▼
Audio.Recording.stopAndUnloadAsync()
            │
            ▼
Get Recording URI
            │
            ▼
fileStorageService.saveRecording(uri)
            │
            ├─── FileSystem.moveAsync()  [Cache → Document]
            │
            ├─── getInfoAsync()          [Get file size]
            │
            └─── AsyncStorage.setItem()  [Save metadata]
                        │
                        ▼
            ✅ Recording Saved
                Recording Metadata:
                {id, filename, fileUri, duration, 
                 createdAt, title, tags, fileSize}


PLAYBACK FLOW:
═══════════════

User Presses Play on Card
       │
       ▼
Audio.Sound.createAsync(uri)
       │
       ▼
sound.playAsync()
       │
       ├──────────────────┐
       │                  │
   Playing             Monitoring Status
       │                  │
       └──────┬───────────┘
              │
         setOnPlaybackStatusUpdate()
              │
              ├─► didJustFinish?
              │   └──► setPlayingId(null)
              │
              ▼
User Presses Pause/Stop
              │
              ▼
sound.stopAsync()
              │
              ▼
sound.unloadAsync()
              │
              ▼
playingId = null


LIBRARY FLOW:
═════════════

Load LibraryScreen
       │
       ▼
useFocusEffect()
       │
       ▼
fileStorageService.getRecordings()
       │
       ├─── AsyncStorage.getItem()
       │
       └─── Sort by createdAt (DESC)
              │
              ▼
       setRecordings([...])
              │
              ▼
    FlatList Renders Cards
              │
              ├─ RecordingCard
              │  ├─ Play Button
              │  │  └─► handlePlayRecording()
              │  └─ Delete Button
              │     └─► handleDeleteRecording()
              │
              ▼
Display Stats
(Total Duration, Total Size)


DELETE FLOW:
════════════

User Taps Delete
       │
       ▼
Show Confirmation Alert
       │
       └─► User Confirms
              │
              ▼
Stop Playback (if playing)
       │
       ▼
fileStorageService.deleteRecording(id)
       │
       ├─── FileSystem.deleteAsync(uri)
       │
       └─── Remove from AsyncStorage metadata
              │
              ▼
Remove from FlatList
              │
              ▼
✅ Deleted
```

## Component Hierarchy

```
App Root
│
└── (Tabs) Layout
    │
    ├── Recorder Tab (index.tsx)
    │   │
    │   └── HomeScreen
    │       ├── ScrollView
    │       │   ├── Header
    │       │   │   ├── Title: "Audio Recorder"
    │       │   │   └── Subtitle: "Record high-quality audio"
    │       │   │
    │       │   ├── Recording Area
    │       │   │   ├── Duration Display (MM:SS)
    │       │   │   ├── Waveform (if recording)
    │       │   │   │   └── 40 Bar Components
    │       │   │   └── Placeholder Icon (if not recording)
    │       │   │
    │       │   ├── Controls Section
    │       │   │   └── RecorderButton
    │       │   │       ├── Record Button (if idle)
    │       │   │       ├── Pause Button (if recording)
    │       │   │       └── Stop Button (if recording)
    │       │   │
    │       │   ├── Info Section
    │       │   │   └── Recording Tips
    │       │   │
    │       │   └── Background Notice (if recording)
    │       │       └── "Recording will continue..."
    │
    └── Library Tab (explore.tsx)
        │
        └── LibraryScreen
            ├── Header
            │   ├── Title: "Library"
            │   ├── Count: "2 recordings"
            │   └── Clear All Button
            │
            ├── Stats Panel (if has recordings)
            │   ├── Total Duration
            │   └── Total Size
            │
            ├── FlatList
            │   │
            │   └── RecordingCard (for each recording)
            │       ├── Header
            │       │   ├── Title
            │       │   ├── Date/Time
            │       │   └── More Menu
            │       │
            │       ├── Footer
            │       │   ├── Duration Stat
            │       │   ├── Size Stat
            │       │   ├── Play Button
            │       │   └── Delete Button
            │       │
            │       └── Tags (if present)
            │           └── Tag Badges
            │
            └── Empty State
                ├── Mic Icon
                ├── "No recordings yet"
                └── Instructions
```

## State Management

```
useAudioRecorder Hook State:
─────────────────────────────

{
  isRecording: boolean          ─── Is actively recording?
  isPaused: boolean             ─── Is recording paused?
  duration: number              ─── Duration in milliseconds
  metering: number              ─── Audio level (0-1)
}

↓
Updated by:
├─ startRecording()     ─ isRecording = true
├─ pauseRecording()     ─ isPaused = true
├─ resumeRecording()    ─ isPaused = false
├─ stopRecording()      ─ isRecording = false, isPaused = false
└─ 100ms Interval       ─ duration++, metering = audioLevel


AsyncStorage Metadata:
──────────────────────

RecordingMetadata {
  id: string                    ─── "recording_1715082600000"
  filename: string              ─── "recording_1715082600000.m4a"
  fileUri: string               ─── "/Documents/recordings/..."
  duration: number              ─── Duration in milliseconds
  createdAt: string             ─── ISO timestamp
  title: string                 ─── "Meeting Notes"
  tags: string[]                ─── ["work", "important"]
  mimeType: string              ─── "audio/mp4"
  fileSize: number              ─── Size in bytes
}

Storage Format:
@audio_recordings_metadata = {
  "recording_1715082600000": { ...metadata },
  "recording_1715082700000": { ...metadata },
  ...
}


File System Structure:
─────────────────────

${documentDirectory}
└── recordings/
    ├── recording_1715082600000.m4a     [2.5 MB]
    ├── recording_1715082700000.m4a     [3.2 MB]
    └── recording_1715082800000.m4a     [2.8 MB]
```

## Animation Pipeline

```
Audio Metering Data
       │
       ▼
useAudioRecorder Hook
       │
       ├─ Normalize: (metering + 160) / 160
       │
       ├─ Clamp: Math.min(1, Math.max(0, normalized))
       │
       └─ setState({ metering })
              │
              ▼
    waveValue.value = withSpring(normalized)
              │
              ▼
      Animated Value Updates
              │
         ┌────┴─────┬────────┬─────────┐
         │          │        │         │
      Bar 0      Bar 1   Bar 2  ...  Bar 39
         │          │        │         │
         ├─ interpolate() ──┤
         │  (index impact)  │
         │                  │
         ├─ height update ──┤
         │  (0-40px)        │
         │                  │
         └─ render ─────────┘
              │
              ▼
         Smooth 60fps Animation
```

---

**This architecture ensures:**
- ✅ Clean separation of concerns
- ✅ Reusable components and hooks
- ✅ Efficient state management
- ✅ Optimal performance
- ✅ Easy testing and maintenance
