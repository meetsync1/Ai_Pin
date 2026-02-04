import { DEFAULT_WHISPER_MODEL } from "@/constants/whisper";
import ModelStorage from "@/services/storage/ModelStorage";
import TranscriptionStorage from "@/services/storage/TranscriptionStorage";
import type { TranscriptionSegment } from "@/services/whisper/types";
import WhisperService from "@/services/whisper/WhisperService";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
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

  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioUriRef = useRef<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

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

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const startRecording = async () => {
    try {
      setError(null);
      setTranscriptionText("");
      setSegments([]);
      setSavedPaths(null);
      setRecordingTime(0);
      audioUriRef.current = null;

      await WhisperService.startRecording();
      setIsRecording(true);

      // Start timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

      console.log("🎤 Recording started");
    } catch (err) {
      console.error("❌ Failed to start recording:", err);
      setError(
        err instanceof Error ? err.message : "Failed to start recording",
      );
    }
  };

  const stopRecording = async () => {
    try {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }

      const audioUri = await WhisperService.stopRecording();
      audioUriRef.current = audioUri;
      setIsRecording(false);

      console.log("✅ Recording stopped:", audioUri);

      // Start transcription
      await transcribeAudio(audioUri);
    } catch (err) {
      console.error("❌ Failed to stop recording:", err);
      setError(err instanceof Error ? err.message : "Failed to stop recording");
      setIsRecording(false);
    }
  };

  const transcribeAudio = async (audioUri: string) => {
    try {
      setIsTranscribing(true);
      setError(null);
      setProgress(0);
      setTranscriptionText("");
      setSegments([]);

      console.log("🎯 Starting transcription...");

      const result = await WhisperService.transcribe(
        audioUri,
        { language: "auto", realtime: true },
        {
          onSegment: (segment) => {
            console.log("📝 New segment:", segment.text);
            setSegments((prev) => [...prev, segment]);
            setTranscriptionText((prev) => {
              const newText = prev ? `${prev} ${segment.text}` : segment.text;
              return newText.trim();
            });
          },
          onProgress: (prog) => {
            setProgress(prog * 100);
          },
          onComplete: async (finalResult) => {
            console.log("✅ Transcription complete!");
            console.log("Full text:", finalResult.text);

            // Save both JSON and SRT
            try {
              const paths = await TranscriptionStorage.saveBoth(finalResult);
              setSavedPaths(paths);
              console.log("💾 Saved to:", paths);
            } catch (saveErr) {
              console.error("Failed to save transcription:", saveErr);
            }
          },
          onError: (err) => {
            console.error("❌ Transcription error:", err);
            setError(err.message);
          },
        },
      );

      console.log("📄 Final transcription:", result.text);
    } catch (err) {
      console.error("❌ Transcription failed:", err);
      setError(err instanceof Error ? err.message : "Transcription failed");
    } finally {
      setIsTranscribing(false);
      setProgress(0);
    }
  };

  const cancelRecording = async () => {
    try {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }

      await WhisperService.cancelRecording();
      setIsRecording(false);
      setRecordingTime(0);
      console.log("🚫 Recording cancelled");
    } catch (err) {
      console.error("❌ Failed to cancel recording:", err);
    }
  };

  const clearTranscription = () => {
    setTranscriptionText("");
    setSegments([]);
    setSavedPaths(null);
    setError(null);
    audioUriRef.current = null;
  };

  const viewSavedFiles = () => {
    if (savedPaths) {
      Alert.alert(
        "Files Saved",
        `JSON: ${savedPaths.json}\n\nSRT: ${savedPaths.srt}`,
        [{ text: "OK" }],
      );
    }
  };

  if (isInitializing) {
    return (
      <View style={styles.container}>
        <StatusBar style="auto" />
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Initializing Whisper...</Text>
          {progress > 0 && (
            <>
              <View style={styles.progressBar}>
                <View
                  style={[styles.progressFill, { width: `${progress}%` }]}
                />
              </View>
              <Text style={styles.progressText}>{Math.round(progress)}%</Text>
            </>
          )}
          {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
      </View>
    );
  }

  if (!isModelLoaded) {
    return (
      <View style={styles.container}>
        <StatusBar style="auto" />
        <View style={styles.centerContent}>
          <Text style={styles.errorTitle}>❌ Whisper Not Ready</Text>
          <Text style={styles.errorText}>
            {error || "Failed to load Whisper model"}
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={initializeWhisper}
          >
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
        <Text style={styles.title}>🎤 Voice Transcription</Text>
        <Text style={styles.subtitle}>Powered by Whisper Base (on-device)</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
      >
        {/* Recording Controls */}
        <View style={styles.controlsSection}>
          {!isRecording && !isTranscribing && !transcriptionText && (
            <TouchableOpacity
              style={[styles.recordButton, styles.recordButtonStart]}
              onPress={startRecording}
            >
              <Text style={styles.recordButtonIcon}>⏺</Text>
              <Text style={styles.recordButtonText}>Start Recording</Text>
            </TouchableOpacity>
          )}

          {isRecording && (
            <View style={styles.recordingContainer}>
              <View style={styles.recordingIndicator}>
                <View style={styles.recordingDot} />
                <Text style={styles.recordingText}>Recording...</Text>
              </View>
              <Text style={styles.timerText}>{formatTime(recordingTime)}</Text>
              <View style={styles.recordingButtons}>
                <TouchableOpacity
                  style={[styles.recordButton, styles.recordButtonStop]}
                  onPress={stopRecording}
                >
                  <Text style={styles.recordButtonIcon}>⏹</Text>
                  <Text style={styles.recordButtonText}>Stop</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.recordButton, styles.recordButtonCancel]}
                  onPress={cancelRecording}
                >
                  <Text style={styles.recordButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {isTranscribing && (
            <View style={styles.transcribingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.transcribingText}>Transcribing...</Text>
              <View style={styles.progressBar}>
                <View
                  style={[styles.progressFill, { width: `${progress}%` }]}
                />
              </View>
              <Text style={styles.progressText}>{Math.round(progress)}%</Text>
            </View>
          )}
        </View>

        {/* Error Display */}
        {error && !isTranscribing && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>❌ {error}</Text>
          </View>
        )}

        {/* Transcription Display */}
        {transcriptionText && (
          <View style={styles.transcriptionSection}>
            <View style={styles.transcriptionHeader}>
              <Text style={styles.transcriptionTitle}>📝 Transcription</Text>
              <View style={styles.buttonRow}>
                {!isTranscribing && (
                  <TouchableOpacity
                    style={styles.smallButton}
                    onPress={clearTranscription}
                  >
                    <Text style={styles.smallButtonText}>Clear</Text>
                  </TouchableOpacity>
                )}
                {savedPaths && (
                  <TouchableOpacity
                    style={[styles.smallButton, styles.successButton]}
                    onPress={viewSavedFiles}
                  >
                    <Text style={styles.smallButtonText}>✓ Saved</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <ScrollView
              ref={scrollViewRef}
              style={styles.transcriptionScroll}
              nestedScrollEnabled={true}
            >
              <Text style={styles.transcriptionText}>{transcriptionText}</Text>
            </ScrollView>

            {/* Segments */}
            {segments.length > 0 && (
              <View style={styles.segmentsSection}>
                <Text style={styles.segmentsTitle}>
                  Segments ({segments.length})
                </Text>
                {segments.map((segment, index) => (
                  <View key={index} style={styles.segmentItem}>
                    <Text style={styles.segmentTime}>
                      {segment.start.toFixed(1)}s - {segment.end.toFixed(1)}s
                    </Text>
                    <Text style={styles.segmentText}>{segment.text}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Action Buttons */}
            {!isTranscribing && transcriptionText && (
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.primaryButton]}
                  onPress={startRecording}
                >
                  <Text style={styles.actionButtonText}>New Recording</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Info Section */}
        {!isRecording && !isTranscribing && !transcriptionText && (
          <View style={styles.infoSection}>
            <Text style={styles.infoTitle}>✨ Features</Text>
            <Text style={styles.infoText}>
              • Real-time transcription as you speak
            </Text>
            <Text style={styles.infoText}>• Automatic language detection</Text>
            <Text style={styles.infoText}>• Save as JSON and SRT formats</Text>
            <Text style={styles.infoText}>• Timestamped segments</Text>
            <Text style={styles.infoText}>• 100% offline processing</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    padding: 20,
    paddingTop: Platform.OS === "ios" ? 60 : 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
  },
  controlsSection: {
    marginBottom: 20,
  },
  recordButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  recordButtonStart: {
    backgroundColor: "#007AFF",
  },
  recordButtonStop: {
    backgroundColor: "#FF3B30",
    flex: 1,
    marginRight: 8,
  },
  recordButtonCancel: {
    backgroundColor: "#8E8E93",
    flex: 1,
    marginLeft: 8,
  },
  recordButtonIcon: {
    fontSize: 24,
    color: "#fff",
  },
  recordButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  recordingContainer: {
    alignItems: "center",
  },
  recordingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#FF3B30",
    marginRight: 8,
  },
  recordingText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FF3B30",
  },
  timerText: {
    fontSize: 48,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 20,
    fontVariant: ["tabular-nums"],
  },
  recordingButtons: {
    flexDirection: "row",
    width: "100%",
  },
  transcribingContainer: {
    alignItems: "center",
    padding: 20,
  },
  transcribingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
    marginBottom: 16,
  },
  progressBar: {
    width: "100%",
    height: 8,
    backgroundColor: "#e0e0e0",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#007AFF",
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: "#666",
  },
  errorContainer: {
    backgroundColor: "#FFE5E5",
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  errorText: {
    color: "#D32F2F",
    fontSize: 14,
    textAlign: "center",
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#D32F2F",
    marginBottom: 12,
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: "#007AFF",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  transcriptionSection: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  transcriptionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  transcriptionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 8,
  },
  smallButton: {
    backgroundColor: "#8E8E93",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  successButton: {
    backgroundColor: "#34C759",
  },
  smallButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  transcriptionScroll: {
    maxHeight: 200,
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    padding: 12,
  },
  transcriptionText: {
    fontSize: 16,
    lineHeight: 24,
    color: "#333",
  },
  segmentsSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  segmentsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginBottom: 8,
  },
  segmentItem: {
    marginBottom: 8,
    paddingLeft: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#007AFF",
  },
  segmentTime: {
    fontSize: 12,
    color: "#999",
    marginBottom: 2,
  },
  segmentText: {
    fontSize: 14,
    color: "#333",
  },
  actionButtons: {
    marginTop: 16,
  },
  actionButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
  },
  primaryButton: {
    backgroundColor: "#007AFF",
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  infoSection: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
    lineHeight: 20,
  },
});
