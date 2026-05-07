import AsyncStorage from "@react-native-async-storage/async-storage";
import { RecordingMetadata } from "../types";

const METADATA_KEY = "@audio_recordings_metadata";

export const fileStorageService = {
  async initializeStorage() {
    // NOTE: Intentionally empty. 
    // The expo-file-system native module is currently completely broken in this build
    // (crashing with java.lang.NoClassDefFoundError for FilePermissionService).
    // We will bypass it completely and rely on the cache directory.
  },

  async saveRecording(
    tempUri: string,
    title?: string,
    duration?: number,
  ): Promise<RecordingMetadata> {
    try {
      // Generate a filename from the URI
      const filename = tempUri.split('/').pop() || `recording_${new Date().getTime()}.m4a`;

      // Since expo-file-system crashes on copy/move, we will simply keep the file 
      // in the cache directory where expo-av created it, and save its reference.
      const metadata: RecordingMetadata = {
        id: filename,
        filename,
        fileUri: tempUri, // Storing the cache URI directly
        duration: duration || 0,
        createdAt: new Date().toISOString(),
        title: title || `Recording ${new Date().toLocaleDateString()}`,
        tags: [],
        mimeType: "audio/mp4",
        fileSize: 0, // Unable to safely get size without FileSystem
      };

      // Save metadata to AsyncStorage
      await this.saveMetadata(metadata);

      return metadata;
    } catch (error) {
      console.error("Error saving recording:", error);
      throw error;
    }
  },

  async saveMetadata(metadata: RecordingMetadata) {
    try {
      const allMetadata = await this.getAllMetadata();
      allMetadata[metadata.id] = metadata;
      await AsyncStorage.setItem(METADATA_KEY, JSON.stringify(allMetadata));
    } catch (error) {
      console.error("Error saving metadata:", error);
      throw error;
    }
  },

  async getAllMetadata(): Promise<Record<string, RecordingMetadata>> {
    try {
      const data = await AsyncStorage.getItem(METADATA_KEY);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error("Error retrieving metadata:", error);
      return {};
    }
  },

  async getRecordings(): Promise<RecordingMetadata[]> {
    try {
      const metadata = await this.getAllMetadata();
      return Object.values(metadata).sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    } catch (error) {
      console.error("Error getting recordings:", error);
      return [];
    }
  },

  async deleteRecording(id: string): Promise<void> {
    try {
      const metadata = await this.getAllMetadata();
      const recording = metadata[id];

      if (recording) {
        // Skip physical file deletion to avoid expo-file-system crashes.
        // The OS will eventually clear the cache directory anyway.
        
        // Delete metadata
        delete metadata[id];
        await AsyncStorage.setItem(METADATA_KEY, JSON.stringify(metadata));
      }
    } catch (error) {
      console.error("Error deleting recording:", error);
      throw error;
    }
  },

  async updateMetadata(
    id: string,
    updates: Partial<RecordingMetadata>,
  ): Promise<void> {
    try {
      const metadata = await this.getAllMetadata();
      if (metadata[id]) {
        metadata[id] = { ...metadata[id], ...updates };
        await AsyncStorage.setItem(METADATA_KEY, JSON.stringify(metadata));
      }
    } catch (error) {
      console.error("Error updating metadata:", error);
      throw error;
    }
  },

  async clearAllRecordings(): Promise<void> {
    try {
      const recordings = await this.getRecordings();
      for (const recording of recordings) {
        await this.deleteRecording(recording.id);
      }
    } catch (error) {
      console.error("Error clearing recordings:", error);
      throw error;
    }
  },

  getRecordingsDirectory(): string {
    return "cache_directory"; // Dummy return as we don't use it directly anymore
  },
};



