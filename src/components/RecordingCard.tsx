import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { MaterialIcons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { RecordingMetadata } from "../types";

interface RecordingCardProps {
  recording: RecordingMetadata;
  onPress?: () => void;
  onDelete?: (id: string) => void;
  onPlay?: (uri: string) => void;
  isPlaying?: boolean;
}

export const RecordingCard: React.FC<RecordingCardProps> = ({
  recording,
  onPress,
  onDelete,
  onPlay,
  isPlaying = false,
}) => {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "dark"];
  const [showOptions, setShowOptions] = useState(false);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.surfaceElevated,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Text
              style={[styles.title, { color: theme.text }]}
              numberOfLines={1}
            >
              {recording.title}
            </Text>
            <Text style={[styles.date, { color: theme.textMuted }]}>
              {formatDate(recording.createdAt)}
            </Text>
          </View>

          <Pressable
            onPress={() => setShowOptions(!showOptions)}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          >
            <MaterialIcons name="more-vert" size={24} color={theme.textMuted} />
          </Pressable>
        </View>

        <View style={styles.footer}>
          <View style={styles.stats}>
            <View style={styles.stat}>
              <MaterialIcons name="schedule" size={16} color={theme.accent} />
              <Text style={[styles.statText, { color: theme.textMuted }]}>
                {formatDuration(recording.duration)}
              </Text>
            </View>
            <View style={styles.stat}>
              <MaterialIcons
                name="storage"
                size={16}
                color={theme.accentSoft}
              />
              <Text style={[styles.statText, { color: theme.textMuted }]}>
                {formatFileSize(recording.fileSize)}
              </Text>
            </View>
          </View>

          <View style={styles.actions}>
            {onPlay && (
              <Pressable
                onPress={() => onPlay(recording.fileUri)}
                style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
              >
                <MaterialIcons
                  name={isPlaying ? "pause" : "play-arrow"}
                  size={24}
                  color={theme.accent}
                />
              </Pressable>
            )}
            {onDelete && (
              <Pressable
                onPress={() => onDelete(recording.id)}
                style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
              >
                <MaterialIcons name="delete" size={24} color={theme.danger} />
              </Pressable>
            )}
          </View>
        </View>

        {recording.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {recording.tags.map((tag, index) => (
              <View
                key={index}
                style={[styles.tag, { backgroundColor: theme.surfaceAlt }]}
              >
                <Text style={[styles.tagText, { color: theme.textMuted }]}>
                  {tag}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  content: {
    gap: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  titleContainer: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  date: {
    fontSize: 12,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  stats: {
    flexDirection: "row",
    gap: 16,
  },
  stat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statText: {
    fontSize: 12,
    fontWeight: "500",
  },
  actions: {
    flexDirection: "row",
    gap: 12,
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 11,
    fontWeight: "500",
  },
});
