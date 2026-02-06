import { ThemedText } from "@/components/themed-text";
import { TechNoir } from "@/constants/DesignSystem";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
    ScrollView,
    StatusBar,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";

export default function HomeScreen() {
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header Section */}
      <View style={styles.header}>
        <ThemedText style={styles.date}>{currentDate}</ThemedText>
        <ThemedText type="title" style={styles.greeting}>
          Command Center
        </ThemedText>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Primary Action: Record */}
        <TouchableOpacity
          style={styles.primaryAction}
          activeOpacity={0.8}
          onPress={() => router.push("/transcribe")}
        >
          <View style={styles.recordIconContainer}>
             <Ionicons name="mic" size={32} color="black" />
          </View>
          <View style={styles.primaryTextContainer}>
            <ThemedText type="subtitle" style={styles.primaryTitle}>INITIATE RECORDING</ThemedText>
            <ThemedText style={styles.primarySubtitle}>Voice to Text • Real-time</ThemedText>
          </View>
          <Ionicons name="arrow-forward" size={24} color="white" />
        </TouchableOpacity>

        {/* Dashboard Grid */}
        <View style={styles.grid}>
            {/* History Card */}
            <TouchableOpacity 
                style={styles.card} 
                onPress={() => router.push("/history")}
                activeOpacity={0.7}
            >
                <Ionicons name="time-outline" size={28} color={TechNoir.colors.textSecondary} style={styles.cardIcon} />
                <ThemedText style={styles.cardTitle}>History</ThemedText>
                <ThemedText style={styles.cardStat}>12 Logs</ThemedText>
            </TouchableOpacity>

            {/* Summarize Card */}
            <TouchableOpacity 
                style={[styles.card, { marginRight: 0 }]} 
                onPress={() => router.push("/summarize")}
                activeOpacity={0.7}
            >
                <Ionicons name="analytics-outline" size={28} color={TechNoir.colors.textSecondary} style={styles.cardIcon} />
                <ThemedText style={styles.cardTitle}>Analyze</ThemedText>
                <ThemedText style={styles.cardStat}>Ready</ThemedText>
            </TouchableOpacity>
        </View>

        {/* System Info / Features - Minimalist List */}
        <View style={styles.section}>
            <ThemedText type="defaultSemiBold" style={styles.sectionHeader}>SYSTEM STATUS</ThemedText>
            
            <View style={styles.row}>
                <View style={styles.rowLeft}>
                    <Ionicons name="shield-checkmark-outline" size={20} color={TechNoir.colors.icon} />
                    <ThemedText style={styles.rowText}>Offline Privacy</ThemedText>
                </View>
                <ThemedText style={styles.rowValue}>ACTIVE</ThemedText>
            </View>
             <View style={styles.separator} />
            <View style={styles.row}>
                <View style={styles.rowLeft}>
                    <Ionicons name="flash-outline" size={20} color={TechNoir.colors.icon} />
                    <ThemedText style={styles.rowText}>Whisper Engine</ThemedText>
                </View>
                <ThemedText style={styles.rowValue}>V3.0</ThemedText>
            </View>
             <View style={styles.separator} />
             <View style={styles.row}>
                <View style={styles.rowLeft}>
                    <Ionicons name="document-text-outline" size={20} color={TechNoir.colors.icon} />
                    <ThemedText style={styles.rowText}>Export Format</ThemedText>
                </View>
                <ThemedText style={styles.rowValue}>JSON / SRT</ThemedText>
            </View>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: TechNoir.colors.background,
    paddingTop: 60,
  },
  header: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  date: {
    textTransform: 'uppercase',
    color: TechNoir.colors.textSecondary,
    fontSize: 12,
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  greeting: {
    fontSize: 36,
    letterSpacing: -1.5,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  primaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 24,
    padding: 24,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#333',
  },
  recordIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  primaryTextContainer: {
    flex: 1,
  },
  primaryTitle: {
    fontSize: 18,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  primarySubtitle: {
    color: TechNoir.colors.textSecondary,
    fontSize: 13,
  },
  grid: {
    flexDirection: 'row',
    marginBottom: 40,
    justifyContent: 'space-between',
  },
  card: {
    flex: 1,
    backgroundColor: '#111',
    borderRadius: 20,
    padding: 20,
    marginRight: 16,
    borderWidth: 1,
    borderColor: '#222',
  },
  cardIcon: {
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    color: '#FFF',
    marginBottom: 4,
    fontWeight: '600',
  },
  cardStat: {
    fontSize: 12,
    color: '#666',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    fontSize: 12,
    color: '#666',
    marginBottom: 16,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowText: {
    fontSize: 16,
    fontWeight: '500',
  },
  rowValue: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  separator: {
    height: 1,
    backgroundColor: '#222',
  },
});
