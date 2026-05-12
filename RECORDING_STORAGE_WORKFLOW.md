# Recording & Storage Workflow

This document describes how audio recording and storage currently work in this app (implementation facts, file locations, limitations, and suggestions).

## Overview

- Recording uses Expo AV (`Audio.Recording`) to capture audio in the app. See implementation in [src/hooks/useAudioRecorder.ts](src/hooks/useAudioRecorder.ts#L1-L260).
- The app intentionally does not move/copy recordings to a permanent directory due to a broken `expo-file-system` build in this project. Instead it keeps the cache URI created by `expo-av` and stores metadata about each recording in `AsyncStorage`.
- Key services:
  - Metadata and logical storage management: [src/services/fileStorage.ts](src/services/fileStorage.ts#L1-L220)
  - Recording, playback and permission handling: [src/hooks/useAudioRecorder.ts](src/hooks/useAudioRecorder.ts#L1-L260)
  - Audio processing (hashing, conversion, chunking) using `ffmpeg-kit`: [src/services/audioManager.ts](src/services/audioManager.ts#L1-L220)
  - UI controls for recording: [src/components/RecorderButton.tsx](src/components/RecorderButton.tsx#L1-L300)

## Detailed step-by-step workflow

1. Permissions & initialization
   - `useAudioRecorder.requestPermissions()` calls `Audio.requestPermissionsAsync()` and then `fileStorageService.initializeStorage()`.
   - `fileStorageService.initializeStorage()` is currently a no-op and documents the `expo-file-system` issue.

2. Start recording
   - `useAudioRecorder.startRecording()` sets audio mode (allows recording, background, ducking) and calls `Audio.Recording.createAsync(...)` with `HIGH_QUALITY` options.
   - `expo-av` creates a temporary file in the app cache (cache directory) and provides a `URI` (cache URI) for the active recording. Status callbacks update UI state and metering.

3. During recording
   - The hook receives periodic status updates (duration, metering) and updates the reactive UI `waveValue` and `state`.
   - The raw audio remains at the cache `URI` until the recording is stopped and `expo-av` writes the final file.

4. Stop recording and save metadata
   - On stop, `useAudioRecorder.stopRecording()` calls `recording.stopAndUnloadAsync()` and reads the final `uri` from the `Recording` object.
   - Instead of copying the file to a document directory, the app calls `fileStorageService.saveRecording(uri, ...)` and stores a `RecordingMetadata` object in `AsyncStorage` containing:
     - `id`: filename derived from the URI
     - `fileUri`: the cache `uri` (NOT moved)
     - `duration`, `title`, `createdAt`, `mimeType`, `tags`, `fileSize` (fileSize is 0 as FileSystem is not used)
   - See the saving logic in [src/services/fileStorage.ts](src/services/fileStorage.ts#L1-L220).

5. Playback
   - `useAudioRecorder.playRecording(uri)` uses `Audio.Sound.createAsync({ uri }, { shouldPlay: true })` to play the file directly from the stored URI.

6. Deletion
   - `fileStorageService.deleteRecording(id)` removes the metadata entry from `AsyncStorage` but intentionally does not delete the physical file in cache (to avoid `expo-file-system` operations that crash).
   - The code notes that the OS will eventually clear the cache directory.

7. Processing / conversion
   - `src/services/audioManager.ts` contains utilities to:
     - Hash a file (`hashFile(uri)`) by fetching and hashing bytes.
     - Convert audio to 16kHz mono WAV via `FFmpegKit` (`convertToWav16kMono(uri)`).
     - Chunk long audio into pieces using `FFmpegKit` (`chunkAudio(uri, durationSeconds)`).
   - These functions operate on the same URIs (cache or sibling paths) and assume FFmpeg can access the file path.

## Where files actually live

- Recordings are left in the app cache directory (the temporary URIs returned by `expo-av`). `fileStorageService` stores those cache URIs in metadata (`fileUri`) rather than moving files to `DocumentDirectory` or external storage.
- `fileStorageService.getRecordingsDirectory()` returns a placeholder string `cache_directory` (not used for physical moves in this build).

## Known limitations and risks (current state)

- expo-file-system is broken in this build: code comments indicate a runtime crash (NoClassDefFoundError) when using FileSystem copy/move. Because of that, the app avoids physical file moves and relies on cache URIs.
- Recordings stored only by reference to cache URIs are at risk of being removed by the OS when the cache is cleared — causing recorded audio to disappear even though metadata remains.
- `fileSize` is set to `0` due to lack of a safe way to query the file size without FileSystem APIs.
- Deleting a recording only removes metadata; the physical file remains in cache until the OS cleans it.
- Some audio processing expects sibling paths or writable directories (FFmpeg), which may fail if the underlying runtime cannot write in the same directory as the cache file.

## Practical consequences for users

- Recordings may be lost unexpectedly if the OS clears cache (app updates, low storage cleanup).
- Searching for recordings by physical file size or performing file-level backups is not currently possible within the app.

## Recommendations (next actions)

1. Fix or upgrade `expo-file-system` so the app can reliably move the final recording from cache to a persistent directory such as `FileSystem.documentDirectory` or to an app-managed folder on external storage for Android. Then update `fileStorageService.saveRecording()` to copy/move the file and populate `fileSize`.

2. Alternatively, upload the recording immediately to the backend after stopping (e.g., via `backendService`) and then clear the cache/metadata as appropriate. That avoids reliance on local persistence.

3. If keeping local files is required, add storage permission handling and an explicit persistent recordings directory. Use `FileSystem.getInfoAsync(uri)` to get file size and confirm move success.

4. Add a periodic background verification job (or verify on app launch) that checks each metadata `fileUri` still exists and mark missing files so the user can be alerted.

## Quick links to implementation

- `useAudioRecorder` (recording / playback / permissions): [src/hooks/useAudioRecorder.ts](src/hooks/useAudioRecorder.ts#L1-L260)
- `fileStorageService` (metadata persistence): [src/services/fileStorage.ts](src/services/fileStorage.ts#L1-L220)
- `audioManager` (ffmpeg conversions / chunking / hashing): [src/services/audioManager.ts](src/services/audioManager.ts#L1-L220)
- `RecorderButton` (UI controls): [src/components/RecorderButton.tsx](src/components/RecorderButton.tsx#L1-L300)

---

If you want, I can:

- implement the safe move/copy using `expo-file-system` once we update that dependency, or
- add an upload-to-backend flow right after `stopRecording()` and mark the local file as transient.

Tell me which option you prefer and I will add a concrete implementation plan and patch.
