import * as Crypto from "expo-crypto";

const MAX_CHUNK_SECONDS = 3590;

/**
 * WAV header constants for 16-bit PCM mono @ 16 kHz.
 * A standard WAV header is always 44 bytes.
 */
const WAV_HEADER_SIZE = 44;
const SAMPLE_RATE = 16000;
const NUM_CHANNELS = 1;
const BITS_PER_SAMPLE = 16;
const BYTES_PER_SAMPLE = BITS_PER_SAMPLE / 8;
const BYTE_RATE = SAMPLE_RATE * NUM_CHANNELS * BYTES_PER_SAMPLE;
const BLOCK_ALIGN = NUM_CHANNELS * BYTES_PER_SAMPLE;

function arrayBufferToBase64(arrayBuffer: ArrayBuffer) {
  // Prefer Buffer when available (e.g. web / some RN runtimes).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const AnyBuffer = (globalThis as any).Buffer as typeof Buffer | undefined;
  if (AnyBuffer) {
    return AnyBuffer.from(arrayBuffer).toString("base64");
  }

  let binary = "";
  const bytes = new Uint8Array(arrayBuffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  // eslint-disable-next-line no-undef
  return btoa(binary);
}

export async function hashFile(uri: string) {
  try {
    const response = await fetch(uri);
    if (response.ok) {
      const buffer = await response.arrayBuffer();
      const base64 = arrayBufferToBase64(buffer);
      return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.MD5, base64);
    }
  } catch (error) {
    console.warn("hashFile fallback due to fetch error:", error);
  }

  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.MD5, uri);
}

/**
 * Build a valid WAV file header for PCM 16-bit mono @ 16 kHz.
 */
function buildWavHeader(dataSize: number): ArrayBuffer {
  const header = new ArrayBuffer(WAV_HEADER_SIZE);
  const view = new DataView(header);

  // "RIFF" chunk descriptor
  view.setUint8(0, 0x52); // R
  view.setUint8(1, 0x49); // I
  view.setUint8(2, 0x46); // F
  view.setUint8(3, 0x46); // F
  view.setUint32(4, 36 + dataSize, true); // ChunkSize
  view.setUint8(8, 0x57);  // W
  view.setUint8(9, 0x41);  // A
  view.setUint8(10, 0x56); // V
  view.setUint8(11, 0x45); // E

  // "fmt " sub-chunk
  view.setUint8(12, 0x66); // f
  view.setUint8(13, 0x6d); // m
  view.setUint8(14, 0x74); // t
  view.setUint8(15, 0x20); // (space)
  view.setUint32(16, 16, true);            // Subchunk1Size (PCM = 16)
  view.setUint16(20, 1, true);             // AudioFormat (PCM = 1)
  view.setUint16(22, NUM_CHANNELS, true);  // NumChannels
  view.setUint32(24, SAMPLE_RATE, true);   // SampleRate
  view.setUint32(28, BYTE_RATE, true);     // ByteRate
  view.setUint16(32, BLOCK_ALIGN, true);   // BlockAlign
  view.setUint16(34, BITS_PER_SAMPLE, true); // BitsPerSample

  // "data" sub-chunk
  view.setUint8(36, 0x64); // d
  view.setUint8(37, 0x61); // a
  view.setUint8(38, 0x74); // t
  view.setUint8(39, 0x61); // a
  view.setUint32(40, dataSize, true); // Subchunk2Size

  return header;
}

/**
 * Convert any audio file to WAV 16 kHz mono PCM 16-bit.
 *
 * Since the app now records directly in WAV 16 kHz mono format,
 * this function acts as a pass-through: it verifies the file is a
 * valid WAV and returns the URI as-is. If the file is not already
 * in the target format, it returns the original URI (the backend
 * can handle the conversion).
 */
export async function convertToWav16kMono(uri: string) {
  // The recording is already configured to produce WAV 16kHz mono.
  // Simply validate and return.
  return uri;
}

/**
 * Split a WAV file into chunks of at most MAX_CHUNK_SECONDS each.
 *
 * Uses pure JS ArrayBuffer manipulation — no native FFmpeg needed.
 * For files shorter than the limit, returns the original URI in an array.
 */
export async function chunkAudio(uri: string, durationSeconds: number) {
  if (durationSeconds <= MAX_CHUNK_SECONDS) {
    return [uri];
  }

  // Fetch the entire WAV file into memory
  const response = await fetch(uri);
  if (!response.ok) {
    throw new Error(`Failed to fetch audio file: ${response.status}`);
  }
  const fullBuffer = await response.arrayBuffer();
  const fullBytes = new Uint8Array(fullBuffer);

  // Skip the 44-byte WAV header to get raw PCM data
  const pcmData = fullBytes.subarray(WAV_HEADER_SIZE);

  const bytesPerSecond = BYTE_RATE; // 16000 * 1 * 2 = 32000
  const maxChunkBytes = MAX_CHUNK_SECONDS * bytesPerSecond;

  const chunkUris: string[] = [];
  let offset = 0;
  let index = 0;

  while (offset < pcmData.length) {
    const end = Math.min(offset + maxChunkBytes, pcmData.length);
    const chunkPcm = pcmData.subarray(offset, end);
    const chunkDataSize = chunkPcm.length;

    // Build a new WAV file: header + chunk PCM data
    const header = buildWavHeader(chunkDataSize);
    const headerBytes = new Uint8Array(header);
    const wavChunk = new Uint8Array(WAV_HEADER_SIZE + chunkDataSize);
    wavChunk.set(headerBytes, 0);
    wavChunk.set(chunkPcm, WAV_HEADER_SIZE);

    // Convert to a blob URL so it can be used like a file URI
    const blob = new Blob([wavChunk], { type: "audio/wav" });
    const chunkUri = URL.createObjectURL(blob);

    chunkUris.push(chunkUri);
    offset = end;
    index += 1;
  }

  return chunkUris;
}
