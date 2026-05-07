import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface RecorderButtonProps {
  isRecording: boolean;
  isPaused: boolean;
  onStartPress: () => void;
  onStopPress: () => void;
  onPausePress: () => void;
  onResumePress: () => void;
}

export const RecorderButton: React.FC<RecorderButtonProps> = ({
  isRecording,
  isPaused,
  onStartPress,
  onStopPress,
  onPausePress,
  onResumePress,
}) => {

  if (!isRecording) {
    return (
      <Pressable
        onPress={onStartPress}
        style={({ pressed }) => [
          styles.recordButton,
          { opacity: pressed ? 0.8 : 1 },
        ]}
      >
        <MaterialIcons name="mic" size={32} color="white" />
      </Pressable>
    );
  }

  return (
    <View style={styles.controlsContainer}>
      {!isPaused ? (
        <Pressable
          onPress={onPausePress}
          style={({ pressed }) => [
            styles.pauseButton,
            { opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <MaterialIcons name="pause" size={28} color="white" />
        </Pressable>
      ) : (
        <Pressable
          onPress={onResumePress}
          style={({ pressed }) => [
            styles.pauseButton,
            { opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <MaterialIcons name="play-arrow" size={28} color="white" />
        </Pressable>
      )}

      <Pressable
        onPress={onStopPress}
        style={({ pressed }) => [
          styles.stopButton,
          { opacity: pressed ? 0.8 : 1 },
        ]}
      >
        <MaterialIcons name="stop" size={28} color="white" />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  recordButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  controlsContainer: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pauseButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f59e0b',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  stopButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#dc2626',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});
