import { Colors } from "@/constants/theme";
import { MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
    cancelAnimation,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withSpring,
    withTiming,
} from "react-native-reanimated";

const T = Colors.dark;

interface RecorderButtonProps {
  isRecording: boolean;
  isPaused: boolean;
  isProcessing?: boolean;
  onStartPress: () => void;
  onStopPress: () => void;
  onPausePress: () => void;
  onResumePress: () => void;
}

/** Pulsing ring around the main button while actively recording */
const PulseRing: React.FC<{ active: boolean }> = ({ active }) => {
  const scale   = useSharedValue(1);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (active) {
      // No Easing import — withTiming default easing is worklet-safe
      scale.value = withRepeat(
        withSequence(
          withTiming(1.5, { duration: 900 }),
          withTiming(1,   { duration: 900 }),
        ),
        -1,
        false,
      );
      opacity.value = withRepeat(
        withSequence(
          withTiming(0,   { duration: 900 }),
          withTiming(0.5, { duration: 900 }),
        ),
        -1,
        false,
      );
    } else {
      cancelAnimation(scale);
      cancelAnimation(opacity);
      scale.value   = withTiming(1, { duration: 200 });
      opacity.value = withTiming(0, { duration: 200 });
    }
  }, [active]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity:   opacity.value,
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.pulseRing, style]}
    />
  );
};

/** Button with spring scale feedback on press */
const AnimatedBtn: React.FC<{
  onPress: () => void;
  btnStyle: object;
  haptic?: "light" | "medium" | "heavy" | "success";
  children: React.ReactNode;
}> = ({ onPress, btnStyle, haptic = "light", children }) => {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    scale.value = withSequence(
      withTiming(0.88, { duration: 80 }),
      withSpring(1, { damping: 12, stiffness: 300 }),
    );
    if (haptic === "success") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else if (haptic === "heavy") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } else if (haptic === "medium") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  };

  return (
    <Animated.View style={animStyle}>
      <Pressable onPress={handlePress} style={btnStyle}>
        {children}
      </Pressable>
    </Animated.View>
  );
};

export const RecorderButton: React.FC<RecorderButtonProps> = ({
  isRecording,
  isPaused,
  isProcessing = false,
  onStartPress,
  onStopPress,
  onPausePress,
  onResumePress,
}) => {
  const activeRecording = isRecording && !isPaused;

  // Haptics on state transitions
  useEffect(() => {
    if (isRecording && !isPaused) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [isRecording]);

  useEffect(() => {
    if (isPaused) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }, [isPaused]);

  if (!isRecording) {
    return (
      <View style={styles.centerWrap}>
        <PulseRing active={false} />
        <AnimatedBtn
          onPress={onStartPress}
          haptic="success"
          btnStyle={[styles.micBtn, { borderColor: T.accent }]}
        >
          <MaterialIcons name="mic" size={32} color={T.accent} />
        </AnimatedBtn>
      </View>
    );
  }

  return (
    <View style={styles.controlsRow}>
      {/* Pause / Resume */}
      <AnimatedBtn
        onPress={isPaused ? onResumePress : onPausePress}
        haptic="medium"
        btnStyle={[
          styles.secondaryBtn,
          { borderColor: isPaused ? T.accent : T.borderStrong },
        ]}
      >
        <MaterialIcons
          name={isPaused ? "play-arrow" : "pause"}
          size={26}
          color={isPaused ? T.accent : T.accentSoft}
        />
      </AnimatedBtn>

      {/* Stop button with pulse ring */}
      <View style={styles.centerWrap}>
        <PulseRing active={activeRecording} />
        <AnimatedBtn
          onPress={onStopPress}
          haptic="heavy"
          btnStyle={[styles.micBtn, { borderColor: T.danger }]}
        >
          <MaterialIcons name="stop" size={32} color={T.danger} />
        </AnimatedBtn>
      </View>

      {/* Symmetric slot — shows sync icon while processing */}
      <View style={[styles.secondaryBtn, { borderColor: "transparent", backgroundColor: "transparent" }]}>
        {isProcessing && (
          <MaterialIcons name="sync" size={22} color={T.textFaint} />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  centerWrap: {
    width:          80,
    height:         80,
    alignItems:     "center",
    justifyContent: "center",
  },
  pulseRing: {
    position:     "absolute",
    width:        80,
    height:       80,
    borderRadius: 40,
    borderWidth:  2,
    borderColor:  T.accent,
  },
  micBtn: {
    width:           70,
    height:          70,
    borderRadius:    35,
    borderWidth:     2,
    backgroundColor: T.surface,
    alignItems:      "center",
    justifyContent:  "center",
  },
  controlsRow: {
    flexDirection:  "row",
    alignItems:     "center",
    justifyContent: "center",
    gap:            24,
  },
  secondaryBtn: {
    width:           52,
    height:          52,
    borderRadius:    26,
    borderWidth:     1,
    backgroundColor: T.surface,
    alignItems:      "center",
    justifyContent:  "center",
  },
});
