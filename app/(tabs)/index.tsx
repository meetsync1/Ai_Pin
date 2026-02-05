import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React from "react";
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <LinearGradient
        colors={["#667eea", "#764ba2"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Text style={styles.logoEmoji}>🤖</Text>
        <Text style={styles.logoText}>AI Notes</Text>
        <Text style={styles.tagline}>On-Device Voice Transcription</Text>
      </LinearGradient>

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Main Action Card */}
        <TouchableOpacity
          style={styles.primaryCard}
          activeOpacity={0.9}
          onPress={() => router.push("/transcribe")}
        >
          <LinearGradient
            colors={["#11998e", "#38ef7d"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.primaryCardGradient}
          >
            <Text style={styles.primaryCardEmoji}>🎤</Text>
            <Text style={styles.primaryCardTitle}>Start Recording</Text>
            <Text style={styles.primaryCardDescription}>
              Record audio and get real-time transcription powered by Whisper AI
            </Text>
            <View style={styles.arrowContainer}>
              <Text style={styles.arrow}>→</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Secondary Cards Row */}
        <View style={styles.secondaryCards}>
          <TouchableOpacity
            style={styles.secondaryCard}
            activeOpacity={0.9}
            onPress={() => router.push("/history")}
          >
            <LinearGradient
              colors={["#667eea", "#764ba2"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.secondaryCardGradient}
            >
              <Text style={styles.secondaryCardEmoji}>📚</Text>
              <Text style={styles.secondaryCardTitle}>History</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryCard}
            activeOpacity={0.9}
            onPress={() => router.push("/summarize")}
          >
            <LinearGradient
              colors={["#f59e0b", "#ef4444"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.secondaryCardGradient}
            >
              <Text style={styles.secondaryCardEmoji}>🤖</Text>
              <Text style={styles.secondaryCardTitle}>Summarize</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Pipeline Info */}
        <View style={styles.pipelineSection}>
          <Text style={styles.sectionTitle}>How It Works</Text>

          <View style={styles.pipelineSteps}>
            <View style={styles.pipelineStep}>
              <View style={[styles.stepIcon, { backgroundColor: "#E8F5E9" }]}>
                <Text style={styles.stepEmoji}>🎤</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>1. Record</Text>
                <Text style={styles.stepDescription}>Speak into your phone</Text>
              </View>
            </View>

            <View style={styles.pipelineArrow}>
              <Text style={styles.pipelineArrowText}>↓</Text>
            </View>

            <View style={styles.pipelineStep}>
              <View style={[styles.stepIcon, { backgroundColor: "#E3F2FD" }]}>
                <Text style={styles.stepEmoji}>📝</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>2. Transcribe</Text>
                <Text style={styles.stepDescription}>Whisper AI converts speech to text</Text>
              </View>
            </View>

            <View style={styles.pipelineArrow}>
              <Text style={styles.pipelineArrowText}>↓</Text>
            </View>

            <View style={styles.pipelineStep}>
              <View style={[styles.stepIcon, { backgroundColor: "#FFF3E0" }]}>
                <Text style={styles.stepEmoji}>🤖</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>3. Summarize</Text>
                <Text style={styles.stepDescription}>Qwen AI generates summary</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Features Section */}
        <View style={styles.featuresSection}>
          <Text style={styles.sectionTitle}>Features</Text>

          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>🔒</Text>
              <Text style={styles.featureText}>100% Offline - Complete Privacy</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>⚡</Text>
              <Text style={styles.featureText}>Real-time Transcription</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>📄</Text>
              <Text style={styles.featureText}>Export to JSON & SRT</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>🧠</Text>
              <Text style={styles.featureText}>AI-Powered Summaries</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f0f23",
  },
  header: {
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  logoEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  logoText: {
    fontSize: 32,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 4,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  primaryCard: {
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 16,
    elevation: 8,
    shadowColor: "#11998e",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  primaryCardGradient: {
    padding: 24,
    minHeight: 160,
  },
  primaryCardEmoji: {
    fontSize: 40,
    marginBottom: 12,
  },
  primaryCardTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 8,
  },
  primaryCardDescription: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
    lineHeight: 20,
  },
  arrowContainer: {
    position: "absolute",
    right: 24,
    bottom: 24,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  arrow: {
    fontSize: 24,
    color: "#fff",
    fontWeight: "bold",
  },
  secondaryCards: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 24,
  },
  secondaryCard: {
    flex: 1,
    borderRadius: 16,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  secondaryCardGradient: {
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 100,
  },
  secondaryCardEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  secondaryCardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  pipelineSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 16,
  },
  pipelineSteps: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 16,
    padding: 16,
  },
  pipelineStep: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  stepIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  stepEmoji: {
    fontSize: 24,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 2,
  },
  stepDescription: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.6)",
  },
  pipelineArrow: {
    paddingLeft: 20,
    paddingVertical: 4,
  },
  pipelineArrowText: {
    fontSize: 20,
    color: "rgba(255, 255, 255, 0.3)",
  },
  featuresSection: {
    marginBottom: 24,
  },
  featuresList: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  featureIcon: {
    fontSize: 20,
  },
  featureText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
  },
});
