import TranscriptionStorage, {
    SavedTranscription,
} from "@/services/storage/TranscriptionStorage";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import {
    Alert,
    Platform,
    RefreshControl,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

export default function TranscriptionHistoryScreen() {
  const [transcriptions, setTranscriptions] = useState<SavedTranscription[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadTranscriptions();
  }, []);

  const loadTranscriptions = async () => {
    try {
      setIsLoading(true);
      const list = await TranscriptionStorage.listTranscriptions();
      setTranscriptions(list);
    } catch (error) {
      console.error("Failed to load transcriptions:", error);
      Alert.alert("Error", "Failed to load transcriptions");
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadTranscriptions();
  };

  const viewTranscription = (item: SavedTranscription) => {
    router.push({
      pathname: "/view-transcription",
      params: { filename: item.filename },
    });
  };

  const deleteTranscription = (item: SavedTranscription) => {
    Alert.alert(
      "Delete Transcription",
      "Are you sure you want to delete this transcription?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await TranscriptionStorage.deleteTranscription(item.filename);
              loadTranscriptions();
            } catch (error) {
              Alert.alert("Error", "Failed to delete transcription");
            }
          },
        },
      ],
    );
  };

  const shareTranscription = async (item: SavedTranscription) => {
    try {
      const transcription = await TranscriptionStorage.loadTranscription(
        item.filename,
      );
      if (transcription) {
        await Share.share({
          message: transcription.text,
          title: `Transcription - ${new Date(item.timestamp).toLocaleDateString()}`,
        });
      }
    } catch (error) {
      Alert.alert("Error", "Failed to share transcription");
    }
  };

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, "0")}`;
  };

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
        <Text style={styles.title}>Transcription History</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {isLoading && transcriptions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Loading...</Text>
          </View>
        ) : transcriptions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📝</Text>
            <Text style={styles.emptyTitle}>No Transcriptions Yet</Text>
            <Text style={styles.emptyText}>
              Record your first audio to see it here
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => router.push("/transcribe")}
            >
              <Text style={styles.emptyButtonText}>Start Recording</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.statsContainer}>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{transcriptions.length}</Text>
                <Text style={styles.statLabel}>Total</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>
                  {transcriptions
                    .reduce((sum, t) => sum + t.textPreview.length, 0)
                    .toLocaleString()}
                </Text>
                <Text style={styles.statLabel}>Characters</Text>
              </View>
            </View>

            {transcriptions.map((item, index) => (
              <View key={item.id} style={styles.card}>
                <TouchableOpacity
                  style={styles.cardContent}
                  onPress={() => viewTranscription(item)}
                  activeOpacity={0.7}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.cardHeaderLeft}>
                      <Text style={styles.cardDate}>
                        {formatDate(item.timestamp)}
                      </Text>
                      <View style={styles.cardBadges}>
                        <View style={styles.badge}>
                          <Text style={styles.badgeText}>
                            {item.language.toUpperCase()}
                          </Text>
                        </View>
                        <View style={styles.badge}>
                          <Text style={styles.badgeText}>
                            {formatDuration(item.duration)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  <Text style={styles.cardText} numberOfLines={3}>
                    {item.textPreview}
                  </Text>

                  <View style={styles.cardFooter}>
                    <Text style={styles.cardLength}>
                      {item.textPreview.length} characters
                    </Text>
                  </View>
                </TouchableOpacity>

                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => viewTranscription(item)}
                  >
                    <Text style={styles.actionButtonText}>👁 View</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => shareTranscription(item)}
                  >
                    <Text style={styles.actionButtonText}>📤 Share</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => deleteTranscription(item)}
                  >
                    <Text
                      style={[styles.actionButtonText, styles.deleteButtonText]}
                    >
                      🗑 Delete
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </>
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
  placeholder: {
    width: 60,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  statsContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  statBox: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#007AFF",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: "#666",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: "hidden",
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flex: 1,
  },
  cardDate: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  cardBadges: {
    flexDirection: "row",
    gap: 8,
  },
  badge: {
    backgroundColor: "#e3f2fd",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 12,
    color: "#1976d2",
    fontWeight: "600",
  },
  cardText: {
    fontSize: 16,
    lineHeight: 24,
    color: "#333",
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardLength: {
    fontSize: 12,
    color: "#999",
  },
  cardActions: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRightWidth: 1,
    borderRightColor: "#f0f0f0",
  },
  deleteButton: {
    borderRightWidth: 0,
  },
  actionButtonText: {
    fontSize: 14,
    color: "#007AFF",
    fontWeight: "600",
  },
  deleteButtonText: {
    color: "#FF3B30",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
