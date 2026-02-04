import TranscriptionStorage from "@/services/storage/TranscriptionStorage";
import {
    TranscriptionResult
} from "@/services/whisper/types";
import * as FileSystem from "expo-file-system";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Platform,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

export default function ViewTranscriptionScreen() {
  const { filename } = useLocalSearchParams<{ filename: string }>();
  const [transcription, setTranscription] =
    useState<TranscriptionResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<
    "text" | "segments" | "json" | "srt"
  >("text");
  const [jsonContent, setJsonContent] = useState("");
  const [srtContent, setSrtContent] = useState("");

  useEffect(() => {
    loadTranscription();
  }, [filename]);

  const loadTranscription = async () => {
    try {
      setIsLoading(true);
      if (!filename) return;

      const data = await TranscriptionStorage.loadTranscription(filename);
      if (data) {
        setTranscription(data);

        // Load JSON content
        const jsonPath = `${TranscriptionStorage.getTranscriptionsDirectory()}${filename}`;
        const jsonText = await FileSystem.readAsStringAsync(jsonPath);
        setJsonContent(JSON.stringify(JSON.parse(jsonText), null, 2));

        // Load SRT content
        const srtFilename = filename.replace(".json", ".srt");
        const srtPath = `${TranscriptionStorage.getTranscriptionsDirectory()}${srtFilename}`;
        try {
          const srtText = await FileSystem.readAsStringAsync(srtPath);
          setSrtContent(srtText);
        } catch {
          setSrtContent("SRT file not found");
        }
      }
    } catch (error) {
      console.error("Failed to load transcription:", error);
      Alert.alert("Error", "Failed to load transcription");
    } finally {
      setIsLoading(false);
    }
  };

  const shareText = async () => {
    if (!transcription) return;
    try {
      await Share.share({
        message: transcription.text,
        title: "Transcription",
      });
    } catch (error) {
      console.error("Share error:", error);
    }
  };

  const shareJSON = async () => {
    try {
      await Share.share({
        message: jsonContent,
        title: "Transcription JSON",
      });
    } catch (error) {
      console.error("Share error:", error);
    }
  };

  const shareSRT = async () => {
    try {
      await Share.share({
        message: srtContent,
        title: "Transcription SRT",
      });
    } catch (error) {
      console.error("Share error:", error);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(1);
    return `${mins}:${secs.padStart(4, "0")}`;
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  if (!transcription) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Transcription not found</Text>
          <TouchableOpacity style={styles.button} onPress={() => router.back()}>
            <Text style={styles.buttonText}>Go Back</Text>
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
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>View Transcription</Text>
        <TouchableOpacity
          style={styles.shareButton}
          onPress={
            viewMode === "text"
              ? shareText
              : viewMode === "json"
                ? shareJSON
                : viewMode === "srt"
                  ? shareSRT
                  : shareText
          }
        >
          <Text style={styles.shareButtonText}>📤 Share</Text>
        </TouchableOpacity>
      </View>

      {/* Metadata */}
      <View style={styles.metadata}>
        <View style={styles.metadataRow}>
          <Text style={styles.metadataLabel}>Date:</Text>
          <Text style={styles.metadataValue}>
            {new Date(transcription.timestamp || 0).toLocaleString()}
          </Text>
        </View>
        <View style={styles.metadataRow}>
          <Text style={styles.metadataLabel}>Language:</Text>
          <Text style={styles.metadataValue}>
            {transcription.language.toUpperCase()}
          </Text>
        </View>
        <View style={styles.metadataRow}>
          <Text style={styles.metadataLabel}>Duration:</Text>
          <Text style={styles.metadataValue}>
            {(transcription.duration / 1000).toFixed(1)}s
          </Text>
        </View>
        <View style={styles.metadataRow}>
          <Text style={styles.metadataLabel}>Segments:</Text>
          <Text style={styles.metadataValue}>
            {transcription.segments.length}
          </Text>
        </View>
      </View>

      {/* View Mode Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, viewMode === "text" && styles.tabActive]}
          onPress={() => setViewMode("text")}
        >
          <Text
            style={[
              styles.tabText,
              viewMode === "text" && styles.tabTextActive,
            ]}
          >
            Text
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, viewMode === "segments" && styles.tabActive]}
          onPress={() => setViewMode("segments")}
        >
          <Text
            style={[
              styles.tabText,
              viewMode === "segments" && styles.tabTextActive,
            ]}
          >
            Segments
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, viewMode === "json" && styles.tabActive]}
          onPress={() => setViewMode("json")}
        >
          <Text
            style={[
              styles.tabText,
              viewMode === "json" && styles.tabTextActive,
            ]}
          >
            JSON
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, viewMode === "srt" && styles.tabActive]}
          onPress={() => setViewMode("srt")}
        >
          <Text
            style={[styles.tabText, viewMode === "srt" && styles.tabTextActive]}
          >
            SRT
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
      >
        {viewMode === "text" && (
          <View style={styles.textContainer}>
            <Text style={styles.fullText}>{transcription.text}</Text>
          </View>
        )}

        {viewMode === "segments" && (
          <View style={styles.segmentsContainer}>
            {transcription.segments.map((segment, index) => (
              <View key={index} style={styles.segment}>
                <View style={styles.segmentHeader}>
                  <Text style={styles.segmentNumber}>#{index + 1}</Text>
                  <Text style={styles.segmentTime}>
                    {formatTime(segment.start)} → {formatTime(segment.end)}
                  </Text>
                </View>
                <Text style={styles.segmentText}>{segment.text}</Text>
              </View>
            ))}
          </View>
        )}

        {viewMode === "json" && (
          <View style={styles.codeContainer}>
            <ScrollView horizontal>
              <Text style={styles.codeText}>{jsonContent}</Text>
            </ScrollView>
          </View>
        )}

        {viewMode === "srt" && (
          <View style={styles.codeContainer}>
            <Text style={styles.codeText}>{srtContent}</Text>
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
  shareButton: {
    padding: 8,
  },
  shareButtonText: {
    fontSize: 14,
    color: "#007AFF",
    fontWeight: "600",
  },
  metadata: {
    backgroundColor: "#fff",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  metadataRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  metadataLabel: {
    fontSize: 14,
    color: "#666",
    fontWeight: "600",
  },
  metadataValue: {
    fontSize: 14,
    color: "#333",
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomColor: "#007AFF",
  },
  tabText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "600",
  },
  tabTextActive: {
    color: "#007AFF",
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  textContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  fullText: {
    fontSize: 16,
    lineHeight: 26,
    color: "#333",
  },
  segmentsContainer: {
    gap: 12,
  },
  segment: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  segmentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  segmentNumber: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#007AFF",
  },
  segmentTime: {
    fontSize: 12,
    color: "#666",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  segmentText: {
    fontSize: 15,
    lineHeight: 22,
    color: "#333",
  },
  codeContainer: {
    backgroundColor: "#1e1e1e",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  codeText: {
    fontSize: 12,
    lineHeight: 18,
    color: "#d4d4d4",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: "#666",
    marginBottom: 20,
  },
  button: {
    backgroundColor: "#007AFF",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
