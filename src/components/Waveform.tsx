import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
    cancelAnimation,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withRepeat,
    withSequence,
    withTiming,
    type SharedValue
} from "react-native-reanimated";

interface WaveformProps {
  value: SharedValue<number>;
  color?: string;
  numberOfBars?: number;
  /** When true each bar runs a gentle idle pulse */
  idleAnimate?: boolean;
}

const Bar: React.FC<{
  index: number;
  totalBars: number;
  value: SharedValue<number>;
  color: string;
  idleAnimate: boolean;
}> = ({ index, totalBars, value, color, idleAnimate }) => {
  const height = useSharedValue(4);

  useEffect(() => {
    if (!idleAnimate) {
      cancelAnimation(height);
      height.value = withTiming(4, { duration: 200 });
      return;
    }
    // Staggered idle breathe — no Easing, just withTiming default (ease in/out)
    const delayMs = (index / totalBars) * 500;
    height.value = withDelay(
      delayMs,
      withRepeat(
        withSequence(
          withTiming(10, { duration: 500 }),
          withTiming(3,  { duration: 500 }),
        ),
        -1,
        true,
      ),
    );
    return () => {
      cancelAnimation(height);
    };
  }, [idleAnimate]);

  const animStyle = useAnimatedStyle(() => {
    const distance  = Math.abs(index - totalBars / 2);
    const influence = 1 - distance / (totalBars / 2 || 1);
    const phase     = index % 2 === 0 ? 1 : 0.75; // alternating height multiplier

    // Live metering overrides idle
    if (value.value > 0.02) {
      const liveH = 3 + value.value * 46 * (influence * 0.6 + 0.4) * phase;
      return { height: liveH };
    }
    return { height: height.value };
  });

  return (
    <Animated.View
      style={[styles.bar, { backgroundColor: color }, animStyle]}
    />
  );
};

export const Waveform: React.FC<WaveformProps> = ({
  value,
  color = "#FF5500",
  numberOfBars = 40,
  idleAnimate  = false,
}) => {
  const bars = Array.from({ length: numberOfBars }, (_, i) => i);
  return (
    <View style={styles.container}>
      {bars.map((_, index) => (
        <Bar
          key={index}
          index={index}
          totalBars={numberOfBars}
          value={value}
          color={color}
          idleAnimate={idleAnimate}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection:  "row",
    alignItems:     "center",
    justifyContent: "center",
    gap:            2.5,
    height:         56,
  },
  bar: {
    width:        2,
    borderRadius: 1,
    minHeight:    3,
  },
});
