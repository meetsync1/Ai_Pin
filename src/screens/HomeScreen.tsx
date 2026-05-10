import { MaterialIcons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import Animated, {
    Easing,
    FadeIn,
    FadeInDown,
    FadeOut,
    interpolateColor,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withSpring,
    withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors } from "@/constants/theme";
import { runTranscriptionWorkflow } from "@/src/services/transcriptionWorkflow";
import { RecorderButton } from "../components/RecorderButton";
import { Waveform } from "../components/Waveform";
import { useAudioRecorder } from "../hooks/useAudioRecorder";

const T = Colors.dark;
const EASE = Easing.bezier(0.4, 0, 0.2, 1);

const CONTEXT_OPTIONS = [
  { value: "business_meeting", label: "BUSI" },
  { value: "legal_deposition", label: "LEGA" },
  { value: "personal_note", label: "PERS" },
  { value: "lecture_kids", label: "KIDS" },
] as const;

/** Spinning sync icon — no Easing import (crashes Reanimated v4 worklet) */
const SpinIcon: React.FC = () => {
  const rotation = useSharedValue(0);
  useEffect(() => {
    // withRepeat on a 0→360 withTiming gives linear-like rotation
    rotation.value = withRepeat(withTiming(360, { duration: 1000 }), -1, false);
  }, []);
  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));
  return (
    <Animated.View style={style}>
      <MaterialIcons name="sync" size={14} color={T.accent} />
    </Animated.View>
  );
};

export const HomeScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const chipLayouts = useRef<Record<string, { x: number; width: number }>>({});
  const [layoutTick, setLayoutTick] = useState(0);
  const highlightX = useSharedValue(0);
  const highlightW = useSharedValue(0);
  const noticePulse = useSharedValue(0);

  const [contextTag, setContextTag] = useState("business_meeting");
  const [numSpeakers, setNumSpeakers] = useState(2);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  const {
    state,
    requestPermissions,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    formatDuration,
    waveValue,
  } = useAudioRecorder();

  useEffect(() => {
    requestPermissions().then((granted) => {
      if (!granted) {
        Alert.alert(
          "Permission Required",
          "Microphone access is needed for recording.",
        );
      }
    });
  }, [requestPermissions]);

  const buildTaggedTitle = useCallback((tag: string) => {
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, "0");
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const yy = String(now.getFullYear()).slice(-2);
    const hh = String(now.getHours()).padStart(2, "0");
    const min = String(now.getMinutes()).padStart(2, "0");
    const label = CONTEXT_OPTIONS.find((c) => c.value === tag)?.label ?? "REC";
    return `${label}_${dd}${mm}${yy}_${hh}${min}`;
  }, []);

  const handleStop = async () => {
    const meta = await stopRecording(buildTaggedTitle(contextTag));
    if (!meta) return;
    setIsProcessing(true);
    setStatusMsg("Uploading audio…");
    try {
      const sessionId = await runTranscriptionWorkflow({
        audioUri: meta.fileUri,
        durationSeconds: Math.floor(meta.duration / 1000),
        title: meta.title,
        sourceType: "live",
        contextTag,
        numSpeakers,
      });
      setStatusMsg("Transcript ready → Library");
      if (sessionId) {
        router.push(`/session/${sessionId}`);
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Transcription failed. Check the backend.");
      setStatusMsg("");
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["audio/*"],
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.length) return;
    const file = result.assets[0];
    setIsProcessing(true);
    setStatusMsg("Uploading file…");
    try {
      const sessionId = await runTranscriptionWorkflow({
        audioUri: file.uri,
        durationSeconds: 0,
        title: file.name ?? "Uploaded audio",
        sourceType: "upload",
        contextTag,
        numSpeakers,
      });
      setStatusMsg("Transcript ready → Library");
      if (sessionId) {
        router.push(`/session/${sessionId}`);
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Transcription failed. Check the backend.");
      setStatusMsg("");
    } finally {
      setIsProcessing(false);
    }
  };

  const isActive = state.isRecording || state.isPaused || isProcessing;
  const recBorder = state.isRecording ? T.accent : T.borderStrong;
  const recLabel = state.isRecording
    ? state.isPaused
      ? "PAUSED"
      : "REC"
    : "IDLE";

  useEffect(() => {
    const layout = chipLayouts.current[contextTag];
    if (!layout) return;
    if (highlightW.value === 0) {
      highlightX.value = layout.x;
      highlightW.value = layout.width;
      return;
    }
    const delta = Math.abs(layout.x - highlightX.value);
    const stretch = Math.min(16, delta * 0.2);
    highlightX.value = withSequence(
      withTiming(layout.x - stretch / 2, { duration: 140, easing: EASE }),
      withSpring(layout.x, { damping: 16, stiffness: 180 }),
    );
    highlightW.value = withSequence(
      withTiming(layout.width + stretch, { duration: 140, easing: EASE }),
      withSpring(layout.width, { damping: 16, stiffness: 180 }),
    );
  }, [contextTag, layoutTick]);

  useEffect(() => {
    if (isActive) {
      noticePulse.value = withRepeat(
        withTiming(1, { duration: 1600, easing: EASE }),
        -1,
        true,
      );
    } else {
      noticePulse.value = withTiming(0, { duration: 200, easing: EASE });
    }
  }, [isActive]);

  const highlightStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: highlightX.value }],
    width: highlightW.value,
  }));

  const noticeStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      noticePulse.value,
      [0, 1],
      [T.accentDim, T.accent],
    ),
    borderColor: interpolateColor(
      noticePulse.value,
      [0, 1],
      [T.borderAccent, T.accentSoft],
    ),
  }));

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={{
        paddingTop: insets.top + 16,
        paddingBottom: insets.bottom + 24,
      }}
    >
      <View style={styles.content}>
        {/* ── Header ── */}
        <Animated.View
          entering={FadeInDown.duration(300)}
          style={styles.headerRow}
        >
          <View>
            <Text style={styles.appLabel}>AINOTES</Text>
            <Text style={styles.title}>RECORDER</Text>
          </View>
          <View style={[styles.modeBadge, { borderColor: T.borderAccent }]}>
            <View style={[styles.modeDot, { backgroundColor: T.accent }]} />
            <Text style={styles.modeLabel}>
              {CONTEXT_OPTIONS.find((c) => c.value === contextTag)?.label}
            </Text>
          </View>
        </Animated.View>

        {/* ── Recording panel ── */}
        <Animated.View
          entering={FadeInDown.duration(350).delay(60)}
          style={[styles.panel, { borderColor: recBorder }]}
        >
          {/* Context selector */}
          <View style={styles.panelRow}>
            <Text style={styles.fieldLabel}>MODE</Text>
            <View style={styles.chipRow}>
              <Animated.View
                pointerEvents="none"
                style={[styles.chipHighlight, highlightStyle]}
              />
              {CONTEXT_OPTIONS.map((opt) => {
                const active = contextTag === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    onLayout={(event) => {
                      const { x, width } = event.nativeEvent.layout;
                      chipLayouts.current[opt.value] = { x, width };
                      setLayoutTick((tick) => tick + 1);
                    }}
                    onPress={() => {
                      if (opt.value !== contextTag) {
                        Haptics.selectionAsync();
                      }
                      setContextTag(opt.value);
                    }}
                    style={({ pressed }) => [
                      styles.chip,
                      {
                        backgroundColor: active ? T.accent : T.panelAlt,
                        borderColor: active ? T.accent : T.borderStrong,
                        opacity: pressed ? 0.75 : 1,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: active ? "#000" : T.textMuted },
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={[styles.sep, { backgroundColor: T.borderStrong }]} />

          {/* Speaker count */}
          <View style={styles.panelRow}>
            <Text style={styles.fieldLabel}>SPEAKERS</Text>
            <View style={styles.stepper}>
              <Pressable
                onPress={() => {
                  setNumSpeakers((n) => Math.max(1, n - 1));
                  Haptics.selectionAsync();
                }}
                style={[styles.stepBtn, { borderColor: T.borderStrong }]}
              >
                <MaterialIcons name="remove" size={16} color={T.textMuted} />
              </Pressable>
              <Text style={styles.stepVal}>{numSpeakers}</Text>
              <Pressable
                onPress={() => {
                  setNumSpeakers((n) => Math.min(8, n + 1));
                  Haptics.selectionAsync();
                }}
                style={[styles.stepBtn, { borderColor: T.borderStrong }]}
              >
                <MaterialIcons name="add" size={16} color={T.textMuted} />
              </Pressable>
            </View>
          </View>

          <View style={[styles.sep, { backgroundColor: T.borderStrong }]} />

          {/* Duration readout */}
          <View style={styles.readoutBlock}>
            <Text style={styles.fieldLabel}>DURATION</Text>
            <View style={[styles.readout, { borderColor: recBorder }]}>
              <Text style={styles.durationText}>
                {formatDuration(state.duration)}
              </Text>
              <View style={styles.readoutRight}>
                <View
                  style={[
                    styles.recDot,
                    {
                      backgroundColor:
                        state.isRecording && !state.isPaused
                          ? T.accent
                          : T.borderStrong,
                    },
                  ]}
                />
                <Text style={styles.recLabel}>{recLabel}</Text>
              </View>
            </View>

            {/* Waveform / idle */}
            {state.isRecording ? (
              <Animated.View
                entering={FadeIn.duration(300)}
                exiting={FadeOut.duration(200)}
                style={styles.waveWrap}
              >
                <Waveform
                  value={waveValue}
                  color={state.isPaused ? T.accentDim : T.accent}
                  numberOfBars={44}
                  idleAnimate={false}
                  paused={state.isPaused}
                />
              </Animated.View>
            ) : (
              <Animated.View
                entering={FadeIn.duration(300)}
                style={styles.idleWrap}
              >
                <Waveform
                  value={waveValue}
                  color={T.borderStrong}
                  numberOfBars={44}
                  idleAnimate={true}
                  paused={false}
                />
                <Text style={styles.idleHint}>SLIDE UP TO ARM</Text>
              </Animated.View>
            )}
          </View>
        </Animated.View>

        {/* ── Upload button ── */}
        <Animated.View
          entering={FadeInDown.duration(350).delay(120)}
          style={styles.uploadRow}
        >
          <Pressable
            onPress={handlePickFile}
            style={({ pressed }) => [
              styles.uploadBtn,
              { borderColor: T.borderStrong, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <MaterialIcons name="upload-file" size={16} color={T.accent} />
            <Text style={styles.uploadText}>UPLOAD FILE</Text>
          </Pressable>
        </Animated.View>

        {/* ── Recorder button ── */}
        <Animated.View
          entering={FadeInDown.duration(350).delay(180)}
          style={styles.ctaRow}
        >
          <RecorderButton
            isRecording={state.isRecording}
            isPaused={state.isPaused}
            isProcessing={isProcessing}
            onStartPress={startRecording}
            onStopPress={handleStop}
            onPausePress={pauseRecording}
            onResumePress={resumeRecording}
          />
        </Animated.View>

        {/* ── Status notice ── */}
        {isActive && (
          <Animated.View
            entering={FadeInDown.duration(250)}
            exiting={FadeOut.duration(200)}
            style={[styles.notice, noticeStyle]}
          >
            {isProcessing ? (
              <SpinIcon />
            ) : (
              <View
                style={[
                  styles.recDot,
                  { backgroundColor: T.accent, width: 7, height: 7 },
                ]}
              />
            )}
            <Text style={styles.noticeText} numberOfLines={2}>
              {isProcessing
                ? statusMsg
                : "Recording continues while screen is locked."}
            </Text>
          </Animated.View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  content: {
    paddingHorizontal: 16,
    gap: 12,
  },

  /* Header */
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingBottom: 4,
  },
  appLabel: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 4,
    color: Colors.dark.accent,
    marginBottom: 2,
  },
  title: {
    fontSize: 34,
    fontWeight: "900",
    letterSpacing: -1,
    color: Colors.dark.text,
  },
  modeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 4,
    borderWidth: 1,
    backgroundColor: Colors.dark.accentDim,
  },
  modeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  modeLabel: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 2,
    color: Colors.dark.accent,
  },

  /* Panel */
  panel: {
    borderRadius: 4,
    borderWidth: 1,
    backgroundColor: Colors.dark.surface,
    padding: 14,
    gap: 12,
  },
  panelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  fieldLabel: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 2.5,
    color: Colors.dark.textMuted,
  },
  sep: { height: 1 },

  chipRow: {
    flexDirection: "row",
    gap: 6,
    position: "relative",
  },
  chipHighlight: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 2,
    backgroundColor: Colors.dark.accent,
    opacity: 0.85,
  },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 2,
    borderWidth: 1,
    zIndex: 1,
  },
  chipText: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.5,
  },

  stepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  stepBtn: {
    width: 30,
    height: 30,
    borderRadius: 2,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.dark.panelAlt,
  },
  stepVal: {
    fontSize: 20,
    fontWeight: "900",
    color: Colors.dark.text,
    minWidth: 22,
    textAlign: "center",
  },

  readoutBlock: { gap: 10 },
  readout: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    backgroundColor: Colors.dark.panelAlt,
    borderRadius: 4,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  durationText: {
    fontSize: 48,
    fontWeight: "900",
    letterSpacing: -2,
    color: Colors.dark.text,
    fontVariant: ["tabular-nums"],
  },
  readoutRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  recDot: { width: 7, height: 7, borderRadius: 1 },
  recLabel: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 2,
    color: Colors.dark.textMuted,
  },

  waveWrap: { marginTop: 4 },
  idleWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    gap: 6,
  },
  idleHint: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 3,
    color: Colors.dark.textFaint,
  },

  uploadRow: { flexDirection: "row", justifyContent: "flex-end" },
  uploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 4,
    borderWidth: 1,
    backgroundColor: Colors.dark.surface,
  },
  uploadText: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 2,
    color: Colors.dark.textMuted,
  },

  ctaRow: { alignItems: "center", paddingVertical: 4 },

  notice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 4,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: Colors.dark.accentDim,
  },
  noticeText: {
    flex: 1,
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 16,
    color: Colors.dark.accentSoft,
  },
});
