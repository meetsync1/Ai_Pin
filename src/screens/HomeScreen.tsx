import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  useColorScheme,
  ScrollView,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { Waveform } from '../components/Waveform';
import { RecorderButton } from '../components/RecorderButton';
import { MaterialIcons } from '@expo/vector-icons';

export const HomeScreen: React.FC = () => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();
  const {
    state,
    requestPermissions,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    formatDuration,
    waveValue,
  } = useAudioRecorder();

  useEffect(() => {
    const setupAudio = async () => {
      const granted = await requestPermissions();
      if (!granted) {
        Alert.alert(
          'Permission Denied',
          'Audio recording permission is required to use this app.',
          [{ text: 'OK' }]
        );
      }
    };

    setupAudio();
  }, [requestPermissions]);

  const handleStopRecording = async () => {
    const metadata = await stopRecording();
    if (metadata) {
      Alert.alert(
        'Recording Saved',
        `Your recording "${metadata.title}" has been saved successfully.`,
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <ScrollView
      style={[
        styles.container,
        { backgroundColor: isDark ? '#111827' : '#ffffff' },
      ]}
      contentContainerStyle={{ flexGrow: 1 }}
    >
      <View
        style={[
          styles.content,
          { paddingTop: insets.top, paddingBottom: insets.bottom },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text
            style={[
              styles.title,
              { color: isDark ? '#f3f4f6' : '#111827' },
            ]}
          >
            Audio Recorder
          </Text>
          <Text
            style={[
              styles.subtitle,
              { color: isDark ? '#9ca3af' : '#6b7280' },
            ]}
          >
            Record high-quality audio
          </Text>
        </View>

        {/* Main Recording Area */}
        <View
          style={[
            styles.recordingArea,
            {
              backgroundColor: isDark ? '#1f2937' : '#f9fafb',
              borderColor: isDark ? '#374151' : '#e5e7eb',
            },
          ]}
        >
          {/* Duration Display */}
          <Text
            style={[
              styles.durationText,
              {
                color: state.isPaused ? '#f59e0b' : state.isRecording ? '#ef4444' : isDark ? '#d1d5db' : '#374151',
              },
            ]}
          >
            {formatDuration(state.duration)}
          </Text>

          {/* Waveform */}
          {state.isRecording && (
            <View style={styles.waveformContainer}>
              <Waveform
                value={waveValue}
                color={state.isPaused ? '#f59e0b' : '#3b82f6'}
                numberOfBars={40}
              />
            </View>
          )}

          {!state.isRecording && (
            <View style={styles.placeholderContainer}>
              <MaterialIcons
                name="mic-none"
                size={64}
                color={isDark ? '#4b5563' : '#d1d5db'}
              />
              <Text
                style={[
                  styles.placeholderText,
                  { color: isDark ? '#6b7280' : '#9ca3af' },
                ]}
              >
                {state.duration === 0
                  ? 'Tap to start recording'
                  : 'Recording paused'}
              </Text>
            </View>
          )}

          {state.isPaused && (
            <View style={styles.pausedIndicator}>
              <MaterialIcons
                name="pause-circle-filled"
                size={24}
                color="#f59e0b"
              />
              <Text
                style={[
                  styles.pausedText,
                  { color: isDark ? '#fbbf24' : '#f59e0b' },
                ]}
              >
                Paused
              </Text>
            </View>
          )}
        </View>

        {/* Recording Controls */}
        <View style={styles.controlsSection}>
          <RecorderButton
            isRecording={state.isRecording}
            isPaused={state.isPaused}
            onStartPress={startRecording}
            onStopPress={handleStopRecording}
            onPausePress={pauseRecording}
            onResumePress={resumeRecording}
          />
        </View>

        {/* Info Section */}
        <View
          style={[
            styles.infoSection,
            {
              backgroundColor: isDark ? '#1f2937' : '#f0f9ff',
              borderColor: isDark ? '#374151' : '#bfdbfe',
            },
          ]}
        >
          <View style={styles.infoRow}>
            <MaterialIcons
              name="info"
              size={20}
              color={isDark ? '#93c5fd' : '#3b82f6'}
            />
            <View style={styles.infoText}>
              <Text
                style={[
                  styles.infoTitle,
                  { color: isDark ? '#dbeafe' : '#1e40af' },
                ]}
              >
                Recording Tips
              </Text>
              <Text
                style={[
                  styles.infoDescription,
                  { color: isDark ? '#9ca3af' : '#60a5fa' },
                ]}
              >
                • Hold your device steady near your mouth{'\n'}
                • Use a quiet environment for best quality{'\n'}
                • Pause and resume as needed
              </Text>
            </View>
          </View>
        </View>

        {/* Background Recording Notice */}
        {state.isRecording && (
          <View
            style={[
              styles.bgRecordingNotice,
              {
                backgroundColor: isDark ? '#065f46' : '#ecfdf5',
                borderColor: isDark ? '#047857' : '#86efac',
              },
            ]}
          >
            <MaterialIcons
              name="check-circle"
              size={16}
              color={isDark ? '#86efac' : '#10b981'}
            />
            <Text
              style={[
                styles.bgRecordingText,
                { color: isDark ? '#86efac' : '#059669' },
              ]}
            >
              Recording will continue if you lock your device
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 20,
    justifyContent: 'space-between',
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
  },
  recordingArea: {
    borderRadius: 16,
    padding: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    marginBottom: 24,
    minHeight: 200,
  },
  durationText: {
    fontSize: 48,
    fontWeight: '700',
    marginBottom: 16,
    fontVariant: ['tabular-nums'],
  },
  waveformContainer: {
    width: '100%',
    marginVertical: 16,
  },
  placeholderContainer: {
    alignItems: 'center',
    gap: 12,
  },
  placeholderText: {
    fontSize: 14,
    fontWeight: '500',
  },
  pausedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
  },
  pausedText: {
    fontSize: 16,
    fontWeight: '600',
  },
  controlsSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  infoSection: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 12,
  },
  infoText: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  infoDescription: {
    fontSize: 12,
    lineHeight: 18,
  },
  bgRecordingNotice: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
  },
  bgRecordingText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
