import { Audio } from "expo-av";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSharedValue, withSpring } from "react-native-reanimated";
import { fileStorageService } from "../services/fileStorage";
import { AudioRecorderState } from "../types";

export const useAudioRecorder = () => {
  const [state, setState] = useState<AudioRecorderState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
    metering: 0,
  });

  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const lastStatusUpdateRef = useRef<number>(0);

  // Animated wave value
  const waveValue = useSharedValue(0);

  // Request permissions
  const requestPermissions = useCallback(async () => {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        console.error("Audio recording permission denied");
        return false;
      }

      // Set audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: true,
      });

      // Initialize storage
      await fileStorageService.initializeStorage();
      return true;
    } catch (error) {
      console.error("Error requesting permissions:", error);
      return false;
    }
  }, []);

  // Handle status updates from the recording
  const onRecordingStatusUpdate = useCallback((status: Audio.RecordingStatus) => {
    if (status.canRecord) {
      const currentDuration = status.durationMillis;
      
      // Update duration state only if it changed significantly (every 100ms)
      // to avoid excessive re-renders while keeping UI responsive
      if (Math.abs(currentDuration - lastStatusUpdateRef.current) >= 100) {
        lastStatusUpdateRef.current = currentDuration;
        setState((prev) => ({
          ...prev,
          duration: currentDuration,
          isRecording: true, // Session is active if we can record
          isPaused: !status.isRecording,
        }));
      }

      // Update metering/waveform
      if (status.metering !== undefined) {
        const normalized = Math.min(
          1,
          Math.max(0, (status.metering + 160) / 160),
        );
        setState((prev) => ({
          ...prev,
          metering: normalized,
        }));
        waveValue.value = withSpring(normalized);
      }
    }
  }, [waveValue]);

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      if (recordingRef.current) {
        await recordingRef.current.stopAndUnloadAsync();
        recordingRef.current = null;
      }

      // Ensure audio mode is correct before starting
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
        onRecordingStatusUpdate,
        100 // Status update interval
      );
      
      recordingRef.current = recording;
      lastStatusUpdateRef.current = 0;

      setState({
        isRecording: true,
        isPaused: false,
        duration: 0,
        metering: 0,
      });

    } catch (error) {
      console.error("Error starting recording:", error);
    }
  }, [onRecordingStatusUpdate]);

  // Stop recording
  const stopRecording = useCallback(async () => {
    try {
      if (!recordingRef.current) {
        return null;
      }

      const recording = recordingRef.current;
      const status = await recording.getStatusAsync();
      const finalDuration = status.canRecord ? status.durationMillis : lastStatusUpdateRef.current;
      const uri = recording.getURI();

      await recording.stopAndUnloadAsync();
      recordingRef.current = null;

      setState({
        isRecording: false,
        isPaused: false,
        duration: 0,
        metering: 0,
      });

      waveValue.value = withSpring(0);

      if (uri) {
        // Save recording to permanent storage
        const metadata = await fileStorageService.saveRecording(
          uri,
          undefined,
          finalDuration,
        );
        return metadata;
      }

      return null;
    } catch (error) {
      console.error("Error stopping recording:", error);
      // Even if it fails, try to clean up
      recordingRef.current = null;
      return null;
    }
  }, [waveValue]);

  // Pause recording
  const pauseRecording = useCallback(async () => {
    try {
      if (recordingRef.current) {
        await recordingRef.current.pauseAsync();
        setState((prev) => ({
          ...prev,
          isPaused: true,
          isRecording: true, // Stay active
        }));
      }
    } catch (error) {
      console.error("Error pausing recording:", error);
    }
  }, []);

  // Resume recording
  const resumeRecording = useCallback(async () => {
    try {
      if (recordingRef.current) {
        await recordingRef.current.startAsync();
        setState((prev) => ({
          ...prev,
          isPaused: false,
          isRecording: true,
        }));
      }
    } catch (error) {
      console.error("Error resuming recording:", error);
    }
  }, []);

  // Play recording
  const playRecording = useCallback(async (uri: string) => {
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
      }

      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true }
      );
      soundRef.current = sound;
    } catch (error) {
      console.error("Error playing recording:", error);
    }
  }, []);

  // Stop playback
  const stopPlayback = useCallback(async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.stopAsync();
      }
    } catch (error) {
      console.error("Error stopping playback:", error);
    }
  }, []);

  // Format duration
  const formatDuration = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
      }
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
      }
    };
  }, []);

  return {
    state,
    requestPermissions,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    playRecording,
    stopPlayback,
    formatDuration,
    waveValue,
  };
};

