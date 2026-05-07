# Audio Recorder - Advanced Integration Guide

This guide shows how to extend and integrate the audio recorder with other features and services.

## 🔌 Integration Patterns

### Pattern 1: Add Recording to Existing Screens

Import and use the recorder in any screen:

```typescript
import { HomeScreen } from '@/src/screens/HomeScreen';

// Option A: Use as full screen
export default HomeScreen;

// Option B: Embed in existing screen
import { useAudioRecorder } from '@/src/hooks/useAudioRecorder';

export function MyScreen() {
  const { state, startRecording, stopRecording } = useAudioRecorder();
  
  return (
    <View>
      {/* Your existing UI */}
      <Button 
        title={state.isRecording ? 'Stop Recording' : 'Start Recording'}
        onPress={state.isRecording ? stopRecording : startRecording}
      />
    </View>
  );
}
```

### Pattern 2: Handle Recording Completion

```typescript
import { fileStorageService } from '@/src/services/fileStorage';

async function handleRecordingComplete(metadata) {
  // Metadata structure:
  // {
  //   id: string,
  //   filename: string,
  //   fileUri: string,
  //   duration: number,
  //   createdAt: string,
  //   title: string,
  //   tags: string[],
  //   mimeType: string,
  //   fileSize: number
  // }
  
  console.log(`Recording saved: ${metadata.filename}`);
  
  // Send to server
  await uploadToServer(metadata);
  
  // Update database
  await saveToDatabase(metadata);
  
  // Show notification
  showSuccessNotification('Recording saved!');
}
```

### Pattern 3: Extend with Database

Replace AsyncStorage with SQLite:

```typescript
import * as SQLite from 'expo-sqlite';

const db = await SQLite.openDatabaseAsync('recordings.db');

// Initialize table
await db.execAsync(`
  CREATE TABLE IF NOT EXISTS recordings (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    fileUri TEXT NOT NULL,
    duration INTEGER NOT NULL,
    createdAt TEXT NOT NULL,
    title TEXT,
    tags TEXT,
    mimeType TEXT,
    fileSize INTEGER
  );
`);

// Save metadata
async function saveRecordingMetadata(metadata) {
  await db.runAsync(
    `INSERT INTO recordings VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      metadata.id,
      metadata.filename,
      metadata.fileUri,
      metadata.duration,
      metadata.createdAt,
      metadata.title,
      JSON.stringify(metadata.tags),
      metadata.mimeType,
      metadata.fileSize,
    ]
  );
}

// Query recordings
async function getRecordingsFromDB() {
  const records = await db.getAllAsync('SELECT * FROM recordings ORDER BY createdAt DESC');
  return records.map(r => ({
    ...r,
    tags: JSON.parse(r.tags || '[]')
  }));
}
```

### Pattern 4: Cloud Backup Integration

```typescript
import * as FileSystem from 'expo-file-system';
import { fileStorageService } from '@/src/services/fileStorage';

// Upload recording to Supabase
async function uploadToSupabase(metadata) {
  const fileUri = metadata.fileUri;
  const fileName = metadata.filename;
  
  // Read file as base64
  const base64 = await FileSystem.readAsStringAsync(fileUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  
  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from('recordings')
    .upload(`${userId}/${fileName}`, base64);
    
  if (error) throw error;
  
  // Save reference in database
  await saveMetadataWithCloudUrl(metadata, data.path);
}

// Download recording from cloud
async function downloadFromSupabase(cloudPath) {
  const { data, error } = await supabase.storage
    .from('recordings')
    .download(cloudPath);
    
  if (error) throw error;
  
  // Save locally
  const localUri = `${FileSystem.documentDirectory}recordings/${Date.now()}.m4a`;
  await FileSystem.writeAsStringAsync(localUri, data, {
    encoding: FileSystem.EncodingType.Base64,
  });
  
  return localUri;
}
```

### Pattern 5: Add Recording to Existing Flow

Example: Voice memo in a note-taking app

```typescript
import { useAudioRecorder } from '@/src/hooks/useAudioRecorder';

function CreateNoteScreen() {
  const { state, startRecording, stopRecording } = useAudioRecorder();
  const [attachedAudio, setAttachedAudio] = useState(null);
  
  async function handleAttachAudio() {
    if (state.isRecording) {
      const metadata = await stopRecording();
      setAttachedAudio(metadata);
    } else {
      await startRecording();
    }
  }
  
  async function handleSaveNote() {
    const noteData = {
      title: noteTitle,
      content: noteContent,
      audioAttachment: attachedAudio ? {
        uri: attachedAudio.fileUri,
        duration: attachedAudio.duration,
      } : null,
      createdAt: new Date(),
    };
    
    await saveNoteToDatabase(noteData);
  }
  
  return (
    <View>
      <TextInput value={noteTitle} placeholder="Note Title" />
      <TextInput value={noteContent} placeholder="Write or record..." />
      
      <Button 
        title={state.isRecording ? 'Stop Recording' : 'Attach Voice'}
        onPress={handleAttachAudio}
      />
      
      {attachedAudio && (
        <Text>🎙️ Audio attached: {formatDuration(attachedAudio.duration)}</Text>
      )}
      
      <Button title="Save Note" onPress={handleSaveNote} />
    </View>
  );
}
```

## 🎨 UI Customization

### Custom Recording Button

```typescript
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated from 'react-native-reanimated';

interface CustomRecorderButtonProps {
  isRecording: boolean;
  onPress: () => void;
}

export function CustomRecorderButton({
  isRecording,
  onPress,
}: CustomRecorderButtonProps) {
  const scale = useSharedValue(1);
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  
  const handlePress = () => {
    scale.value = withSequence(
      withTiming(0.9, { duration: 100 }),
      withTiming(1, { duration: 100 })
    );
    onPress();
  };
  
  return (
    <Animated.View style={animatedStyle}>
      <LinearGradient
        colors={isRecording ? ['#ff6b6b', '#ee5a6f'] : ['#4c51bf', '#667eea']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.button}
      >
        <Pressable onPress={handlePress}>
          <MaterialIcons 
            name={isRecording ? 'stop' : 'mic'} 
            size={32}
            color="white"
          />
        </Pressable>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
```

### Custom Waveform Style

```typescript
import { Waveform } from '@/src/components/Waveform';

// Gradient waveform
function GradientWaveform({ value }) {
  return (
    <View style={styles.container}>
      {[...Array(40)].map((_, i) => (
        <LinearGradient
          key={i}
          colors={['#667eea', '#764ba2', '#f093fb']}
          style={styles.bar}
        >
          <Bar index={i} totalBars={40} value={value} />
        </LinearGradient>
      ))}
    </View>
  );
}

// Circle waveform
function CircleWaveform({ value }) {
  return (
    <View style={styles.circle}>
      {[...Array(16)].map((_, i) => {
        const angle = (i / 16) * Math.PI * 2;
        return (
          <Animated.View
            key={i}
            style={[
              styles.bar,
              {
                transform: [
                  { rotate: `${angle}rad` },
                  { translateY: -50 },
                ],
              },
            ]}
          />
        );
      })}
    </View>
  );
}
```

## 🔊 Advanced Audio Features

### Add Recording Effects

```typescript
import { Audio } from 'expo-av';

async function applyEqualizerPreset(soundObject, preset) {
  const presets = {
    voice: { bass: -5, midrange: 5, treble: 2 },
    music: { bass: 3, midrange: 0, treble: 3 },
    podcast: { bass: 0, midrange: 3, treble: 1 },
  };
  
  // Note: Direct EQ manipulation requires native code
  // This is a placeholder for future enhancement
  console.log('Applying preset:', presets[preset]);
}

// Volume normalization
async function normalizeAudio(fileUri) {
  const { sound } = await Audio.Sound.createAsync({ uri: fileUri });
  
  // Analyze audio levels
  let maxLevel = 0;
  for (let i = 0; i < 100; i++) {
    const status = await sound.getStatusAsync();
    maxLevel = Math.max(maxLevel, status.metering);
  }
  
  // Calculate gain needed to normalize
  const targetLevel = -20; // dB
  const gain = targetLevel - maxLevel;
  
  console.log('Recommended gain:', gain, 'dB');
}
```

### Playback with Advanced Controls

```typescript
import { Audio } from 'expo-av';

class AdvancedAudioPlayer {
  sound: Audio.Sound | null = null;
  
  async play(uri: string) {
    const { sound } = await Audio.Sound.createAsync({ uri });
    this.sound = sound;
    
    // Set rate
    await sound.setRateAsync(1.0, true);
    
    // Set volume
    await sound.setVolumeAsync(1.0);
    
    // Play
    await sound.playAsync();
  }
  
  async changePlaybackRate(rate: number) {
    if (this.sound) {
      await this.sound.setRateAsync(rate, true);
    }
  }
  
  async seek(positionMs: number) {
    if (this.sound) {
      await this.sound.setPositionAsync(positionMs);
    }
  }
  
  async stop() {
    if (this.sound) {
      await this.sound.stopAsync();
      await this.sound.unloadAsync();
      this.sound = null;
    }
  }
}
```

## 📊 Analytics & Tracking

```typescript
// Track recording events
async function trackRecordingEvent(
  event: 'recording_started' | 'recording_stopped' | 'recording_deleted',
  metadata?: any
) {
  const eventData = {
    event,
    timestamp: new Date().toISOString(),
    ...metadata,
  };
  
  // Send to analytics service
  await analytics.logEvent(event, eventData);
  
  // Or save locally
  await saveEventToLocalDB(eventData);
}

// Usage
await trackRecordingEvent('recording_started');
const metadata = await stopRecording();
await trackRecordingEvent('recording_stopped', {
  duration: metadata.duration,
  fileSize: metadata.fileSize,
});
```

## 🧪 Testing

```typescript
import { useAudioRecorder } from '@/src/hooks/useAudioRecorder';

describe('Audio Recorder', () => {
  it('should record audio', async () => {
    const { startRecording, stopRecording, requestPermissions } = useAudioRecorder();
    
    const granted = await requestPermissions();
    expect(granted).toBe(true);
    
    await startRecording();
    
    // Simulate recording time
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const metadata = await stopRecording();
    expect(metadata?.filename).toBeDefined();
    expect(metadata?.fileUri).toBeDefined();
    expect(metadata?.duration).toBeGreaterThan(0);
  });
  
  it('should pause and resume recording', async () => {
    const { 
      startRecording, 
      pauseRecording, 
      resumeRecording, 
      stopRecording,
      state 
    } = useAudioRecorder();
    
    await startRecording();
    expect(state.isRecording).toBe(true);
    
    await pauseRecording();
    expect(state.isPaused).toBe(true);
    
    await resumeRecording();
    expect(state.isPaused).toBe(false);
    
    const metadata = await stopRecording();
    expect(metadata).toBeDefined();
  });
});
```

## 🚀 Performance Optimization

### Lazy Load Recording List

```typescript
import { FlashList } from '@shopify/flash-list';

function OptimizedLibrary() {
  const [recordings, setRecordings] = useState<RecordingMetadata[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const pageSize = 20;
  
  async function loadMore() {
    const allRecordings = await fileStorageService.getRecordings();
    const newRecordings = allRecordings.slice(0, recordings.length + pageSize);
    setRecordings(newRecordings);
    setHasMore(newRecordings.length < allRecordings.length);
  }
  
  return (
    <FlashList
      data={recordings}
      renderItem={({ item }) => <RecordingCard recording={item} />}
      onEndReached={loadMore}
      onEndReachedThreshold={0.5}
      estimatedItemSize={100}
    />
  );
}
```

### Memory Management

```typescript
// Clean up old recordings (older than 30 days)
async function cleanupOldRecordings() {
  const recordings = await fileStorageService.getRecordings();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  
  for (const recording of recordings) {
    if (new Date(recording.createdAt) < thirtyDaysAgo) {
      await fileStorageService.deleteRecording(recording.id);
    }
  }
}

// Run daily cleanup
useEffect(() => {
  const interval = setInterval(cleanupOldRecordings, 24 * 60 * 60 * 1000);
  return () => clearInterval(interval);
}, []);
```

---

## 📚 Additional Resources

- [Expo AV Documentation](https://docs.expo.dev/versions/latest/sdk/av/)
- [React Native Reanimated Docs](https://docs.swmansion.com/react-native-reanimated/)
- [AsyncStorage Reference](https://react-native-async-storage.github.io/async-storage/)
- [File System API](https://docs.expo.dev/versions/latest/sdk/filesystem/)

## 💬 Need Help?

Refer to the main `AUDIO_RECORDER_README.md` for troubleshooting and quick reference.
