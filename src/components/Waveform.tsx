import React from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
    Extrapolate,
    interpolate,
    useAnimatedStyle,
    type SharedValue,
} from "react-native-reanimated";

interface WaveformProps {
  value: SharedValue<number>;
  color?: string;
  numberOfBars?: number;
}

export const Waveform: React.FC<WaveformProps> = ({
  value,
  color = "#3b82f6",
  numberOfBars = 40,
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
        />
      ))}
    </View>
  );
};

const Bar: React.FC<{
  index: number;
  totalBars: number;
  value: SharedValue<number>;
  color: string;
}> = ({ index, totalBars, value, color }) => {
  const animatedStyle = useAnimatedStyle(() => {
    const distance = Math.abs(index - totalBars / 2);
    const maxDistance = totalBars / 2;
    const influence = 1 - distance / maxDistance;

    const heightValue = interpolate(
      value.value,
      [0, 1],
      [4, 40],
      Extrapolate.CLAMP,
    );

    return {
      height: heightValue * influence,
    };
  });

  return (
    <Animated.View
      style={[
        styles.bar,
        {
          backgroundColor: color,
        },
        animatedStyle,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    height: 50,
  },
  bar: {
    width: 2,
    borderRadius: 1,
  },
});
