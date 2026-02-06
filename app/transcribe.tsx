import { Button } from "@/components/Button";
import { ThemedText } from "@/components/themed-text";
import { TechNoir } from "@/constants/DesignSystem";
import { DEFAULT_WHISPER_MODEL } from "@/constants/whisper";
import ModelStorage from "@/services/storage/ModelStorage";
import RecordingStorage, { RecordingInfo } from "@/services/storage/RecordingStorage";
import TranscriptionStorage from "@/services/storage/TranscriptionStorage";
import type { TranscriptionSegment } from "@/services/whisper/types";
import WhisperService from "@/services/whisper/WhisperService";
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
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

  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
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
          setTranscriptionText((prev) => {
            const newSegment = segment.text.trim();
            if (!newSegment) return prev;
            return prev ? `${prev} ${newSegment}` : newSegment;
          });
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
        <StatusBar style="light" />
        <View style={styles.centerContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <ThemedText type="subtitle" style={{color: 'white', marginBottom: 8}}>Initialization Failed</ThemedText>
          <ThemedText style={{color: '#999', marginBottom: 24}}>{error || "Unknown error"}</ThemedText>
          <Button title="Retry Initialization" onPress={initializeWhisper} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <ThemedText type="subtitle">TRANSCRIPTION</ThemedText>
        <TouchableOpacity
          style={styles.historyButton}
          onPress={() => router.push("/history")}
        >
          <Ionicons name="time-outline" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Timer & Status */}
      <View style={styles.statusSection}>
         {/* Timer Display */}
        <Text style={styles.timerText}>{formatTime(recordingTime)}</Text>
        
        {/* Status Badge */}
        <View style={styles.statusBadge}>
            {isRecording ? (
                <>
                    <View style={styles.recordingDot} />
                    <Text style={styles.statusText}>RECORDING</Text>
                </>
            ) : isTranscribing ? (
                <>
                    <ActivityIndicator size="small" color={TechNoir.colors.tint} />
                    <Text style={styles.statusText}>PROCESSING</Text>
                </>
            ) : (
                <Text style={[styles.statusText, { color: '#888' }]}>READY</Text>
            )}
        </View>

        {/* Progress Bar for Loading/Processing */}
        {(isInitializing || (isTranscribing && progress > 0)) && (
            <View style={styles.progressBarContainer}>
                <View style={[styles.progressBar, { width: `${progress}%` }]} />
            </View>
        )}
      </View>

      {/* Transcription Display */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.transcriptionContainer}
        contentContainerStyle={styles.transcriptionContent}
      >
        {transcriptionText ? (
            <ThemedText style={styles.transcriptionText}>{transcriptionText}</ThemedText>
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="mic-outline" size={64} color="#333" />
            <ThemedText style={styles.emptyText}>
              {isRecording
                ? "Listening..."
                : "Tap to record"}
            </ThemedText>
          </View>
        )}
      </ScrollView>

      {/* Record & Action Buttons Area */}
      <View style={styles.buttonContainer}>
        {isTranscribing ? (
           <Button title="Processing..." onPress={() => {}} variant="ghost" icon={<ActivityIndicator color="white" />} />
        ) : (
          <View style={{ width: '100%', gap: 16 }}>
             {/* Summarize Button - Only show if we have text and aren't recording */}
             {transcriptionText.length > 0 && !isRecording && (
                <Button 
                    title="SUMMARIZE" 
                    onPress={() => router.push({ pathname: "/summarize", params: { text: transcriptionText } })}
                    variant="secondary"
                    icon={<Ionicons name="sparkles" size={20} color={TechNoir.colors.textPrimary} style={{marginRight: 8}}/>}
                />
             )}
          
             <Animated.View style={{ transform: [{ scale: pulseAnim }], width: '100%' }}>
                <Button 
                    title={isRecording ? "STOP RECORDING" : (transcriptionText.length > 0 ? "NEW RECORDING" : "START RECORDING")}
                    onPress={isRecording ? stopRecording : startRecording}
                    variant={isRecording ? "secondary" : "primary"}
                    style={isRecording ? { borderColor: TechNoir.colors.error } : {}}
                    textStyle={isRecording ? { color: TechNoir.colors.error } : {}}
                    icon={<Ionicons name={isRecording ? "stop" : "mic"} size={20} color={isRecording ? TechNoir.colors.error : (transcriptionText.length > 0 ? TechNoir.colors.background : TechNoir.colors.background)} style={{marginRight: 8}}/>}
                />
             </Animated.View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: TechNoir.colors.background,
    paddingTop: Platform.OS === "ios" ? 0 : 0,
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
    padding: 20,
    paddingTop: 60,
    backgroundColor: TechNoir.colors.background,
  },
  backButton: {
    padding: 8,
  },
  historyButton: {
    padding: 8,
  },
  statusSection: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  timerText: {
    fontSize: 64,
    fontWeight: "200", // Ultra light/thin
    color: "#fff",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    letterSpacing: -2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#222',
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: TechNoir.colors.error,
    marginRight: 8,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
  },
  transcriptionContainer: {
    flex: 1,
    marginTop: 20,
  },
  segmentText: {
    fontSize: 18,
    lineHeight: 28,
    color: "#fff",
    fontWeight: '300',
  },
  segmentTime: {
      fontSize: 10,
      color: TechNoir.colors.textSecondary,
      marginTop: 4,
      fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  transcriptionContent: {
    padding: 24,
    paddingBottom: 200,
  },
  transcriptionText: {
    fontSize: 24,
    lineHeight: 36,
    color: "#fff",
    fontWeight: '300',
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 60,
    opacity: 0.5,
  },
  emptyText: {
    fontSize: 18,
    color: "#666",
    marginTop: 16,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
  },
  // ... Keep debug styles minimal or remove if not needed for user
  debugButton: { 
      padding: 10, 
      alignItems: 'center', 
      backgroundColor: '#111',
      marginTop: 10
  },
  debugButtonText: { color: TechNoir.colors.textSecondary },
  // Restored Styles
  buttonText: {
    color: TechNoir.colors.textPrimary,
    fontSize: 18,
    fontWeight: "bold",
    fontFamily: TechNoir.typography.fontFamily.bold,
  },
  disabledButton: {
    backgroundColor: TechNoir.colors.surfaceHighlight,
    borderRadius: TechNoir.borderRadius.xl,
    paddingVertical: 20,
    paddingHorizontal: 40,
    alignItems: "center",
    opacity: 0.5,
  },
  errorBanner: {
    backgroundColor: TechNoir.colors.error + '20', // 20% opacity
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: TechNoir.colors.error,
  },
  errorBannerText: {
    color: TechNoir.colors.error,
    fontSize: 14,
    textAlign: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: TechNoir.colors.textSecondary,
  },
  progressBarContainer: {
    width: "80%",
    height: 6,
    backgroundColor: TechNoir.colors.surfaceHighlight,
    borderRadius: 3,
    marginTop: 16,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: TechNoir.colors.tint,
    borderRadius: 3,
  },
  progressText: {
    marginTop: 8,
    fontSize: 14,
    color: TechNoir.colors.textSecondary,
    fontWeight: "600",
  },
  errorIcon: {
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: TechNoir.colors.textPrimary,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 16,
    color: TechNoir.colors.textSecondary,
    textAlign: "center",
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  retryButton: {
    backgroundColor: TechNoir.colors.tint,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  retryButtonText: {
    color: TechNoir.colors.background,
    fontSize: 16,
    fontWeight: "600",
  },
  recordingsContainer: {
    backgroundColor: TechNoir.colors.surface,
    maxHeight: 300,
    borderTopWidth: 1,
    borderTopColor: TechNoir.colors.border,
  },
  recordingsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    backgroundColor: TechNoir.colors.surfaceHighlight,
    borderBottomWidth: 1,
    borderBottomColor: TechNoir.colors.border,
  },
  recordingsTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: TechNoir.colors.textPrimary,
  },
  refreshButton: {
    fontSize: 14,
    color: TechNoir.colors.tint,
  },
  noRecordingsText: {
    padding: 20,
    textAlign: "center",
    color: TechNoir.colors.textSecondary,
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
    borderBottomColor: TechNoir.colors.border,
  },
  recordingInfo: {
    flex: 1,
  },
  recordingFilename: {
    fontSize: 14,
    fontWeight: "600",
    color: TechNoir.colors.textPrimary,
  },
  recordingDetails: {
    fontSize: 12,
    color: TechNoir.colors.textSecondary,
    marginTop: 2,
  },
  recordingActions: {
    flexDirection: "row",
    gap: 8,
  },
  playButton: {
    backgroundColor: TechNoir.colors.surfaceHighlight,
    padding: 8,
    borderRadius: 8,
  },
  transcribeButton: {
    backgroundColor: TechNoir.colors.surfaceHighlight,
    padding: 8,
    borderRadius: 8,
  },
  actionButtonText: {
    fontSize: 18,
    color: TechNoir.colors.textPrimary,
  },
  actionButtonsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
  },
  summarizeButton: {
    backgroundColor: TechNoir.colors.surfaceHighlight,
  },

});
