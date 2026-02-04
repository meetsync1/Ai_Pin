import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import {
  Animated,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const { width } = Dimensions.get("window");

export default function HomeScreen() {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const animatePress = (callback: () => void) => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start(callback);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Header with Gradient */}
      <LinearGradient
        colors={["#667eea", "#764ba2"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Text style={styles.logoEmoji}>🤖</Text>
          <Text style={styles.logoText}>AI Notes</Text>
          <Text style={styles.tagline}>On-Device AI Assistant</Text>
        </View>

        {/* Decorative Elements */}
        <View style={styles.decorativeCircle1} />
        <View style={styles.decorativeCircle2} />
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.primaryCard}
            activeOpacity={0.9}
            onPress={() => animatePress(() => router.push("/transcribe"))}
          >
            <LinearGradient
              colors={["#11998e", "#38ef7d"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.primaryCardGradient}
            >
              <Text style={styles.primaryCardEmoji}>🎤</Text>
              <Text style={styles.primaryCardTitle}>Start Transcribing</Text>
              <Text style={styles.primaryCardDescription}>
                Record audio and get real-time transcription
              </Text>
              <View style={styles.arrowContainer}>
                <Text style={styles.arrow}>→</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.secondaryCards}>
            <TouchableOpacity
              style={styles.secondaryCard}
              activeOpacity={0.9}
              onPress={() => router.push("/history")}
            >
              <LinearGradient
                colors={["#6366f1", "#8b5cf6"]}
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
              onPress={() => {
                // @ts-ignore - route might not exist yet
                router.push("/summarize");
              }}
            >
              <LinearGradient
                colors={["#f59e0b", "#ef4444"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.secondaryCardGradient}
              >
                <Text style={styles.secondaryCardEmoji}>📝</Text>
                <Text style={styles.secondaryCardTitle}>Summarize</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* Features Section */}
        <View style={styles.featuresSection}>
          <Text style={styles.sectionTitle}>✨ Features</Text>

          <View style={styles.featuresList}>
            <FeatureItem
              emoji="🔒"
              title="100% Offline"
              description="Complete privacy, no internet required"
            />
            <FeatureItem
              emoji="⚡"
              title="Real-time"
              description="Live transcription as you speak"
            />
            <FeatureItem
              emoji="💾"
              title="Auto-save"
              description="JSON & SRT formats automatically"
            />
            <FeatureItem
              emoji="🆓"
              title="No API Costs"
              description="Everything runs on your device"
            />
          </View>
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Powered by AI</Text>
          <Text style={styles.infoDescription}>
            Using Whisper for transcription and Qwen for summarization.
            All processing happens locally on your device for maximum privacy.
          </Text>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

// Feature Item Component
function FeatureItem({
  emoji,
  title,
  description,
}: {
  emoji: string;
  title: string;
  description: string;
}) {
  return (
    <View style={styles.featureItem}>
      <View style={styles.featureIcon}>
        <Text style={styles.featureEmoji}>{emoji}</Text>
      </View>
      <View style={styles.featureContent}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDescription}>{description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f0f23",
  },
  header: {
    height: 220,
    paddingTop: 50,
    paddingHorizontal: 24,
    overflow: "hidden",
  },
  headerContent: {
    zIndex: 10,
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
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 4,
  },
  decorativeCircle1: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    top: -50,
    right: -50,
  },
  decorativeCircle2: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    bottom: -30,
    right: 50,
  },
  content: {
    flex: 1,
    marginTop: -30,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  quickActions: {
    gap: 16,
  },
  primaryCard: {
    borderRadius: 20,
    overflow: "hidden",
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
    minHeight: 120,
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
  featuresSection: {
    marginTop: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 16,
  },
  featuresList: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 16,
    padding: 8,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 16,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  featureEmoji: {
    fontSize: 24,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.6)",
  },
  infoCard: {
    marginTop: 24,
    backgroundColor: "rgba(102, 126, 234, 0.15)",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(102, 126, 234, 0.3)",
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#667eea",
    marginBottom: 8,
  },
  infoDescription: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.7)",
    lineHeight: 22,
  },
  bottomSpacer: {
    height: 20,
  },
});
