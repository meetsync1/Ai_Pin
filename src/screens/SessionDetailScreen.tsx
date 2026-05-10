import { Colors } from "@/constants/theme";
import { BackendSummaryPayload } from "@/src/services/backendService";
import {
  getSessionById,
  getSummary,
  getTranscriptsBySession,
} from "@/src/storage/sessionStore";
import { SessionRecord, SessionSummary, TranscriptChunk } from "@/src/types";
import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  UIManager,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const T = Colors.dark;

export const SessionDetailScreen: React.FC = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [session, setSession] = useState<SessionRecord | null>(null);
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [transcripts, setTranscripts] = useState<TranscriptChunk[]>([]);

  const summaryAnim = useRef(new Animated.Value(0)).current;
  const lineAnimsRef = useRef<Animated.Value[]>([]);

  useEffect(() => {
    if (
      Platform.OS === "android" &&
      UIManager.setLayoutAnimationEnabledExperimental
    ) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setSession(await getSessionById(id));
      setSummary(await getSummary(id));
      setTranscripts(await getTranscriptsBySession(id));
    })();
  }, [id]);

  const combinedTranscript = useMemo(
    () => transcripts.map((c) => c.processedText).join("\n\n"),
    [transcripts],
  );

  const speakerLines = useMemo(() => {
    if (!combinedTranscript) return [];
    return combinedTranscript
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const match = line.match(/^(\[[^\]]+\])\s+([^:]+):\s*(.*)/);
        if (match) {
          return { timestamp: match[1], speaker: match[2], text: match[3] };
        }
        return { timestamp: null, speaker: null, text: line };
      });
  }, [combinedTranscript]);

  const summaryPayload = useMemo<BackendSummaryPayload | null>(() => {
    if (!summary) return null;
    return {
      summary: summary.executive_summary || "",
      key_points: summary.key_decisions ?? [],
      action_items: summary.action_items ?? [],
    };
  }, [summary]);

  const actionItems = useMemo(() => {
    if (!summaryPayload?.action_items?.length) return [] as string[];
    return summaryPayload.action_items
      .map((item) => {
        if (typeof item === "string") return item;
        const action = item?.action ? String(item.action) : "";
        const owner = item?.owner ? ` (${item.owner})` : "";
        const deadline = item?.deadline ? ` · ${item.deadline}` : "";
        return `${action}${owner}${deadline}`.trim();
      })
      .filter((line) => line.length > 0);
  }, [summaryPayload]);

  const handleShare = async () => {
    const summaryText = summaryPayload?.summary?.trim()
      ? summaryPayload.summary.trim()
      : "(No summary available)";
    const keyPoints = summaryPayload?.key_points?.length
      ? summaryPayload.key_points.map((p) => `- ${p}`).join("\n")
      : "(No key points)";
    const actionItemsText = actionItems.length
      ? actionItems.map((item) => `- ${item}`).join("\n")
      : "(No action items)";
    const transcriptText = combinedTranscript.trim()
      ? combinedTranscript.trim()
      : "(No transcript available)";

    const message = [
      `Title: ${session?.title ?? "Session"}`,
      "",
      "Summary",
      summaryText,
      "",
      "Key Points",
      keyPoints,
      "",
      "Action Items",
      actionItemsText,
      "",
      "Transcript",
      transcriptText,
    ].join("\n");

    try {
      await Share.share({ message });
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (!summaryPayload) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    summaryAnim.setValue(0);
    Animated.timing(summaryAnim, {
      toValue: 1,
      duration: 420,
      useNativeDriver: true,
    }).start();
  }, [summaryPayload, summaryAnim]);

  useEffect(() => {
    if (speakerLines.length === 0) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const anims = lineAnimsRef.current;
    while (anims.length < speakerLines.length) {
      anims.push(new Animated.Value(0));
    }
    for (let i = 0; i < speakerLines.length; i += 1) {
      anims[i].setValue(0);
    }
    Animated.stagger(
      30,
      anims.slice(0, speakerLines.length).map((value) =>
        Animated.timing(value, {
          toValue: 1,
          duration: 280,
          useNativeDriver: true,
        }),
      ),
    ).start();
  }, [speakerLines.length]);

  if (!session) {
    return (
      <View style={styles.loadState}>
        <MaterialIcons
          name="hourglass-empty"
          size={32}
          color={T.borderStrong}
        />
        <Text style={styles.loadHint}>LOADING…</Text>
      </View>
    );
  }

  const statusColor =
    session.status === "ready"
      ? T.success
      : session.status === "failed"
        ? T.danger
        : T.accent;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* ── Header bar ── */}
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={20} color={T.textMuted} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.sessionTitle} numberOfLines={1}>
            {session.title}
          </Text>
          <Text style={styles.sessionMeta}>
            {session.contextTag.toUpperCase()} ·{" "}
            {Math.floor(session.durationSeconds / 60)}M
          </Text>
        </View>
        <Pressable onPress={handleShare} style={styles.shareBtn}>
          <MaterialIcons name="ios-share" size={18} color={T.textMuted} />
        </Pressable>
        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
      </View>

      <View style={styles.divider} />

      {/* ── Body ── */}
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: insets.bottom + 32,
          gap: 16,
        }}
      >
        {/* Status card */}
        <View style={styles.metaCard}>
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>STATUS</Text>
              <Text style={[styles.metaValue, { color: statusColor }]}>
                {session.status.toUpperCase()}
              </Text>
            </View>
            <View style={styles.metaDiv} />
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>SOURCE</Text>
              <Text style={styles.metaValue}>
                {session.sourceType.toUpperCase()}
              </Text>
            </View>
            <View style={styles.metaDiv} />
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>CHUNKS</Text>
              <Text style={styles.metaValue}>{transcripts.length}</Text>
            </View>
          </View>
        </View>

        {/* ── Summary section ── */}
        {summaryPayload ? (
          <>
            <View style={styles.sectionHead}>
              <MaterialIcons name="auto-awesome" size={14} color={T.accent} />
              <Text style={styles.sectionLabel}>SUMMARY</Text>
            </View>

            <Animated.View
              style={{
                opacity: summaryAnim,
                transform: [
                  {
                    translateY: summaryAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [10, 0],
                    }),
                  },
                  {
                    scale: summaryAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.96, 1],
                    }),
                  },
                ],
              }}
            >
              <View style={styles.summaryCard}>
                <Text style={styles.summaryText}>{summaryPayload.summary}</Text>
              </View>

              {/* Key points */}
              {summaryPayload.key_points?.length > 0 && (
                <>
                  <View style={styles.sectionHead}>
                    <MaterialIcons
                      name="push-pin"
                      size={14}
                      color={T.accentSoft}
                    />
                    <Text
                      style={[styles.sectionLabel, { color: T.accentSoft }]}
                    >
                      KEY POINTS
                    </Text>
                  </View>
                  <View style={styles.keyPointsCard}>
                    {summaryPayload.key_points.map((point, idx) => (
                      <View key={idx} style={styles.keyPointRow}>
                        <View style={styles.keyPointBullet} />
                        <Text style={styles.keyPointText}>{point}</Text>
                      </View>
                    ))}
                  </View>
                </>
              )}

              {/* Action items */}
              {actionItems.length > 0 && (
                <>
                  <View style={styles.sectionHead}>
                    <MaterialIcons
                      name="check-circle"
                      size={14}
                      color={T.accentSoft}
                    />
                    <Text
                      style={[styles.sectionLabel, { color: T.accentSoft }]}
                    >
                      ACTION ITEMS
                    </Text>
                  </View>
                  <View style={styles.keyPointsCard}>
                    {actionItems.map((item, idx) => (
                      <View key={idx} style={styles.keyPointRow}>
                        <View style={styles.keyPointBullet} />
                        <Text style={styles.keyPointText}>{item}</Text>
                      </View>
                    ))}
                  </View>
                </>
              )}
            </Animated.View>
          </>
        ) : session.status === "ready" ? (
          <View style={styles.noSummaryBanner}>
            <MaterialIcons name="info-outline" size={14} color={T.textMuted} />
            <Text style={styles.noSummaryText}>No summary available yet.</Text>
          </View>
        ) : null}

        {/* ── Transcript section ── */}
        <View style={styles.sectionHead}>
          <MaterialIcons name="subtitles" size={14} color={T.accent} />
          <Text style={styles.sectionLabel}>TRANSCRIPT</Text>
          {transcripts.length > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{speakerLines.length} LINES</Text>
            </View>
          )}
        </View>

        {speakerLines.length === 0 ? (
          <View style={styles.emptyCard}>
            {session.status === "transcribing" ? (
              <>
                <MaterialIcons name="sync" size={28} color={T.accent} />
                <Text style={styles.emptyTitle}>PROCESSING</Text>
                <Text style={styles.emptyHint}>
                  Sarvam is transcribing your audio. Check back shortly.
                </Text>
              </>
            ) : (
              <>
                <MaterialIcons
                  name="text-snippet"
                  size={28}
                  color={T.borderStrong}
                />
                <Text style={styles.emptyTitle}>NO TRANSCRIPT</Text>
                <Text style={styles.emptyHint}>
                  Transcript will appear here once processing completes.
                </Text>
              </>
            )}
          </View>
        ) : (
          <View style={styles.transcriptCard}>
            {speakerLines.map((line, idx) => (
              <Animated.View
                key={idx}
                style={{
                  opacity: lineAnimsRef.current[idx] ?? 1,
                  transform: [
                    {
                      translateY: (
                        lineAnimsRef.current[idx] ?? summaryAnim
                      ).interpolate({
                        inputRange: [0, 1],
                        outputRange: [8, 0],
                      }),
                    },
                    {
                      scale: (
                        lineAnimsRef.current[idx] ?? summaryAnim
                      ).interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.98, 1],
                      }),
                    },
                  ],
                }}
              >
                <View style={styles.transcriptLine}>
                  {line.timestamp && (
                    <Text style={styles.tsLabel}>{line.timestamp}</Text>
                  )}
                  {line.speaker && (
                    <Text style={styles.speakerLabel}>{line.speaker}</Text>
                  )}
                  <Text style={styles.transcriptText}>{line.text}</Text>
                  {idx < speakerLines.length - 1 && (
                    <View style={styles.lineDivider} />
                  )}
                </View>
              </Animated.View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: T.background,
  },
  loadState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    backgroundColor: T.background,
  },
  loadHint: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 3,
    color: T.textFaint,
  },

  /* Header bar */
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: T.borderStrong,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: T.surface,
  },
  shareBtn: {
    width: 36,
    height: 36,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: T.borderStrong,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: T.surface,
  },
  headerCenter: { flex: 1 },
  sessionTitle: {
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: -0.3,
    color: T.text,
  },
  sessionMeta: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 2,
    color: T.textMuted,
    marginTop: 2,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  divider: {
    height: 1,
    backgroundColor: T.borderStrong,
  },

  /* Meta card */
  metaCard: {
    borderRadius: 4,
    borderWidth: 1,
    borderColor: T.borderStrong,
    backgroundColor: T.surface,
    paddingVertical: 12,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  metaItem: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  metaLabel: {
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 2,
    color: T.textMuted,
  },
  metaValue: {
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: -0.2,
    color: T.text,
  },
  metaDiv: {
    width: 1,
    height: 28,
    backgroundColor: T.borderStrong,
  },

  /* Section heading */
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 3,
    color: T.accent,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: T.borderStrong,
    backgroundColor: T.panelAlt,
  },
  countText: {
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1.5,
    color: T.textMuted,
  },

  /* Summary card */
  summaryCard: {
    borderRadius: 4,
    borderWidth: 1,
    borderColor: T.borderAccent,
    backgroundColor: T.surface,
    padding: 14,
  },
  summaryText: {
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 22,
    color: T.text,
  },

  /* Key points */
  keyPointsCard: {
    borderRadius: 4,
    borderWidth: 1,
    borderColor: T.borderStrong,
    backgroundColor: T.surface,
    padding: 14,
    gap: 10,
  },
  keyPointRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  keyPointBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: T.accentSoft,
    marginTop: 7,
  },
  keyPointText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 20,
    color: T.text,
  },

  /* No summary */
  noSummaryBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: T.borderStrong,
    borderStyle: "dashed",
    backgroundColor: T.panelAlt,
  },
  noSummaryText: {
    fontSize: 11,
    fontWeight: "600",
    color: T.textMuted,
  },

  /* Empty state */
  emptyCard: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 40,
    paddingHorizontal: 24,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: T.borderStrong,
    backgroundColor: T.surface,
  },
  emptyTitle: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 3,
    color: T.textMuted,
  },
  emptyHint: {
    fontSize: 12,
    fontWeight: "600",
    color: T.textFaint,
    textAlign: "center",
    lineHeight: 18,
  },

  /* Transcript lines */
  transcriptCard: {
    borderRadius: 4,
    borderWidth: 1,
    borderColor: T.borderStrong,
    backgroundColor: T.surface,
    padding: 14,
  },
  transcriptLine: { gap: 2 },
  tsLabel: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.5,
    color: T.accent,
    fontVariant: ["tabular-nums"],
  },
  speakerLabel: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
    color: T.accentSoft,
  },
  transcriptText: {
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20,
    color: T.text,
  },
  lineDivider: {
    height: 1,
    backgroundColor: T.border,
    marginVertical: 10,
  },
});
