import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { Audio } from "expo-av";
import React, { useCallback, useState } from "react";
import {
    Alert,
    FlatList,
    Pressable,
    StyleSheet,
    Text,
    useColorScheme,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RecordingCard } from "../components/RecordingCard";
import { fileStorageService } from "../services/fileStorage";
import { RecordingMetadata } from "../types";

export const LibraryScreen: React.FC = () => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const insets = useSafeAreaInsets();

  const [recordings, setRecordings] = useState<RecordingMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const soundRef = React.useRef<Audio.Sound | null>(null);

  const loadRecordings = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await fileStorageService.getRecordings();
      setRecordings(data);
    } catch (error) {
      console.error("Error loading recordings:", error);
      Alert.alert("Error", "Failed to load recordings");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadRecordings();
    }, [loadRecordings]),
  );

  const handlePlayRecording = async (uri: string, id: string) => {
    try {
      if (playingId === id) {
        // Stop playback
        if (soundRef.current) {
          await soundRef.current.stopAsync();
        }
        setPlayingId(null);
      } else {
        // Stop previous sound if any
        if (soundRef.current) {
          await soundRef.current.unloadAsync();
        }

        // Ensure audio mode is set for playback
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
          staysActiveInBackground: true,
        });

        // Play new sound
        const { sound } = await Audio.Sound.createAsync({ uri });
        soundRef.current = sound;
        setPlayingId(id);

        await sound.playAsync();

        // Handle sound finish
        sound.setOnPlaybackStatusUpdate(async (status) => {
          if (status.isLoaded && status.didJustFinish) {
            setPlayingId(null);
          }
        });
      }
    } catch (error) {
      console.error("Error playing recording:", error);
      Alert.alert("Error", "Failed to play recording");
    }
  };

  const handleDeleteRecording = (id: string) => {
    const recording = recordings.find((r) => r.id === id);
    Alert.alert(
      "Delete Recording",
      `Are you sure you want to delete "${recording?.title}"?`,
      [
        { text: "Cancel", onPress: () => {} },
        {
          text: "Delete",
          onPress: async () => {
            try {
              if (playingId === id && soundRef.current) {
                await soundRef.current.unloadAsync();
                setPlayingId(null);
              }
              await fileStorageService.deleteRecording(id);
              setRecordings((prev) => prev.filter((r) => r.id !== id));
            } catch (error) {
              console.error("Error deleting recording:", error);
              Alert.alert("Error", "Failed to delete recording");
            }
          },
          style: "destructive",
        },
      ],
    );
  };

  const handleClearAll = () => {
    Alert.alert(
      "Clear All Recordings",
      "Are you sure you want to delete all recordings? This action cannot be undone.",
      [
        { text: "Cancel", onPress: () => {} },
        {
          text: "Clear All",
          onPress: async () => {
            try {
              if (soundRef.current) {
                await soundRef.current.unloadAsync();
              }
              await fileStorageService.clearAllRecordings();
              setRecordings([]);
              setPlayingId(null);
            } catch (error) {
              console.error("Error clearing recordings:", error);
              Alert.alert("Error", "Failed to clear recordings");
            }
          },
          style: "destructive",
        },
      ],
    );
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const calculateTotalDuration = () => {
    const totalMs = recordings.reduce((sum, r) => sum + r.duration, 0);
    return formatDuration(totalMs);
  };

  const calculateTotalSize = () => {
    const totalBytes = recordings.reduce((sum, r) => sum + r.fileSize, 0);
    if (totalBytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB"];
    const i = Math.floor(Math.log(totalBytes) / Math.log(k));
    return (
      Math.round((totalBytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
    );
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: isDark ? "#111827" : "#ffffff" },
      ]}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerContent}>
          <View>
            <Text
              style={[styles.title, { color: isDark ? "#f3f4f6" : "#111827" }]}
            >
              Library
            </Text>
            <Text
              style={[
                styles.subtitle,
                { color: isDark ? "#9ca3af" : "#6b7280" },
              ]}
            >
              {recordings.length} recording{recordings.length !== 1 ? "s" : ""}
            </Text>
          </View>
          {recordings.length > 0 && (
            <Pressable
              onPress={handleClearAll}
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
            >
              <MaterialIcons
                name="delete-outline"
                size={24}
                color={isDark ? "#ef4444" : "#dc2626"}
              />
            </Pressable>
          )}
        </View>
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <MaterialIcons
            name="hourglass-empty"
            size={40}
            color={isDark ? "#6b7280" : "#d1d5db"}
          />
          <Text
            style={[
              styles.loadingText,
              { color: isDark ? "#9ca3af" : "#6b7280" },
            ]}
          >
            Loading...
          </Text>
        </View>
      ) : recordings.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons
            name="mic-none"
            size={64}
            color={isDark ? "#374151" : "#e5e7eb"}
          />
          <Text
            style={[
              styles.emptyTitle,
              { color: isDark ? "#9ca3af" : "#6b7280" },
            ]}
          >
            No recordings yet
          </Text>
          <Text
            style={[
              styles.emptySubtitle,
              { color: isDark ? "#6b7280" : "#9ca3af" },
            ]}
          >
            Go to the Recorder tab to start recording audio
          </Text>
        </View>
      ) : (
        <>
          {/* Stats */}
          <View
            style={[
              styles.statsContainer,
              {
                backgroundColor: isDark ? "#1f2937" : "#f9fafb",
                borderColor: isDark ? "#374151" : "#e5e7eb",
              },
            ]}
          >
            <View style={styles.statItem}>
              <MaterialIcons name="schedule" size={20} color="#3b82f6" />
              <View>
                <Text
                  style={[
                    styles.statLabel,
                    { color: isDark ? "#9ca3af" : "#6b7280" },
                  ]}
                >
                  Total Duration
                </Text>
                <Text
                  style={[
                    styles.statValue,
                    { color: isDark ? "#f3f4f6" : "#111827" },
                  ]}
                >
                  {calculateTotalDuration()}
                </Text>
              </View>
            </View>
            <View style={styles.statItem}>
              <MaterialIcons name="storage" size={20} color="#8b5cf6" />
              <View>
                <Text
                  style={[
                    styles.statLabel,
                    { color: isDark ? "#9ca3af" : "#6b7280" },
                  ]}
                >
                  Total Size
                </Text>
                <Text
                  style={[
                    styles.statValue,
                    { color: isDark ? "#f3f4f6" : "#111827" },
                  ]}
                >
                  {calculateTotalSize()}
                </Text>
              </View>
            </View>
          </View>

          {/* List */}
          <FlatList
            data={recordings}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <RecordingCard
                recording={item}
                onPlay={(uri) => handlePlayRecording(uri, item.id)}
                onDelete={handleDeleteRecording}
                isPlaying={playingId === item.id}
              />
            )}
            scrollEnabled={false}
            contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
          />
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: "500",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  statsContainer: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 24,
  },
  statItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  statLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: "600",
  },
});
