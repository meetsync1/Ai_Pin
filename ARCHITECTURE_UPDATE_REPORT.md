# Architecture Update Report

## Summary

- Introduced a new session-based architecture aligned to the transcriptor plan: sessions, transcripts, summaries, and persona views.
- Added SQLite storage, transcript processing, Sarvam/OpenAI service layers, and a new session detail screen.
- Kept API keys as placeholders in .env and referenced them from the app (no backend server yet, per request).

## Key Changes

- Session data model + SQLite schema for sessions, transcripts, summaries, and speaker labels.
- Transcription workflow that converts audio, chunks it, starts a Sarvam job, processes diarized transcript, then summarizes with OpenAI.
- Library now lists sessions and opens a session detail view with persona tabs and transcript.
- Recorder screen now supports context tags, speaker count, and file upload.

## Files Added

- src/config/env.ts
- src/storage/db.ts
- src/storage/sessionStore.ts
- src/services/audioManager.ts
- src/services/sarvamService.ts
- src/services/openaiService.ts
- src/services/transcriptProcessor.ts
- src/services/transcriptionWorkflow.ts
- src/components/SessionCard.tsx
- src/screens/SessionDetailScreen.tsx
- app/session/[id].tsx
- .env
- .env.example

## Files Updated

- package.json
- src/screens/HomeScreen.tsx
- src/screens/LibraryScreen.tsx

## API Key Locations

Insert your keys in these files/vars:

- .env
  - EXPO_PUBLIC_SARVAM_API_KEY
  - EXPO_PUBLIC_SARVAM_BASE_URL
  - EXPO_PUBLIC_SARVAM_WEBHOOK_SECRET
  - EXPO_PUBLIC_OPENAI_API_KEY
  - EXPO_PUBLIC_OPENAI_BASE_URL

The app reads these from src/config/env.ts.

## Notes

- Sarvam endpoints are configured via EXPO_PUBLIC_SARVAM_BASE_URL. If your API paths differ, update src/services/sarvamService.ts constants.
- Webhook flow is represented in the architecture, but without a backend server we currently poll for job completion on-device.
