import { Ionicons } from "@expo/vector-icons";
import { router, Stack } from "expo-router";
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

import { TechNoir } from "@/constants/DesignSystem";
import TranscriptionStorage, {
    SavedTranscription,
} from "@/services/storage/TranscriptionStorage";

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
        if (!item.textPreview) { // Fallback if textPreview is missing, though type says it's there
             const full = await TranscriptionStorage.loadTranscription(item.filename);
             if (full) {
                 await Share.share({
                  message: full.text,
                  title: `Transcription - ${new Date(item.timestamp).toLocaleDateString()}`,
                 });
                 return;
             }
        }
        // If we have preview or just proceed (loading full if needed)
        // Ideally we load full text to share
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
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={24} color={TechNoir.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>HISTORY</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            tintColor={TechNoir.colors.textPrimary} 
          />
        }
      >
        {isLoading && transcriptions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.loadingText}>LOADING INTELLIGENCE...</Text>
          </View>
        ) : transcriptions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={64} color={TechNoir.colors.textSecondary} style={styles.emptyIcon} />
            <Text style={styles.emptyTitle}>NO DATA</Text>
            <Text style={styles.emptyDescription}>
              Record your first log to populate the archives
            </Text>
            <TouchableOpacity
              style={styles.ctaButton}
              onPress={() => router.push("/transcribe")}
            >
              <Text style={styles.ctaButtonText}>INITIATE RECORDING</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.statsContainer}>
                <View style={[styles.statBox, { marginRight: 8 }]}>
                    <Text style={styles.statNumber}>{transcriptions.length}</Text>
                    <Text style={styles.statLabel}>ENTRIES</Text>
                </View>
                 <View style={[styles.statBox, { marginLeft: 8 }]}>
                    <Text style={styles.statNumber}>
                      {transcriptions
                        .reduce((sum, t) => sum + (t.textPreview?.length || 0), 0)
                        .toLocaleString()}
                    </Text>
                    <Text style={styles.statLabel}>TOKENS</Text>
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
                    <Text style={styles.cardDate}>
                        {formatDate(item.timestamp).toUpperCase()}
                    </Text>
                    <View style={styles.cardBadges}>
                         <View style={styles.badge}>
                            <Text style={styles.badgeText}>{formatDuration(item.duration)}</Text>
                         </View>
                    </View>
                  </View>

                  <Text style={styles.cardText} numberOfLines={2}>
                    {item.textPreview || "No preview available"}
                  </Text>
                </TouchableOpacity>

                <View style={styles.cardActions}>
                   <TouchableOpacity 
                        style={styles.actionButton} 
                        onPress={() => shareTranscription(item)}
                    >
                        <Ionicons name="share-outline" size={18} color={TechNoir.colors.textSecondary} />
                   </TouchableOpacity>
                   <TouchableOpacity 
                        style={styles.actionButton} 
                        onPress={() => deleteTranscription(item)}
                    >
                        <Ionicons name="trash-outline" size={18} color={TechNoir.colors.textSecondary} />
                   </TouchableOpacity>
                     <TouchableOpacity 
                        style={styles.viewButton} 
                        onPress={() => viewTranscription(item)}
                    >
                        <Text style={styles.viewButtonText}>ACCESS</Text>
                        <Ionicons name="arrow-forward" size={14} color={TechNoir.colors.background} />
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
    backgroundColor: TechNoir.colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "android" ? 50 : 60,
    paddingBottom: 20,
    backgroundColor: TechNoir.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: TechNoir.colors.border,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: TechNoir.colors.textPrimary,
    letterSpacing: 2,
    marginTop: 4,
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  statsContainer: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  statBox: {
    flex: 1,
    backgroundColor: TechNoir.colors.surface,
    padding: 16,
    borderRadius: TechNoir.borderRadius.s,
    borderWidth: 1,
    borderColor: TechNoir.colors.border,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: TechNoir.colors.textPrimary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 10,
    color: TechNoir.colors.textSecondary,
    letterSpacing: 1.5,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 100,
  },
  loadingText: {
    color: TechNoir.colors.textSecondary,
    fontSize: 12,
    letterSpacing: 1.5,
  },
  emptyIcon: {
    marginBottom: 20,
    opacity: 0.5,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: TechNoir.colors.textPrimary,
    marginBottom: 8,
    letterSpacing: 1,
  },
  emptyDescription: {
    fontSize: 14,
    color: TechNoir.colors.textSecondary,
    textAlign: "center",
    marginBottom: 30,
    maxWidth: 250,
  },
  ctaButton: {
    backgroundColor: TechNoir.colors.textPrimary,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: TechNoir.borderRadius.s,
  },
  ctaButtonText: {
    color: TechNoir.colors.background,
    fontSize: 14,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  card: {
    backgroundColor: TechNoir.colors.surface,
    borderRadius: TechNoir.borderRadius.s,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: TechNoir.colors.border,
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
  cardDate: {
    fontSize: 12,
    color: TechNoir.colors.textSecondary,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  cardBadges: {
    flexDirection: "row",
    gap: 8,
  },
  badge: {
    backgroundColor: TechNoir.colors.surfaceHighlight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 2,
  },
  badgeText: {
    fontSize: 10,
    color: TechNoir.colors.textPrimary,
    fontWeight: "600",
  },
  cardText: {
    fontSize: 15,
    lineHeight: 22,
    color: TechNoir.colors.textPrimary,
    opacity: 0.9,
  },
  cardActions: {
    flexDirection: "row",
    alignItems: 'center',
    padding: 12,
    paddingTop: 0,
    justifyContent: 'flex-end',
    gap: 16,
  },
  actionButton: {
    padding: 8,
  },
  viewButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: TechNoir.colors.textPrimary,
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 2,
      gap: 4,
      marginLeft: 8,
  },
  viewButtonText: {
      color: TechNoir.colors.background,
      fontSize: 10,
      fontWeight: "bold",
      letterSpacing: 1,
  }
});
