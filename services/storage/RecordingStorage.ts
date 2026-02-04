/**
 * RecordingStorage - Manage and list audio recordings
 * Helps debug recording issues by showing saved recordings
 */

import * as FileSystem from "expo-file-system";

export interface RecordingInfo {
    uri: string;
    filename: string;
    size: number;
    sizeFormatted: string;
    modificationTime: number;
    modificationTimeFormatted: string;
    extension: string;
}

class RecordingStorage {
    private readonly audioDirectory = `${FileSystem.cacheDirectory}Audio/`;

    /**
     * Get list of all recordings in the cache directory
     */
    async listRecordings(): Promise<RecordingInfo[]> {
        try {
            // Check if Audio directory exists
            const dirInfo = await FileSystem.getInfoAsync(this.audioDirectory);
            if (!dirInfo.exists) {
                console.log("📁 Audio directory does not exist yet");
                return [];
            }

            // Read directory contents
            const files = await FileSystem.readDirectoryAsync(this.audioDirectory);
            console.log(`📁 Found ${files.length} files in Audio directory`);

            // Get info for each file
            const recordings: RecordingInfo[] = [];
            for (const filename of files) {
                try {
                    const uri = `${this.audioDirectory}${filename}`;
                    const info = await FileSystem.getInfoAsync(uri);

                    if (info.exists && "size" in info) {
                        const extension = filename.split(".").pop()?.toLowerCase() || "unknown";
                        const modTime = info.modificationTime || Date.now() / 1000;

                        recordings.push({
                            uri,
                            filename,
                            size: info.size,
                            sizeFormatted: this.formatSize(info.size),
                            modificationTime: modTime,
                            modificationTimeFormatted: this.formatTime(modTime),
                            extension,
                        });
                    }
                } catch (err) {
                    console.error(`❌ Error getting info for ${filename}:`, err);
                }
            }

            // Sort by modification time (newest first)
            recordings.sort((a, b) => b.modificationTime - a.modificationTime);

            return recordings;
        } catch (error) {
            console.error("❌ Error listing recordings:", error);
            return [];
        }
    }

    /**
     * Delete a recording
     */
    async deleteRecording(uri: string): Promise<boolean> {
        try {
            await FileSystem.deleteAsync(uri, { idempotent: true });
            console.log(`🗑️ Deleted recording: ${uri}`);
            return true;
        } catch (error) {
            console.error("❌ Error deleting recording:", error);
            return false;
        }
    }

    /**
     * Delete all recordings
     */
    async deleteAllRecordings(): Promise<number> {
        try {
            const recordings = await this.listRecordings();
            let deleted = 0;

            for (const recording of recordings) {
                if (await this.deleteRecording(recording.uri)) {
                    deleted++;
                }
            }

            console.log(`🗑️ Deleted ${deleted} recordings`);
            return deleted;
        } catch (error) {
            console.error("❌ Error deleting all recordings:", error);
            return 0;
        }
    }

    /**
     * Get total size of all recordings
     */
    async getTotalSize(): Promise<{ bytes: number; formatted: string }> {
        const recordings = await this.listRecordings();
        const totalBytes = recordings.reduce((sum, r) => sum + r.size, 0);
        return {
            bytes: totalBytes,
            formatted: this.formatSize(totalBytes),
        };
    }

    /**
     * Format bytes to human readable
     */
    private formatSize(bytes: number): string {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }

    /**
     * Format timestamp to human readable
     */
    private formatTime(timestamp: number): string {
        const date = new Date(timestamp * 1000);
        return date.toLocaleString();
    }
}

export default new RecordingStorage();
