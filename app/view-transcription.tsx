import { TechNoir } from "@/constants/DesignSystem";
import TranscriptionStorage from "@/services/storage/TranscriptionStorage";
import {
    TranscriptionResult
} from "@/services/whisper/types";
import { Ionicons } from "@expo/vector-icons";
import { readAsStringAsync } from "expo-file-system/legacy";
import { router, Stack, useLocalSearchParams } from "expo-router";
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
        const jsonText = await readAsStringAsync(jsonPath);
        setJsonContent(JSON.stringify(JSON.parse(jsonText), null, 2));

        // Load SRT content
        const srtFilename = filename.replace(".json", ".srt");
        const srtPath = `${TranscriptionStorage.getTranscriptionsDirectory()}${srtFilename}`;
        try {
          const srtText = await readAsStringAsync(srtPath);
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
          <ActivityIndicator size="large" color={TechNoir.colors.tint} />
          <Text style={styles.loadingText}>DECRYPTING...</Text>
        </View>
      </View>
    );
  }

  if (!transcription) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={TechNoir.colors.textSecondary} />
          <Text style={styles.errorText}>LOG NOT FOUND</Text>
          <TouchableOpacity style={styles.button} onPress={() => router.back()}>
            <Text style={styles.buttonText}>RETURN</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={TechNoir.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>TRANSCRIPTION LOG</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.actionIconButton}
            onPress={() => {
              router.push({
                pathname: "/summarize",
                params: { text: transcription.text }
              });
            }}
          >
            <Ionicons name="analytics-outline" size={20} color={TechNoir.colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionIconButton}
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
            <Ionicons name="share-outline" size={20} color={TechNoir.colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Metadata */}
      <View style={styles.metadata}>
        <View style={styles.metadataCol}>
           <Text style={styles.metadataLabel}>DATE</Text>
           <Text style={styles.metadataValue}>{new Date(transcription.timestamp || 0).toLocaleDateString()}</Text>
        </View>
        <View style={styles.metadataDivider} />
        <View style={styles.metadataCol}>
           <Text style={styles.metadataLabel}>TIME</Text>
           <Text style={styles.metadataValue}>{(transcription.duration / 1000).toFixed(1)}s</Text>
        </View>
        <View style={styles.metadataDivider} />
        <View style={styles.metadataCol}>
           <Text style={styles.metadataLabel}>SEGMENTS</Text>
           <Text style={styles.metadataValue}>{transcription.segments.length}</Text>
        </View>
      </View>

      {/* View Mode Tabs */}
      <View style={styles.tabsContainer}>
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, viewMode === "text" && styles.tabActive]}
              onPress={() => setViewMode("text")}
            >
              <Text style={[styles.tabText, viewMode === "text" && styles.tabTextActive]}>TEXT</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, viewMode === "segments" && styles.tabActive]}
              onPress={() => setViewMode("segments")}
            >
              <Text style={[styles.tabText, viewMode === "segments" && styles.tabTextActive]}>SEGMENTS</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, viewMode === "json" && styles.tabActive]}
              onPress={() => setViewMode("json")}
            >
              <Text style={[styles.tabText, viewMode === "json" && styles.tabTextActive]}>JSON</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, viewMode === "srt" && styles.tabActive]}
              onPress={() => setViewMode("srt")}
            >
              <Text style={[styles.tabText, viewMode === "srt" && styles.tabTextActive]}>SRT</Text>
            </TouchableOpacity>
          </View>
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
                  <Text style={styles.segmentNumber}>{String(index + 1).padStart(2, '0')}</Text>
                  <Text style={styles.segmentTime}>
                    {formatTime(segment.start)} - {formatTime(segment.end)}
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
             <ScrollView horizontal>
                <Text style={styles.codeText}>{srtContent}</Text>
             </ScrollView>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: TechNoir.colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "android" ? 50 : 60,
    paddingBottom: 16,
    backgroundColor: TechNoir.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: TechNoir.colors.border,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: "bold",
    color: TechNoir.colors.textPrimary,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionIconButton: {
      padding: 8,
      backgroundColor: TechNoir.colors.surfaceHighlight,
      borderRadius: 4,
  },
  metadata: {
    backgroundColor: TechNoir.colors.surface,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: TechNoir.colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metadataCol: {
      alignItems: 'center',
  },
  metadataLabel: {
    fontSize: 10,
    color: TechNoir.colors.textSecondary,
    fontWeight: "600",
    letterSpacing: 1,
    marginBottom: 4,
  },
  metadataValue: {
    fontSize: 14,
    color: TechNoir.colors.textPrimary,
    fontWeight: 'bold',
  },
  metadataDivider: {
      width: 1,
      backgroundColor: TechNoir.colors.border,
      height: '100%',
  },
  tabsContainer: {
     padding: 16,
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: TechNoir.colors.surface,
    borderRadius: 8,
    padding: 4,
    borderWidth: 1,
    borderColor: TechNoir.colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 6,
  },
  tabActive: {
    backgroundColor: TechNoir.colors.surfaceHighlight,
  },
  tabText: {
    fontSize: 12,
    color: TechNoir.colors.textSecondary,
    fontWeight: "600",
  },
  tabTextActive: {
    color: TechNoir.colors.textPrimary,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  textContainer: {
    padding: 16,
  },
  fullText: {
    fontSize: 16,
    lineHeight: 28,
    color: TechNoir.colors.textPrimary,
    fontFamily: TechNoir.typography.fontFamily.regular,
  },
  segmentsContainer: {
    gap: 12,
  },
  segment: {
    backgroundColor: TechNoir.colors.surface,
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: TechNoir.colors.border,
  },
  segmentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: TechNoir.colors.surfaceHighlight,
    paddingBottom: 8,
  },
  segmentNumber: {
    fontSize: 12,
    fontWeight: "bold",
    color: TechNoir.colors.textSecondary,
  },
  segmentTime: {
    fontSize: 12,
    color: TechNoir.colors.textSecondary,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  segmentText: {
    fontSize: 15,
    lineHeight: 22,
    color: TechNoir.colors.textPrimary,
  },
  codeContainer: {
    backgroundColor: '#000',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: TechNoir.colors.border,
  },
  codeText: {
    fontSize: 12,
    lineHeight: 18,
    color: "#0f0", // Matrix style for code
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: TechNoir.colors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 12,
    color: TechNoir.colors.textSecondary,
    letterSpacing: 2,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: TechNoir.colors.textSecondary,
    marginBottom: 20,
    marginTop: 16,
    letterSpacing: 1,
  },
  button: {
    backgroundColor: TechNoir.colors.textPrimary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 4,
  },
  buttonText: {
    color: TechNoir.colors.background,
    fontSize: 14,
    fontWeight: "bold",
    letterSpacing: 1,
  },
});
