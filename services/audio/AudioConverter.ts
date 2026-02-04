/**
 * AudioConverter - Convert audio files to Whisper-compatible format
 * 
 * Note: For full conversion support, install ffmpeg-kit-react-native
 * Currently operates in pass-through mode, letting whisper.rn try to decode the audio
 */

import * as FileSystem from "expo-file-system";

/**
 * Convert audio file to WAV format compatible with Whisper
 * Requirements: 16kHz sample rate, mono channel, 16-bit PCM
 * 
 * Without ffmpeg-kit-react-native, this will return the original path
 * and let whisper.rn attempt to decode the audio directly
 */
export async function convertToWav(inputPath: string): Promise<string> {
    console.log(`🔄 Audio conversion requested for: ${inputPath}`);

    // Check if ffmpeg-kit is available
    try {
        // Try to dynamically import ffmpeg-kit
        const { FFmpegKit, ReturnCode } = await import("ffmpeg-kit-react-native");

        // Generate output path
        const timestamp = Date.now();
        const outputPath = `${FileSystem.cacheDirectory}audio_converted_${timestamp}.wav`;

        console.log(`🎬 Converting with FFmpeg...`);
        console.log(`   Input: ${inputPath}`);
        console.log(`   Output: ${outputPath}`);

        // FFmpeg command to convert to Whisper-compatible format
        const command = `-i "${inputPath}" -ar 16000 -ac 1 -c:a pcm_s16le -y "${outputPath}"`;

        const session = await FFmpegKit.execute(command);
        const returnCode = await session.getReturnCode();

        if (ReturnCode.isSuccess(returnCode)) {
            console.log(`✅ Audio conversion successful!`);

            const outputInfo = await FileSystem.getInfoAsync(outputPath);
            if (outputInfo.exists && "size" in outputInfo) {
                console.log(`📦 Converted file size: ${(outputInfo.size / 1024).toFixed(2)} KB`);
            }

            return outputPath;
        } else {
            console.warn(`⚠️ FFmpeg conversion failed, using original file`);
            return inputPath;
        }
    } catch (error) {
        // FFmpeg not available - use pass-through mode
        console.log(`ℹ️ FFmpeg not available - whisper.rn will try to decode M4A directly`);
        console.log(`ℹ️ If transcription fails, install: npm install ffmpeg-kit-react-native`);
        return inputPath;
    }
}

/**
 * Check if audio file needs conversion
 * Returns true if file is not already in WAV format
 */
export function needsConversion(filePath: string): boolean {
    const lowerPath = filePath.toLowerCase();
    // M4A, AAC, MP3, and other compressed formats ideally need conversion
    return !lowerPath.endsWith(".wav");
}

/**
 * Get audio file details for debugging
 */
export async function getAudioInfo(filePath: string): Promise<{
    exists: boolean;
    size: number;
    extension: string;
    needsConversion: boolean;
}> {
    const info = await FileSystem.getInfoAsync(filePath);
    const extension = filePath.split(".").pop()?.toLowerCase() || "unknown";

    return {
        exists: info.exists,
        size: info.exists && "size" in info ? info.size : 0,
        extension,
        needsConversion: needsConversion(filePath),
    };
}

export default {
    convertToWav,
    needsConversion,
    getAudioInfo,
};
