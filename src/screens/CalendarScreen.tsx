import { Colors } from "@/constants/theme";
import { getSessions, getSummary } from "@/src/storage/sessionStore";
import { SessionRecord, SessionSummary } from "@/src/types";
import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const T = Colors.dark;
const WEEKDAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

type CalendarCell = {
  key: string;
  date: Date;
  inMonth: boolean;
};

function toDateKey(date: Date) {
  const yy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function formatMonthLabel(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function formatDayLabel(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTimeLabel(dateMs: number) {
  return new Date(dateMs).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildCalendarCells(monthDate: Date): CalendarCell[] {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const first = new Date(year, month, 1);
  const startOffset = first.getDay();
  const startDate = new Date(year, month, 1 - startOffset);
  const cells: CalendarCell[] = [];
  for (let i = 0; i < 42; i += 1) {
    const day = new Date(
      startDate.getFullYear(),
      startDate.getMonth(),
      startDate.getDate() + i,
    );
    cells.push({
      key: toDateKey(day),
      date: day,
      inMonth: day.getMonth() === month,
    });
  }
  return cells;
}

export const CalendarScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [summaries, setSummaries] = useState<Record<string, SessionSummary>>({});
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    const result = await getSessions();
    setSessions(result);
    const sumResult: Record<string, SessionSummary> = {};
    for (const session of result) {
      const summary = await getSummary(session.id);
      if (summary) {
        sumResult[session.id] = summary;
      }
    }
    setSummaries(sumResult);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const sessionsByDate = useMemo(() => {
    const map: Record<string, SessionRecord[]> = {};
    sessions.forEach((session) => {
      const createdAtMs =
        typeof session.createdAt === "number"
          ? session.createdAt
          : Number(session.createdAt);
      const key = toDateKey(new Date(createdAtMs));
      if (!map[key]) {
        map[key] = [];
      }
      map[key].push(session);
    });
    Object.values(map).forEach((list) => {
      list.sort((a, b) => b.createdAt - a.createdAt);
    });
    return map;
  }, [sessions]);

  const calendarCells = useMemo(
    () => buildCalendarCells(currentMonth),
    [currentMonth],
  );

  const selectedSessions = selectedDateKey
    ? (sessionsByDate[selectedDateKey] ?? [])
    : [];

  const openDaySheet = useCallback((key: string) => {
    setSelectedDateKey(key);
  }, []);

  const changeMonth = (delta: number) => {
    setCurrentMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1),
    );
  };

  const renderDayCell = ({ item }: { item: CalendarCell }) => {
    const key = toDateKey(item.date);
    const isSelected = key === selectedDateKey;
    const hasSessions = (sessionsByDate[key]?.length ?? 0) > 0;
    return (
      <Pressable
        onPress={item.inMonth ? () => openDaySheet(key) : undefined}
        disabled={!item.inMonth}
        style={({ pressed }) => [
          styles.dayCell,
          {
            backgroundColor: isSelected ? T.accentDim : T.surface,
            borderColor: isSelected ? T.accent : T.borderStrong,
            opacity: item.inMonth ? (pressed ? 0.7 : 1) : 0.35,
          },
        ]}
      >
        <Text
          style={[
            styles.dayLabel,
            {
              color: item.inMonth ? T.text : T.textFaint,
            },
          ]}
        >
          {item.date.getDate()}
        </Text>
        {hasSessions && <View style={styles.dot} />}
      </Pressable>
    );
  };

  const renderSession = ({ item }: { item: SessionRecord }) => {
    const statusColor =
      item.status === "ready"
        ? T.success
        : item.status === "failed"
          ? T.danger
          : T.accent;
    const createdAtMs =
      typeof item.createdAt === "number" ? item.createdAt : Number(item.createdAt);
    const mins = Math.max(1, Math.round(item.durationSeconds / 60));
    const summary = summaries[item.id]?.executive_summary;

    return (
      <Pressable
        onPress={() => router.push(`/session/${item.id}`)}
        style={({ pressed }) => [
          styles.flashcard,
          {
            borderColor: statusColor,
            opacity: pressed ? 0.7 : 1,
          },
        ]}
      >
        <View style={styles.flashcardTop}>
          <Text style={styles.flashcardTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={[styles.flashcardStatus, { color: statusColor }]}
            numberOfLines={1}
          >
            {item.status.toUpperCase()}
          </Text>
        </View>
        {summary && (
          <Text style={styles.flashcardSummaryPreview} numberOfLines={2}>
            {summary}
          </Text>
        )}
        <View style={styles.flashcardMeta}>
          <Text style={styles.flashcardMetaText}>{item.contextTag}</Text>
          <Text style={styles.flashcardMetaText}>
            {formatTimeLabel(createdAtMs)} · {mins}m
          </Text>
        </View>
      </Pressable>
    );
  };

  const sheetTitle = selectedDateKey
    ? formatDayLabel(new Date(selectedDateKey))
    : "Select a day";

  return (
    <View style={[styles.root, { paddingTop: insets.top + 12 }]}>
      <View style={styles.header}>
        <Text style={styles.title}>CALENDAR</Text>
        <View style={styles.monthRow}>
          <Pressable
            onPress={() => changeMonth(-1)}
            style={({ pressed }) => [
              styles.navBtn,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <MaterialIcons name="chevron-left" size={24} color={T.text} />
          </Pressable>
          <Text style={styles.monthLabel}>
            {formatMonthLabel(currentMonth)}
          </Text>
          <Pressable
            onPress={() => changeMonth(1)}
            style={({ pressed }) => [
              styles.navBtn,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <MaterialIcons name="chevron-right" size={24} color={T.text} />
          </Pressable>
        </View>
      </View>

      <View style={styles.weekRow}>
        {WEEKDAYS.map((day) => (
          <Text key={day} style={styles.weekLabel}>
            {day}
          </Text>
        ))}
      </View>

      <FlatList
        data={calendarCells}
        renderItem={renderDayCell}
        keyExtractor={(item) => item.key}
        numColumns={7}
        scrollEnabled={false}
        contentContainerStyle={styles.calendarGrid}
      />

      {selectedDateKey && (
        <>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{sheetTitle}</Text>
            <Text style={styles.sheetCount}>
              {selectedSessions.length} recording
              {selectedSessions.length === 1 ? "" : "s"}
            </Text>
          </View>
          <FlatList
            data={selectedSessions}
            extraData={summaries}
            renderItem={renderSession}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <MaterialIcons name="event-busy" size={20} color={T.textMuted} />
                <Text style={styles.emptyText}>No recordings on this day.</Text>
              </View>
            }
            contentContainerStyle={styles.sheetList}
          />
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: T.background,
  },
  header: {
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  title: {
    fontSize: 12,
    letterSpacing: 2,
    fontWeight: "900",
    color: T.textMuted,
  },
  monthRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  monthLabel: {
    fontSize: 18,
    fontWeight: "800",
    color: T.text,
    letterSpacing: -0.2,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: T.borderStrong,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: T.surface,
  },
  weekRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  weekLabel: {
    width: 40,
    textAlign: "center",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.2,
    color: T.textMuted,
  },
  calendarGrid: {
    paddingHorizontal: 12,
    rowGap: 8,
  },
  dayCell: {
    width: "14.28%",
    aspectRatio: 1,
    marginVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  dayLabel: {
    fontSize: 14,
    fontWeight: "700",
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: T.accent,
    marginTop: 4,
  },
  sheetHeader: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: T.borderStrong,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: T.text,
  },
  sheetCount: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "700",
    color: T.textMuted,
  },
  sheetList: {
    paddingTop: 8,
    paddingBottom: 24,
  },
  flashcard: {
    marginHorizontal: 16,
    marginBottom: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: T.surface,
  },
  flashcardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  flashcardTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: "800",
    color: T.text,
  },
  flashcardStatus: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  flashcardSummaryPreview: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 18,
    color: T.text,
    opacity: 0.8,
  },
  flashcardMeta: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  flashcardMetaText: {
    fontSize: 11,
    fontWeight: "700",
    color: T.textMuted,
  },
  emptyWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 24,
  },
  emptyText: {
    color: T.textMuted,
    fontWeight: "700",
  },
});
