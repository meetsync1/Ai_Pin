import { DEFAULT_WHISPER_MODEL } from "@/constants/whisper";
import ModelStorage from "@/services/storage/ModelStorage";
import { RecordingInfo } from "@/services/storage/RecordingStorage";
import TranscriptionStorage from "@/services/storage/TranscriptionStorage";
import type { TranscriptionSegment } from "@/services/whisper/types";
import WhisperService from "@/services/whisper/WhisperService";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function TranscribeScreen() {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [recordingTime, setRecordingTime] = useState(0);
  const [transcriptionText, setTranscriptionText] = useState("");
  const [segments, setSegments] = useState<TranscriptionSegment[]>([]);
  const [savedPaths, setSavedPaths] = useState<{
    json: string;
    srt: string;
  } | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [recordings, setRecordings] = useState<RecordingInfo[]>([]);
  const [showRecordings, setShowRecordings] = useState(false);

  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioUriRef = useRef<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Initialize Whisper on mount
  useEffect(() => {
    initializeWhisper();
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, []);

  // Auto-scroll when new text arrives
  useEffect(() => {
    if (transcriptionText && scrollViewRef.current) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  }, [transcriptionText]);

  // Pulse animation for recording button
  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording]);

  // Load recordings list for debugging
  const loadRecordings = async () => {
    try {
      const list = await RecordingStorage.listRecordings();
      setRecordings(list);
      console.log(`📁 Loaded ${list.length} recordings`);
    } catch (err) {
      console.error("Failed to load recordings:", err);
    }
  };

  // Play a recording to verify it has audio
  const playRecording = async (uri: string) => {
    try {
      console.log(`▶️ Playing recording: ${uri}`);
      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true }
      );

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
          console.log("✅ Playback finished");
        }
      });

      Alert.alert("Playing", "Recording is playing...");
    } catch (err) {
      console.error("Failed to play recording:", err);
      Alert.alert("Error", "Failed to play recording");
    }
  };

  // Transcribe a saved recording
  const transcribeSavedRecording = async (uri: string) => {
    if (!isModelLoaded) {
      Alert.alert("Error", "Whisper model not loaded");
      return;
    }

    setShowRecordings(false);
    await transcribeAudio(uri);
  };


  const initializeWhisper = async () => {
    try {
      setIsInitializing(true);
      setError(null);

      console.log("🚀 Initializing Whisper...");

      // Check if model exists
      const modelExists = await ModelStorage.checkModelExists(
        DEFAULT_WHISPER_MODEL.id,
      );

      if (!modelExists) {
        console.log("📥 Downloading Whisper model...");
        setError("Downloading Whisper model... This may take a few minutes.");

        await ModelStorage.downloadModel(
          DEFAULT_WHISPER_MODEL.id,
          DEFAULT_WHISPER_MODEL.url,
          (progress) => {
            setProgress(progress * 100);
          },
        );

        setError(null);
      }

      // Get model path and initialize
      const modelPath = await ModelStorage.getModelPath(
        DEFAULT_WHISPER_MODEL.id,
      );
      console.log("📦 Loading Whisper model from:", modelPath);

      await WhisperService.initialize(modelPath, DEFAULT_WHISPER_MODEL.name);

      setIsModelLoaded(true);
      console.log("✅ Whisper ready!");
    } catch (err) {
      console.error("❌ Whisper initialization error:", err);
      setError(
        err instanceof Error ? err.message : "Failed to initialize Whisper",
      );
    } finally {
      setIsInitializing(false);
    }
  };

  const startRecording = async () => {
    try {
      setIsRecording(true);
      setRecordingTime(0);
      setTranscriptionText("");
      setSegments([]);
      setSavedPaths(null);
      setError(null);

      // Start recording timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

      // Use whisper.rn's built-in realtime transcription
      // This records audio in correct format (16kHz PCM) and transcribes simultaneously
      console.log("🎤 Starting realtime transcription...");

      await WhisperService.startRealtimeTranscription(
        {
          onSegment: (segment) => {
            console.log("📝 New segment:", segment.text);
            // Add to segments list
            setSegments((prev) => {
              // Check if this segment is already in the list (avoid duplicates)
              if (prev.some(s => s.text === segment.text)) {
                return prev;
              }
              return [...prev, segment];
            });
            // Update transcription text by joining all unique segments
            setTranscriptionText((prev) => {
              // Append new segment text, avoiding duplicates
              if (prev.includes(segment.text)) {
                return prev;
              }
              return (prev + " " + segment.text).trim();
            });
          },
          onProgress: (progressValue) => {
            setProgress(progressValue * 100);
          },
          // Note: onComplete is no longer used since we handle saves manually in stopRecording
          // This prevents automatic saves when whisper.rn hits chunk limits
          onError: (err) => {
            console.error("❌ Realtime transcription error:", err);
            setError(err.message);
          },
        },
        { language: "en" }
      );

      console.log("✅ Recording started - speak now!");
    } catch (err) {
      console.error("❌ Failed to start recording:", err);
      setError(err instanceof Error ? err.message : "Failed to start recording");
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    }
  };

  const stopRecording = async () => {
    try {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }

      console.log("⏹ Stopping realtime transcription...");
      setIsTranscribing(true);

      // Stop realtime transcription and get final result
      const result = await WhisperService.stopRealtimeTranscription();

      console.log("✅ Got result:", result.text.substring(0, 100));

      setIsRecording(false);
      setIsTranscribing(false);

      // Update with final text
      if (result.text) {
        setTranscriptionText(result.text);
        setSegments(result.segments);

        // Save transcription
        const paths = await TranscriptionStorage.saveBoth(result);
        setSavedPaths(paths);

        Alert.alert(
          "Success! 🎉",
          `Transcription complete!\n\n"${result.text.substring(0, 100)}..."`,
          [
            { text: "View History", onPress: () => router.push("/history") },
            { text: "OK" },
          ]
        );
      } else {
        setError("No speech detected. Please try speaking louder or longer.");
      }
    } catch (err) {
      console.error("❌ Failed to stop recording:", err);
      setError(err instanceof Error ? err.message : "Failed to stop recording");
      setIsRecording(false);
      setIsTranscribing(false);
    }
  };

  const transcribeAudio = async (audioUri: string) => {
    try {
      setIsTranscribing(true);
      setProgress(0);
      console.log("🔄 Starting transcription...");

      const result = await WhisperService.transcribe(audioUri, {
        language: "auto",
        onSegment: (segment) => {
          console.log("📝 New segment:", segment.text);
          setSegments((prev) => [...prev, segment]);
          setTranscriptionText((prev) => prev + " " + segment.text);
        },
        onProgress: (progressValue) => {
          setProgress(progressValue * 100);
        },
      });

      console.log("✅ Transcription complete!");

      // Save transcription
      const paths = await TranscriptionStorage.saveBoth(result);
      setSavedPaths(paths);

      Alert.alert(
        "Success! 🎉",
        `Transcription saved:\n\nJSON: ${paths.json.split("/").pop()}\nSRT: ${paths.srt.split("/").pop()}`,
        [
          {
            text: "View History",
            onPress: () => router.push("/history"),
          },
          { text: "OK" },
        ]
      );
    } catch (err) {
      console.error("❌ Transcription failed:", err);
      setError(err instanceof Error ? err.message : "Transcription failed");
      Alert.alert("Error", "Failed to transcribe audio");
    } finally {
      setIsTranscribing(false);
      setProgress(0);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  // Loading state
  if (isInitializing) {
    return (
      <View style={styles.container}>
        <StatusBar style="auto" />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Initializing Whisper AI...</Text>
          {progress > 0 && (
            <>
              <View style={styles.progressBarContainer}>
                <View style={[styles.progressBar, { width: `${progress}%` }]} />
              </View>
              <Text style={styles.progressText}>{Math.round(progress)}%</Text>
            </>
          )}
          {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
      </View>
    );
  }

  // Error state
  if (!isModelLoaded) {
    return (
      <View style={styles.container}>
        <StatusBar style="auto" />
        <View style={styles.centerContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Initialization Failed</Text>
          <Text style={styles.errorText}>{error || "Unknown error"}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={initializeWhisper}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Voice Transcription</Text>
        <TouchableOpacity
          style={styles.historyButton}
          onPress={() => router.push("/history")}
        >
          <Text style={styles.historyButtonText}>📚</Text>
        </TouchableOpacity>
      </View>

      {/* Status Bar */}
      <View style={styles.statusBar}>
        {isRecording && (
          <View style={styles.recordingIndicator}>
            <View style={styles.recordingDot} />
            <Text style={styles.recordingText}>Recording</Text>
          </View>
        )}
        {isTranscribing && (
          <View style={styles.transcribingIndicator}>
            <ActivityIndicator size="small" color="#007AFF" />
            <Text style={styles.transcribingText}>Transcribing...</Text>
          </View>
        )}
        {!isRecording && !isTranscribing && (
          <Text style={styles.readyText}>✅ Ready to record</Text>
        )}
      </View>

      {/* Timer */}
      {(isRecording || isTranscribing) && (
        <View style={styles.timerContainer}>
          <Text style={styles.timerText}>{formatTime(recordingTime)}</Text>
          {isTranscribing && progress > 0 && (
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBar, { width: `${progress}%` }]} />
            </View>
          )}
        </View>
      )}

      {/* Transcription Display */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.transcriptionContainer}
        contentContainerStyle={styles.transcriptionContent}
      >
        {transcriptionText ? (
          <View style={styles.textContainer}>
            <Text style={styles.transcriptionText}>{transcriptionText}</Text>
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🎤</Text>
            <Text style={styles.emptyText}>
              {isRecording
                ? "Speak now... Your words will appear here"
                : "Tap the button below to start recording"}
            </Text>
          </View>
        )}

        {segments.length > 0 && (
          <View style={styles.segmentsContainer}>
            <Text style={styles.segmentsTitle}>Segments ({segments.length})</Text>
            {segments.map((segment, index) => (
              <View key={index} style={styles.segment}>
                <Text style={styles.segmentTime}>
                  {segment.start.toFixed(1)}s - {segment.end.toFixed(1)}s
                </Text>
                <Text style={styles.segmentText}>{segment.text}</Text>
              </View>
            ))}
          </View>
        )}

        {savedPaths && (
          <View style={styles.savedContainer}>
            <Text style={styles.savedTitle}>✅ Saved Successfully</Text>
            <Text style={styles.savedPath}>JSON: {savedPaths.json.split("/").pop()}</Text>
            <Text style={styles.savedPath}>SRT: {savedPaths.srt.split("/").pop()}</Text>

            {/* Action buttons */}
            <View style={styles.actionButtonsRow}>
              <TouchableOpacity
                style={styles.viewButton}
                onPress={() => router.push("/history")}
              >
                <Text style={styles.viewButtonText}>📚 History</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.viewButton, styles.summarizeButton]}
                onPress={() => {
                  // Navigate to summarize with the transcription text
                  router.push({
                    pathname: "/summarize",
                    params: { text: transcriptionText }
                  });
                }}
              >
                <Text style={styles.viewButtonText}>🤖 Summarize</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Record Button */}
      <View style={styles.buttonContainer}>
        {isTranscribing ? (
          <View style={styles.disabledButton}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.buttonText}>Processing...</Text>
          </View>
        ) : (
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <TouchableOpacity
              style={[
                styles.recordButton,
                isRecording && styles.recordButtonActive,
              ]}
              onPress={isRecording ? stopRecording : startRecording}
              activeOpacity={0.8}
            >
              <Text style={styles.recordButtonIcon}>
                {isRecording ? "⏹" : "🎤"}
              </Text>
              <Text style={styles.buttonText}>
                {isRecording ? "Stop Recording" : "Start Recording"}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>⚠️ {error}</Text>
        </View>
      )}

      {/* Debug: Recordings List Toggle */}
      <TouchableOpacity
        style={styles.debugButton}
        onPress={() => {
          setShowRecordings(!showRecordings);
          if (!showRecordings) {
            loadRecordings();
          }
        }}
      >
        <Text style={styles.debugButtonText}>
          {showRecordings ? "Hide Recordings 🔼" : "Show Recordings 🔽"}
        </Text>
      </TouchableOpacity>

      {/* Recordings List */}
      {showRecordings && (
        <View style={styles.recordingsContainer}>
          <View style={styles.recordingsHeader}>
            <Text style={styles.recordingsTitle}>
              📁 Cached Recordings ({recordings.length})
            </Text>
            <TouchableOpacity onPress={loadRecordings}>
              <Text style={styles.refreshButton}>🔄 Refresh</Text>
            </TouchableOpacity>
          </View>

          {recordings.length === 0 ? (
            <Text style={styles.noRecordingsText}>No recordings found</Text>
          ) : (
            <ScrollView style={styles.recordingsList}>
              {recordings.map((recording, index) => (
                <View key={index} style={styles.recordingItem}>
                  <View style={styles.recordingInfo}>
                    <Text style={styles.recordingFilename} numberOfLines={1}>
                      {recording.filename}
                    </Text>
                    <Text style={styles.recordingDetails}>
                      {recording.sizeFormatted} • {recording.extension.toUpperCase()} • {recording.modificationTimeFormatted}
                    </Text>
                  </View>
                  <View style={styles.recordingActions}>
                    <TouchableOpacity
                      style={styles.playButton}
                      onPress={() => playRecording(recording.uri)}
                    >
                      <Text style={styles.actionButtonText}>▶️</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.transcribeButton}
                      onPress={() => transcribeSavedRecording(recording.uri)}
                    >
                      <Text style={styles.actionButtonText}>📝</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    paddingTop: Platform.OS === "ios" ? 60 : 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: "#007AFF",
    fontWeight: "600",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  historyButton: {
    padding: 8,
  },
  historyButtonText: {
    fontSize: 24,
  },
  statusBar: {
    backgroundColor: "#fff",
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  recordingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#FF3B30",
  },
  recordingText: {
    fontSize: 16,
    color: "#FF3B30",
    fontWeight: "600",
  },
  transcribingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  transcribingText: {
    fontSize: 16,
    color: "#007AFF",
    fontWeight: "600",
  },
  readyText: {
    fontSize: 16,
    color: "#34C759",
    fontWeight: "600",
  },
  timerContainer: {
    backgroundColor: "#fff",
    paddingVertical: 16,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  timerText: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#333",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  transcriptionContainer: {
    flex: 1,
  },
  transcriptionContent: {
    padding: 16,
  },
  textContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  transcriptionText: {
    fontSize: 18,
    lineHeight: 28,
    color: "#333",
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    paddingHorizontal: 40,
  },
  segmentsContainer: {
    marginTop: 16,
  },
  segmentsTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
  },
  segment: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#007AFF",
  },
  segmentTime: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  segmentText: {
    fontSize: 15,
    color: "#333",
    lineHeight: 22,
  },
  savedContainer: {
    backgroundColor: "#E8F5E9",
    borderRadius: 12,
    padding: 20,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#4CAF50",
  },
  savedTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2E7D32",
    marginBottom: 12,
  },
  savedPath: {
    fontSize: 14,
    color: "#1B5E20",
    marginBottom: 4,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  viewButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 12,
    alignItems: "center",
  },
  viewButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonContainer: {
    padding: 20,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  recordButton: {
    backgroundColor: "#007AFF",
    borderRadius: 60,
    paddingVertical: 20,
    paddingHorizontal: 40,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  recordButtonActive: {
    backgroundColor: "#FF3B30",
  },
  recordButtonIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  disabledButton: {
    backgroundColor: "#999",
    borderRadius: 60,
    paddingVertical: 20,
    paddingHorizontal: 40,
    alignItems: "center",
  },
  errorBanner: {
    backgroundColor: "#FFEBEE",
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "#EF5350",
  },
  errorBannerText: {
    color: "#C62828",
    fontSize: 14,
    textAlign: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
  },
  progressBarContainer: {
    width: "80%",
    height: 6,
    backgroundColor: "#E0E0E0",
    borderRadius: 3,
    marginTop: 16,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#007AFF",
    borderRadius: 3,
  },
  progressText: {
    marginTop: 8,
    fontSize: 14,
    color: "#666",
    fontWeight: "600",
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
  },
  errorText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  retryButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  // Debug recordings list styles
  debugButton: {
    backgroundColor: "#f0f0f0",
    padding: 12,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#ddd",
  },
  debugButtonText: {
    color: "#666",
    fontSize: 14,
    fontWeight: "600",
  },
  recordingsContainer: {
    backgroundColor: "#fff",
    maxHeight: 300,
    borderTopWidth: 1,
    borderTopColor: "#ddd",
  },
  recordingsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#f5f5f5",
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  recordingsTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  refreshButton: {
    fontSize: 14,
    color: "#007AFF",
  },
  noRecordingsText: {
    padding: 20,
    textAlign: "center",
    color: "#999",
    fontStyle: "italic",
  },
  recordingsList: {
    maxHeight: 200,
  },
  recordingItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  recordingInfo: {
    flex: 1,
  },
  recordingFilename: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  recordingDetails: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  recordingActions: {
    flexDirection: "row",
    gap: 8,
  },
  playButton: {
    backgroundColor: "#E3F2FD",
    padding: 8,
    borderRadius: 8,
  },
  transcribeButton: {
    backgroundColor: "#E8F5E9",
    padding: 8,
    borderRadius: 8,
  },
  actionButtonText: {
    fontSize: 18,
  },
  actionButtonsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
  },
  summarizeButton: {
    backgroundColor: "#667eea",
  },
});
