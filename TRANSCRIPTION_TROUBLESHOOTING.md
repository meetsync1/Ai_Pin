# 🔍 Transcription Troubleshooting Guide

## Issue: Transcription Returns 0 Characters

### Symptoms

```
✅ Transcription complete in 0.05s
📄 Text length: 0 characters
📊 Transcription progress: 0%
📊 Transcription progress: 10000%
```

### Common Causes & Solutions

#### 1. **Recording Too Short** (Most Common)

**Problem**: Audio recordings under 1 second may not have enough content to transcribe.

**Solution**:

- Record for **at least 2-3 seconds**
- Speak clearly and continuously
- Watch the timer - aim for 3-5 seconds minimum

**Check logs for**:

```
📊 Recording status: { durationMillis: 500 }  ❌ Too short!
📊 Recording status: { durationMillis: 3000 } ✅ Good
```

#### 2. **Audio File Too Small/Empty**

**Problem**: File size is less than 1KB, indicating no audio was captured.

**Solution**:

- Check microphone permissions in device settings
- Verify microphone is not muted or blocked
- Try speaking louder
- Check if another app is using the microphone

**Check logs for**:

```
📦 Recorded file info: { size: "0.5 KB" }  ❌ Empty!
📦 Recorded file info: { size: "45.2 KB" } ✅ Good
⚠️ Audio file is very small (500 bytes)
```

#### 3. **Language Parameter Issue**

**Problem**: Language set to 'auto' or undefined may cause issues with whisper.rn.

**Solution**: Now fixed - code defaults to 'en' (English)

**Check logs for**:

```
🌍 Transcription language: en ✅ Correct
```

#### 4. **Silent Audio**

**Problem**: Audio was recorded but contains only silence.

**Solution**:

- Speak closer to the microphone
- Remove any phone case covering the mic
- Check microphone hole isn't blocked by dust
- Test microphone in another app (voice recorder)

**Check logs for**:

```
⚠️ No segments detected! Possible issues:
   1. Audio recording is too short (< 1 second)
   2. Audio is silent or too quiet
```

#### 5. **Model Not Loaded Properly**

**Problem**: Whisper model failed to initialize.

**Solution**:

```bash
# Check if model file exists
adb shell ls -lh /data/data/com.anonymous.ai_notes/files/models/

# Should show:
-rw-rw---- 1 u0_a123 u0_a123 142M 2026-02-03 ggml-base.bin
```

If missing, app will re-download automatically on next launch.

#### 6. **Audio Format Compatibility**

**Problem**: Whisper.rn requires WAV/PCM format (16kHz, mono, 16-bit), but expo-av records in M4A/AAC format by default on Android.

**Solution**: We use `ffmpeg-kit-react-native` to convert M4A to WAV before transcription:

- Input: M4A/AAC (recorded by expo-av)
- Output: WAV (16kHz, mono, 16-bit PCM)

**How it works:**
1. Recording is saved as M4A by expo-av
2. Before transcription, AudioConverter.ts detects if conversion is needed
3. FFmpeg converts the file: `ffmpeg -i input.m4a -ar 16000 -ac 1 -c:a pcm_s16le output.wav`
4. Converted WAV is passed to whisper.rn for transcription

**Requirements:**
```bash
npm install ffmpeg-kit-react-native
```

**Check logs for:**
```
🔄 Audio needs conversion (M4A/AAC -> WAV)...
✅ Audio converted successfully: file:///...audio_converted_xxx.wav
```

If conversion fails, check that ffmpeg-kit-react-native is properly installed and linked.

---

## Diagnostic Logs to Check

### When Recording Starts

```
🎙️ Starting audio recording...
✅ Microphone permission granted
📝 Recording options: { sampleRate: 16000, channels: 1, format: 'wav' }
✅ Recording started successfully
```

### When Recording Stops

```
⏹️ Stopping recording...
📊 Recording status: {
  isRecording: true,
  durationMillis: 3500  ← Should be > 2000
}
📦 Recorded file info: {
  exists: true,
  size: "45.2 KB"  ← Should be > 1 KB
  uri: file:///...
}
✅ Recording stopped
```

### When Transcription Starts

```
🎤 Transcribing audio: file:///...
📊 Audio file info: {
  exists: true,
  size: "45.2 KB"  ← Must match recorded file
  uri: file:///...
}
🌍 Transcription language: en
🚀 Starting whisper.rn transcribe with options: {
  language: 'en',
  translate: false,
  maxLen: 1,
  tokenTimestamps: true
}
```

### Expected Success

```
📝 New segment: "Hello, this is a test"
📊 Transcription result summary: {
  segmentCount: 3,  ← Should be > 0
  textLength: 45,   ← Should be > 0
  duration: "2.15s",
  detectedLanguage: "en"
}
✅ Transcription complete in 2.15s
📄 Text length: 45 characters
📝 Transcribed text: "Hello, this is a test recording..."
```

### Warning Signs

```
⚠️ Audio file is very small (500 bytes)  ← File too small
⚠️ No segments detected!                   ← No transcription
⚠️ Recorded file is very small             ← Recording issue
```

---

## Testing Procedure

### 1. Test with Known Good Audio

Record for **5 seconds** and say:

> "Testing one two three four five. This is a voice transcription test."

Expected result:

- Duration: 5000+ milliseconds
- File size: 40-80 KB
- Segments: 2-3
- Text: Should contain most words

### 2. Test Short Recording

Record for **1 second** and say:

> "Test"

Expected result:

- May or may not transcribe (too short)
- If fails, you'll see warnings

### 3. Test Long Recording

Record for **10 seconds** with continuous speech.

Expected result:

- Duration: 10000+ milliseconds
- File size: 80-160 KB
- Segments: 5-8
- Text: Full transcript

---

## Quick Fixes

### Fix 1: Record Longer

```
🎯 Minimum: 2 seconds
✅ Recommended: 3-5 seconds
💯 Optimal: 5-10 seconds
```

### Fix 2: Speak Clearly

- **Distance**: 15-30cm from phone
- **Volume**: Normal speaking voice
- **Speed**: Not too fast, not too slow
- **Clarity**: Enunciate words clearly

### Fix 3: Check Environment

- **Noise**: Quiet room preferred
- **Echo**: Avoid large empty rooms
- **Background**: Turn off TV, music, fans

### Fix 4: Verify Permissions

```bash
# Check permissions
adb shell dumpsys package com.anonymous.ai_notes | grep "RECORD_AUDIO"

# Should show:
android.permission.RECORD_AUDIO: granted=true
```

---

## Advanced Debugging

### Enable Verbose Logging

The new code includes comprehensive logging. Watch for:

1. **Recording Phase**
   - Permission granted
   - Recording options set
   - Recording started

2. **Audio File Phase**
   - File exists
   - File size reasonable (> 1KB)
   - URI is valid

3. **Transcription Phase**
   - Model loaded
   - Language set correctly
   - Segments being detected
   - Text being accumulated

### Check Model File

```bash
# Connect to device
adb shell

# Navigate to app directory
cd /data/data/com.anonymous.ai_notes/files/models/

# List files
ls -lh

# Should see:
ggml-base.bin  (141-142 MB)

# Check if readable
cat ggml-base.bin > /dev/null && echo "Readable" || echo "Not readable"
```

### Test Audio File Manually

```bash
# Pull recorded audio file from device
adb pull /data/user/0/com.anonymous.ai_notes/cache/Audio/recording-*.wav

# Play on computer to verify it contains audio
# On Windows: Right-click > Play
# On Mac: open recording.wav
# On Linux: aplay recording.wav
```

---

## Known Working Configuration

### Device Requirements

- **Android**: 7.0+ (API 24+)
- **RAM**: 2GB+ recommended
- **Storage**: 200MB+ free space
- **Microphone**: Working and accessible

### Audio Settings (Already Configured)

```typescript
{
  format: "wav",
  sampleRate: 16000,  // Whisper's preferred
  channels: 1,         // Mono
  bitRate: 128000,
}
```

### Whisper Settings (Already Configured)

```typescript
{
  language: "en",           // English
  translate: false,         // Don't translate
  maxLen: 1,               // Max segment length
  tokenTimestamps: true,   // Enable timestamps
}
```

---

## For Hinglish Support (Future)

Whisper Base model already supports Hindi, so Hinglish (Hindi-English code-switching) should work to some extent.

To improve Hinglish recognition:

### Option 1: Use Auto-Detect

```typescript
// In app/transcribe.tsx, change:
await WhisperService.transcribe(audioUri, {
  language: "auto",  // Let model auto-detect
```

### Option 2: Upgrade to Larger Model

Whisper Small or Medium handle multilingual better:

```typescript
// In constants/whisper.ts
export const DEFAULT_WHISPER_MODEL = WHISPER_SMALL_MODEL; // 466MB
```

### Option 3: Process Separately

1. First pass with English
2. Second pass with Hindi
3. Merge results

---

## Summary

**Most Common Solution**: Record for at least 3 seconds with clear speech!

**Check These First**:

1. ✅ Recording duration > 2 seconds
2. ✅ File size > 1 KB
3. ✅ Speaking clearly and continuously
4. ✅ Microphone not blocked

**If Still Not Working**:

1. Check device logs for warnings
2. Test microphone in another app
3. Try the Whisper Tiny model (faster, may work better for short audio)
4. Ensure model file downloaded correctly

---

**Updated**: February 3, 2026  
**Version**: 1.1 with enhanced logging
