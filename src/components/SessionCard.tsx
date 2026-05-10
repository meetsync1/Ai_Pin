import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { SessionRecord } from "@/src/types";
import { MaterialIcons } from "@expo/vector-icons";
import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface SessionCardProps {
  session: SessionRecord;
  onPress?: () => void;
  onLongPress?: () => void;
  isEditing?: boolean;
  editValue?: string;
  onEditChange?: (text: string) => void;
  onEditSubmit?: () => void;
  onEditCancel?: () => void;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  transcribing: "Transcribing",
  summarizing: "Summarizing",
  ready: "Ready",
  failed: "Failed",
};

export function SessionCard({
  session,
  onPress,
  onLongPress,
  isEditing = false,
  editValue = "",
  onEditChange,
  onEditSubmit,
  onEditCancel,
}: SessionCardProps) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];

  const statusLabel = STATUS_LABELS[session.status] ?? session.status;
  const statusAccent =
    session.status === "ready"
      ? theme.success
      : session.status === "failed"
        ? theme.danger
        : theme.accent;

  return (
    <Pressable
      onPress={isEditing ? undefined : onPress}
      onLongPress={isEditing ? undefined : onLongPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.surface,
          borderColor: isEditing ? theme.accent : theme.borderStrong,
          opacity: pressed && !isEditing ? 0.85 : 1,
        },
      ]}
    >
      <View style={[styles.accentRail, { backgroundColor: statusAccent }]} />

      <View style={styles.header}>
        {isEditing ? (
          <TextInput
            value={editValue}
            onChangeText={onEditChange}
            onSubmitEditing={onEditSubmit}
            autoFocus
            returnKeyType="done"
            style={[
              styles.editInput,
              {
                color: theme.text,
                borderColor: theme.accent,
                backgroundColor: theme.surfaceAlt,
              },
            ]}
          />
        ) : (
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
            {session.title}
          </Text>
        )}

        {isEditing ? (
          <View style={styles.editActions}>
            <TouchableOpacity onPress={onEditCancel} style={styles.editBtn}>
              <MaterialIcons name="close" size={18} color={theme.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onEditSubmit}
              style={[styles.editBtn, { backgroundColor: theme.accent }]}
            >
              <MaterialIcons name="check" size={18} color="#000" />
            </TouchableOpacity>
          </View>
        ) : (
          <View
            style={[
              styles.statusChip,
              {
                borderColor: theme.borderStrong,
                backgroundColor: theme.surfaceAlt,
              },
            ]}
          >
            <Text style={[styles.statusText, { color: theme.textMuted }]}>
              {statusLabel}
            </Text>
          </View>
        )}
      </View>

      {!isEditing && (
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <MaterialIcons name="schedule" size={14} color={theme.accent} />
            <Text style={[styles.metaText, { color: theme.textMuted }]}>
              {Math.floor(session.durationSeconds / 60)}m
            </Text>
          </View>
          <View style={styles.metaItem}>
            <MaterialIcons name="label" size={14} color={theme.accentSoft} />
            <Text style={[styles.metaText, { color: theme.textMuted }]}>
              {session.contextTag}
            </Text>
          </View>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderWidth: 1,
    overflow: "hidden",
  },
  accentRail: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.2,
    flex: 1,
  },
  editInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.2,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  editActions: {
    flexDirection: "row",
    gap: 6,
  },
  editBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.9,
    textTransform: "uppercase",
  },
  metaRow: {
    marginTop: 10,
    flexDirection: "row",
    gap: 16,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    fontWeight: "700",
  },
});
