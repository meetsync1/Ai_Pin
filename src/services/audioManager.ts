import * as Crypto from "expo-crypto";
import { FFmpegKit } from "ffmpeg-kit-react-native";

const MAX_CHUNK_SECONDS = 3590;

function getBaseDir(uri: string) {
  const trimmed = uri.trim();
  const slashIndex = trimmed.lastIndexOf("/");
  if (slashIndex === -1) {
    return "";
  }
  return trimmed.slice(0, slashIndex + 1);
}

function buildSiblingPath(inputUri: string, fileName: string) {
  const baseDir = getBaseDir(inputUri);
  return `${baseDir}${fileName}`;
}

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

export async function convertToWav16kMono(uri: string) {
  const output = buildSiblingPath(uri, `audio_${Date.now()}.wav`);
  const command = `-i "${uri}" -ac 1 -ar 16000 -c:a pcm_s16le "${output}"`;
  const session = await FFmpegKit.execute(command);
  const returnCode = await session.getReturnCode();
  if (!returnCode.isValueSuccess()) {
    throw new Error("Audio conversion failed");
  }
  return output;
}

export async function chunkAudio(uri: string, durationSeconds: number) {
  if (durationSeconds <= MAX_CHUNK_SECONDS) {
    return [uri];
  }

  const chunks: string[] = [];
  const baseDir = getBaseDir(uri);
  let offset = 0;
  let index = 0;

  while (offset < durationSeconds) {
    const chunkPath = `${baseDir}chunk_${Date.now()}_${index}.wav`;
    const command = `-i "${uri}" -ss ${offset} -t ${MAX_CHUNK_SECONDS} -c copy "${chunkPath}"`;
    const session = await FFmpegKit.execute(command);
    const returnCode = await session.getReturnCode();
    if (!returnCode.isValueSuccess()) {
      throw new Error("Audio chunking failed");
    }
    chunks.push(chunkPath);
    offset += MAX_CHUNK_SECONDS;
    index += 1;
  }

  return chunks;
}
