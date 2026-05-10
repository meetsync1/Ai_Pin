import { Colors } from "@/constants/theme";
import { SessionCard } from "@/src/components/SessionCard";
import {
  deleteSession,
  getSessions,
  updateSessionTitle,
} from "@/src/storage/sessionStore";
import { SessionRecord } from "@/src/types";
import { MaterialIcons } from "@expo/vector-icons";
import BottomSheet, { BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import { useFocusEffect } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  Animated,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const T = Colors.dark;

export const LibraryScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [pendingDelete, setPendingDelete] = useState<SessionRecord | null>(
    null,
  );
  const toastAnim = useRef(new Animated.Value(0)).current;
  const [toastMsg, setToastMsg] = useState("");
  const failedIdsRef = useRef<Set<string>>(new Set());
  const deleteSheetRef = useRef<BottomSheet>(null);
  const deleteSnapPoints = useMemo(() => [220], []);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      setSessions(await getSessions());
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  useEffect(() => {
    const newlyFailed = sessions.filter(
      (session) =>
        session.status === "failed" && !failedIdsRef.current.has(session.id),
    );
    if (newlyFailed.length > 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setTimeout(() => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }, 140);
      newlyFailed.forEach((session) => failedIdsRef.current.add(session.id));
    }
  }, [sessions]);

  const showToast = useCallback(
    (message: string) => {
      setToastMsg(message);
      toastAnim.setValue(0);
      Animated.sequence([
        Animated.timing(toastAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.delay(1000),
        Animated.timing(toastAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) {
          setToastMsg("");
        }
      });
    },
    [toastAnim],
  );

  const startInlineRename = useCallback((session: SessionRecord) => {
    setEditingId(session.id);
    setEditingTitle(session.title);
  }, []);

  const cancelInlineRename = useCallback(() => {
    setEditingId(null);
    setEditingTitle("");
  }, []);

  const handleRenameSave = useCallback(async () => {
    if (!editingId) return;
    const trimmed = editingTitle.trim();
    if (!trimmed) {
      Alert.alert("Invalid name", "Please enter a title.");
      return;
    }
    try {
      await updateSessionTitle(editingId, trimmed);
      cancelInlineRename();
      await load();
      showToast("Renamed");
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to rename session.");
    }
  }, [editingId, editingTitle, cancelInlineRename, load, showToast]);

  const openDeleteSheet = useCallback((session: SessionRecord) => {
    setPendingDelete(session);
    deleteSheetRef.current?.expand();
  }, []);

  const closeDeleteSheet = useCallback(() => {
    deleteSheetRef.current?.close();
    setPendingDelete(null);
  }, []);

  // Replace handleDeleteConfirm
  const handleDeleteConfirm = useCallback(async () => {
    if (!pendingDelete) return;
    const idToDelete = pendingDelete.id;
    closeDeleteSheet();
    try {
      await deleteSession(idToDelete);
      await load();
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to delete session.");
    }
  }, [pendingDelete, closeDeleteSheet, load]);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        opacity={0.8}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior="close"
      />
    ),
    [],
  );

  const totalMin = Math.floor(
    sessions.reduce((s, r) => s + r.durationSeconds, 0) / 60,
  );

  const SessionRow: React.FC<{ item: SessionRecord }> = ({ item }) => {
    const swipeRef = useRef<Swipeable>(null);
    const isEditing = editingId === item.id;

    const closeSwipe = () => swipeRef.current?.close();

    const handleRename = () => {
      closeSwipe();
      startInlineRename(item);
      Haptics.selectionAsync();
    };

    const handleDelete = () => {
      closeSwipe();
      openDeleteSheet(item);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    };

    const renderLeftActions = (
      _progress: any,
      dragX: Animated.AnimatedInterpolation<number>,
    ) => {
      const translateX = dragX.interpolate({
        inputRange: [0, 120],
        outputRange: [-120, 0],
        extrapolate: "clamp",
      });
      const opacity = dragX.interpolate({
        inputRange: [0, 30, 90],
        outputRange: [0, 0.6, 1],
        extrapolate: "clamp",
      });
      const scale = dragX.interpolate({
        inputRange: [0, 90],
        outputRange: [0.9, 1],
        extrapolate: "clamp",
      });
      return (
        <Animated.View
          style={[
            styles.swipeAction,
            styles.swipeRename,
            { transform: [{ translateX }], opacity },
          ]}
        >
          <Pressable onPress={handleRename} style={styles.swipeActionContent}>
            <Animated.View style={{ transform: [{ scale }] }}>
              <MaterialIcons name="edit" size={18} color="#000" />
            </Animated.View>
            <Text style={styles.swipeText}>RENAME</Text>
          </Pressable>
        </Animated.View>
      );
    };

    const renderRightActions = (
      _progress: any,
      dragX: Animated.AnimatedInterpolation<number>,
    ) => {
      const translateX = dragX.interpolate({
        inputRange: [-120, 0],
        outputRange: [0, 120],
        extrapolate: "clamp",
      });
      const opacity = dragX.interpolate({
        inputRange: [-90, -30, 0],
        outputRange: [1, 0.6, 0],
        extrapolate: "clamp",
      });
      const scale = dragX.interpolate({
        inputRange: [-90, 0],
        outputRange: [1, 0.9],
        extrapolate: "clamp",
      });
      return (
        <Animated.View
          style={[
            styles.swipeAction,
            styles.swipeDelete,
            { transform: [{ translateX }], opacity },
          ]}
        >
          <Pressable onPress={handleDelete} style={styles.swipeActionContent}>
            <Animated.View style={{ transform: [{ scale }] }}>
              <MaterialIcons name="delete" size={18} color="#000" />
            </Animated.View>
            <Text style={styles.swipeText}>DELETE</Text>
          </Pressable>
        </Animated.View>
      );
    };
    return (
      <Swipeable
        ref={swipeRef}
        renderLeftActions={renderLeftActions}
        renderRightActions={renderRightActions}
        leftThreshold={70}
        rightThreshold={70}
        onSwipeableWillOpen={(direction) => {
          if (direction === "left") {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          } else {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }
        }}
      >
        <SessionCard
          session={item}
          onPress={() => router.push(`/session/${item.id}`)}
          isEditing={isEditing}
          editValue={isEditing ? editingTitle : item.title}
          onEditChange={setEditingTitle}
          onEditSubmit={handleRenameSave}
          onEditCancel={cancelInlineRename}
        />
      </Swipeable>
    );
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.appLabel}>AINOTES</Text>
          <Text style={styles.title}>LIBRARY</Text>
        </View>
        <View style={styles.statBadge}>
          <Text style={styles.statNum}>{sessions.length}</Text>
          <Text style={styles.statSub}>SESSIONS</Text>
          <View style={styles.statDiv} />
          <MaterialIcons name="schedule" size={12} color={T.accent} />
          <Text style={styles.statNum}>{totalMin}M</Text>
        </View>
      </View>

      <View style={[styles.divider]} />

      {/* ── Body ── */}
      {isLoading ? (
        <View style={styles.center}>
          <MaterialIcons
            name="hourglass-empty"
            size={36}
            color={T.borderStrong}
          />
          <Text style={styles.centerHint}>LOADING…</Text>
        </View>
      ) : sessions.length === 0 ? (
        <View style={styles.center}>
          <MaterialIcons name="mic-none" size={56} color={T.borderStrong} />
          <Text style={styles.centerTitle}>NO SESSIONS</Text>
          <Text style={styles.centerHint}>
            Record or upload audio from the Recorder tab.
          </Text>
        </View>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          renderItem={({ item }) => <SessionRow item={item} />}
        />
      )}

      <BottomSheet
        ref={deleteSheetRef}
        index={-1}
        snapPoints={deleteSnapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.sheetIndicator}
        // onClose={closeDeleteSheet}
      >
        <View style={styles.sheetContent}>
          <Text style={styles.sheetTitle}>Delete session?</Text>
          <Text style={styles.sheetBody}>
            This will remove the transcript and summary from this device.
          </Text>
          <View style={styles.sheetActions}>
            <Pressable
              onPress={closeDeleteSheet}
              style={[styles.sheetBtn, styles.sheetBtnGhost]}
            >
              <Text style={styles.sheetBtnText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleDeleteConfirm}
              style={[styles.sheetBtn, styles.sheetBtnDanger]}
            >
              <Text style={[styles.sheetBtnText, styles.sheetBtnDangerText]}>
                Delete
              </Text>
            </Pressable>
          </View>
        </View>
      </BottomSheet>

      {toastMsg ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.toast,
            {
              opacity: toastAnim,
              transform: [
                {
                  translateY: toastAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-12, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.toastText}>{toastMsg}</Text>
        </Animated.View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: T.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  appLabel: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 4,
    color: T.accent,
    marginBottom: 2,
  },
  title: {
    fontSize: 34,
    fontWeight: "900",
    letterSpacing: -1,
    color: T.text,
  },
  statBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: T.borderStrong,
    backgroundColor: T.surface,
  },
  statNum: {
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: -0.3,
    color: T.text,
  },
  statSub: {
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 2,
    color: T.textMuted,
  },
  statDiv: {
    width: 1,
    height: 14,
    backgroundColor: T.borderStrong,
    marginHorizontal: 2,
  },
  divider: {
    height: 1,
    backgroundColor: T.borderStrong,
    marginHorizontal: 0,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 32,
  },
  centerTitle: {
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 2,
    color: T.textMuted,
  },
  centerHint: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    color: T.textFaint,
    textAlign: "center",
    lineHeight: 16,
  },
  swipeAction: {
    width: 120,
    height: "100%",
    overflow: "hidden",
  },
  swipeRename: {
    backgroundColor: "#E8D44D", // yellow
    justifyContent: "center",
  },
  swipeDelete: {
    backgroundColor: "#FF4444", // red
    justifyContent: "center",
  },
  swipeActionContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  swipeText: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.5,
    color: "#000",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  modalCard: {
    width: "100%",
    borderRadius: 14,
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.borderStrong,
    padding: 16,
    gap: 12,
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 1,
    color: T.text,
  },
  modalBody: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.4,
    color: T.textMuted,
    lineHeight: 18,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: T.borderStrong,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: T.text,
    backgroundColor: T.surfaceAlt,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  modalBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: T.borderStrong,
  },
  modalBtnGhost: {
    backgroundColor: "transparent",
  },
  modalBtnPrimary: {
    backgroundColor: T.accent,
    borderColor: T.accent,
  },
  modalBtnDanger: {
    backgroundColor: T.danger,
    borderColor: T.danger,
  },
  modalBtnText: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.6,
    color: T.text,
  },
  modalBtnPrimaryText: {
    color: "#000",
  },
  modalBtnDangerText: {
    color: "#000",
  },
});
