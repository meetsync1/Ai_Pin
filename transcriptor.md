# Transcription & Summarization App — Full Architectural Plan

> **Stack**: React Native (Expo) · Sarvam AI `saaras:v3` (batch transcription) · OpenAI GPT-4o (summarization)  
> **Design principles**: Minimize API calls · Maximize accuracy · Keep latency low · Support diverse use cases (business, legal, personal, education)

---

## 1. Product Overview

A cross-platform mobile app (Android + iOS) that:

- Records live audio or accepts uploaded files (up to 1 hour per session)
- Transcribes code-mixed speech (Hindi-English and other Indian language blends) using Sarvam's `saaras:v3` batch API in `codemix` mode
- Separates speakers automatically via Sarvam's built-in diarization — no third-party library needed
- Summarizes transcriptions using OpenAI with structured, topic-aware output in a single API call
- Stores full history locally with optional cloud sync

Target personas: business professionals in meetings, lawyers, students, and parents summarizing content for children.

---

## 2. Core Design Decisions (Cost vs. Accuracy vs. Speed)

### 2.1 The Golden Rule — One Transcription, One Summary Per Session

Never re-transcribe unless the audio changes. Never re-summarize unless the user explicitly requests a different format. All derived outputs (bullet points, topic breakdown, child-friendly version) are generated from the **same cached transcript** using client-side rendering — not new API calls.

### 2.2 Sarvam Batch — Full 1-Hour Chunk Strategy

`saaras:v3` supports up to **1 hour per file** and accepts **up to 20 files per job**. This means a single job can handle up to 20 hours of audio. Always send the maximum viable chunk (up to 59:50 min). Never split unnecessarily.

| Audio length          | Sarvam job calls | Files per job  |
| --------------------- | ---------------- | -------------- |
| 0–60 min              | 1 job            | 1 file         |
| 60–120 min            | 1 job            | 2 files        |
| 120–1200 min (20 hrs) | 1 job            | up to 20 files |
| > 20 hrs              | multiple jobs    | 20 files each  |

For live recording, buffer audio locally and dispatch a single job only after the session ends (or at the 59:50-min mark for long sessions). Most real-world meetings, interviews, and lectures fit in a single job with one file.

### 2.3 Use Webhooks for Jobs — Not Polling

For any session longer than ~2 minutes, Sarvam's async job completes in the background. Rather than polling `job.wait_until_complete()` — which blocks and drains battery — use Sarvam's **webhook callback**. The backend receives a POST when the job finishes, saves the transcript to the database, and pushes a notification to the app. The user can leave the screen and return to a ready summary.

For very short clips (< 2 min), synchronous `wait_until_complete()` is acceptable since the wait is negligible.

### 2.4 Diarization Is Built Into Sarvam — No Extra Cost

`saaras:v3` returns full speaker diarization alongside the transcript when `with_diarization=True`. No separate diarization service is needed. Speaker labels (`SPEAKER_00`, `SPEAKER_01`, etc.) and per-segment timestamps arrive in the `diarized_transcript.entries` array. The Transcript Processor maps these to human-readable labels and feeds them structured into the OpenAI prompt.

### 2.5 `codemix` Mode for Indian Context

Since users are in a business, legal, and everyday Indian context, they naturally speak in code-mixed Hindi-English (and other regional blends). Setting `mode="codemix"` in `saaras:v3` handles this natively — it transcribes speech as-is, mixing scripts and languages naturally without forcing everything into one language. This produces far more accurate transcripts than `transcribe` mode for mixed-language speakers, and directly reduces the need for any OpenAI correction pass.

### 2.6 OpenAI — Single Structured Call

The processed, speaker-labelled transcript is sent to OpenAI **once**. The prompt returns a JSON object with all summary formats in one response. No secondary calls for persona switching — that is done entirely client-side.

### 2.7 Smart Transcript Truncation Before OpenAI

Before sending to OpenAI, run on-device preprocessing (zero additional API cost):

1. Strip pure filler sounds via regex
2. For transcripts over 6,000 words: TF-IDF sentence scoring, retain top 70% by informativeness, always preserve the first and last 10% verbatim
3. Speaker turns are preserved as structured context — not stripped

---

## 3. System Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                         React Native App                         │
│                                                                  │
│  ┌──────────────┐   ┌──────────────┐   ┌───────────────────┐   │
│  │  Live mic    │   │  File upload │   │  Cloud import     │   │
│  │  (expo-av)   │   │  (MP3/WAV)   │   │  (Drive / link)   │   │
│  └──────┬───────┘   └──────┬───────┘   └────────┬──────────┘   │
│         └──────────────────┴────────────────────┘              │
│                             │                                    │
│                   ┌─────────▼──────────┐                        │
│                   │   Audio Manager    │                        │
│                   │  - Format check    │                        │
│                   │  - Chunk (59:50)   │                        │
│                   │  - Local cache     │                        │
│                   └─────────┬──────────┘                        │
└─────────────────────────────┼────────────────────────────────────┘
                              │ HTTPS (via backend proxy)
             ┌────────────────▼──────────────────────┐
             │           Your Backend API             │
             │  (Node.js / Express on Vercel/Railway) │
             │  - Holds Sarvam + OpenAI API keys      │
             │  - Rate limits per user                │
             │  - Receives Sarvam webhook callbacks   │
             └────────┬──────────────────┬────────────┘
                      │                  │
       ┌──────────────▼───┐    ┌─────────▼──────────────┐
       │  Sarvam Batch API │    │    OpenAI GPT-4o API   │
       │  saaras:v3        │    │  /v1/chat/completions  │
       │  mode: codemix    │    │  Single JSON call      │
       │  diarization: on  │    │  response_format: json │
       │  webhook callback │    └─────────┬──────────────┘
       └──────────────┬────┘              │
                      │                  │
             ┌────────▼──────────────────▼────────┐
             │         Transcript Processor        │
             │  - Parse diarized_transcript        │
             │  - Format speaker turns             │
             │  - Filler removal (regex)           │
             │  - TF-IDF truncation (if >6k words) │
             │  - Save raw + clean to SQLite       │
             └─────────────────┬──────────────────┘
                               │
             ┌─────────────────▼──────────────────┐
             │          Summary Renderer           │
             │  - Persona tabs (client-side only)  │
             │  - Speaker attribution view         │
             │  - Export: PDF / share / clipboard  │
             │  - Full history from SQLite         │
             └────────────────────────────────────┘
```

---

## 4. Module Breakdown

### 4.1 Audio Manager

**Responsibilities:**

- Accept input from three sources: live mic, local file, cloud URL
- Validate and convert audio to WAV 16kHz mono (Sarvam's preferred format for best accuracy; raw PCM must be explicitly flagged as `pcm_s16le`)
- Chunk at 59:50 min boundaries (10-second safety margin before the 1-hour limit)
- Cache raw chunks in device temp directory keyed by MD5 hash of the content (used to skip re-transcription)

**Key libraries:**

- `expo-av` — live recording
- `expo-document-picker` — file upload
- `expo-file-system` — local file management
- `ffmpeg-kit-react-native` — on-device format conversion, resampling to 16kHz mono

**Live recording pipeline:**

```
Mic → expo-av buffer → at 59:50 min mark → flush to WAV file → send to backend
                     → on "Stop" tap     → flush remainder   → send to backend
```

For sessions under 60 min, no intermediate dispatch happens. Audio is only sent after the user taps Stop.

**Chunking logic:**

```javascript
const MAX_CHUNK_SECONDS = 3590; // 59 min 50 sec

function chunkAudio(audioFilePath) {
  const duration = getAudioDurationSeconds(audioFilePath);
  if (duration <= MAX_CHUNK_SECONDS) return [audioFilePath];

  const chunks = [];
  let offset = 0;
  let index = 0;
  while (offset < duration) {
    const chunkPath = extractSegment(
      audioFilePath,
      offset,
      MAX_CHUNK_SECONDS,
      index,
    );
    chunks.push(chunkPath);
    offset += MAX_CHUNK_SECONDS;
    index++;
  }
  return chunks; // each chunk <= 59:50, up to 20 chunks per Sarvam job
}
```

If the session produces more than 20 chunks (> 20 hours of audio), split into multiple jobs of 20 files each. This is an extreme edge case but the logic should handle it gracefully.

---

### 4.2 Sarvam Batch API Integration

**Model:** `saaras:v3` (recommended — best accuracy and latest features)  
**Mode:** `codemix` (handles natural Hindi-English and other Indian language blending)  
**Diarization:** enabled — returns full speaker-labelled segments at no extra cost

#### Job Lifecycle

Sarvam's batch API is **job-based**, not a single REST call. The sequence is:

```
1. createJob()        → get job_id, register webhook
2. uploadFiles()      → attach audio files to the job (up to 20)
3. start()            → begin async processing
4. webhook fires      → backend receives completion notification
5. getFileResults()   → check which files succeeded / failed
6. downloadOutputs()  → pull transcript JSON for each file
```

#### Backend Implementation (Node.js proxy)

```javascript
// POST /api/transcribe  — called by the React Native app
import { SarvamAI } from "sarvamai";

const client = new SarvamAI({ apiSubscriptionKey: process.env.SARVAM_API_KEY });

export async function createTranscriptionJob(audioFilePaths, sessionId) {
  const job = await client.speechToTextJob.createJob({
    model: "saaras:v3",
    mode: "codemix", // natural code-mixed Indian speech
    withDiarization: true, // speaker separation — built in, no extra cost
    numSpeakers: 2, // set to expected count; supports up to 8 speakers
    // language_code omitted → auto-detect per file (works well with codemix)
    callback: {
      url: `${process.env.BACKEND_URL}/webhook/sarvam`,
      authToken: process.env.SARVAM_WEBHOOK_SECRET,
    },
  });

  await job.uploadFiles({ filePaths: audioFilePaths });
  await job.start();

  // Save job_id → session_id mapping so the webhook can find it
  await db.saveJobMapping(job.jobId, sessionId);

  return job.jobId;
}
```

#### Webhook Handler

```javascript
// POST /webhook/sarvam  — called by Sarvam when the job completes
export async function handleSarvamWebhook(req, res) {
  const token = req.headers["x-sarvam-job-callback-token"];
  if (token !== process.env.SARVAM_WEBHOOK_SECRET) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  // Respond 200 immediately — Sarvam requires a response within 30 seconds
  res.status(200).json({ status: "success" });

  // Process asynchronously after responding
  const { job_id, job_state, error_message } = req.body;

  if (job_state === "FAILED") {
    await db.updateSessionStatus(job_id, "transcription_failed", error_message);
    return;
  }

  if (job_state === "COMPLETED") {
    const job = await client.speechToTextJob.getJob(job_id);
    const fileResults = await job.getFileResults();
    const outputs = await job.downloadOutputs({
      outputDir: `/tmp/sarvam/${job_id}`,
    });

    const sessionId = await db.getSessionByJobId(job_id);
    await processAndStoreTranscript(sessionId, fileResults, outputs);

    // Trigger OpenAI summarization — non-blocking
    triggerSummarization(sessionId).catch(console.error);
  }
}
```

#### Diarization Response Structure

`saaras:v3` returns a `diarized_transcript` alongside the flat `transcript`. The app uses the diarized version exclusively since it carries richer structure. The flat transcript is kept only as a fallback for rendering.

```json
{
  "request_id": "20260130_d8d2c0e6-...",
  "transcript": "Haan bhai toh aaj ka agenda kya hai? So basically the Q3 numbers are looking good...",
  "diarized_transcript": {
    "entries": [
      {
        "transcript": "Haan bhai, toh aaj ka agenda kya hai?",
        "start_time_seconds": 0.01,
        "end_time_seconds": 3.4,
        "speaker_id": "0"
      },
      {
        "transcript": "So basically the Q3 numbers are looking good, revenue is up.",
        "start_time_seconds": 3.8,
        "end_time_seconds": 7.2,
        "speaker_id": "1"
      }
    ]
  },
  "language_code": "hi-IN"
}
```

Note how `codemix` mode preserves the natural Hindi-English blend exactly as spoken — no forced normalisation to one language.

**Multi-file speaker continuity:** When audio is split across multiple files in one job, Sarvam processes each file independently. Speaker IDs reset per file (`SPEAKER_00` in file 1 may not be the same person as `SPEAKER_00` in file 2). The Transcript Processor handles re-alignment using a heuristic that compares the last few seconds of one file's speaker pattern against the first few seconds of the next.

---

### 4.3 Transcript Processor

Runs entirely on the backend before the OpenAI call. Zero additional API cost.

#### Step 1 — Parse Diarized Entries Into Structured Speaker Turns

```javascript
function parseDiarizedTranscript(diarizedEntries, speakerLabels = {}) {
  // speakerLabels = user-set names e.g. { "0": "Rahul", "1": "Priya" }
  return diarizedEntries
    .map((entry) => {
      const label =
        speakerLabels[entry.speaker_id] ||
        `Speaker ${parseInt(entry.speaker_id) + 1}`;
      const mins = Math.floor(entry.start_time_seconds / 60);
      const secs = Math.floor(entry.start_time_seconds % 60);
      const ts = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
      return `[${ts}] ${label}: ${entry.transcript}`;
    })
    .join("\n");
}
```

**Output example:**

```
[00:00] Speaker 1: Haan bhai, toh aaj ka agenda kya hai?
[00:03] Speaker 2: So basically the Q3 numbers are looking good, revenue is up.
[00:07] Speaker 1: Achha, aur expenses? Did we manage to cut them?
```

This structured format is what gets passed to OpenAI. Speaker attribution is preserved throughout the entire pipeline.

#### Step 2 — Filler Removal (codemix-aware)

Standard English fillers plus common Hindi/Hinglish fillers:

```javascript
const FILLER_PATTERNS = [
  /\b(um|uh|like|you know|i mean|basically|literally|right\?|okay so)\b/gi,
  /\b(matlab|haan haan|theek hai theek hai|toh toh|aur aur)\b/gi,
  /(\.\.\.|…)/g,
  /\s{2,}/g,
];

function removeFiller(text) {
  return FILLER_PATTERNS.reduce((t, p) => t.replace(p, " "), text).trim();
}
```

Filler removal is applied per diarized entry **before** assembling the structured turn format. This keeps the `[timestamp] Speaker:` structure intact while cleaning spoken content.

#### Step 3 — Smart Truncation (transcripts > 6,000 words)

```javascript
function smartTruncate(formattedTranscript, targetRatio = 0.7) {
  const lines = formattedTranscript.split("\n").filter(Boolean);
  const firstTen = Math.floor(lines.length * 0.1);
  const lastTen = Math.floor(lines.length * 0.1);
  const middle = lines.slice(firstTen, lines.length - lastTen);

  const scored = middle.map((line, i) => ({
    line,
    origIndex: i,
    score: tfIdfScore(line, formattedTranscript),
  }));

  const topMiddle = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.floor(middle.length * targetRatio))
    .sort((a, b) => a.origIndex - b.origIndex)
    .map((x) => x.line);

  return [
    ...lines.slice(0, firstTen),
    ...topMiddle,
    ...lines.slice(lines.length - lastTen),
  ].join("\n");
}
```

The first and last 10% of speaker turns are always kept verbatim — meeting openings and closings carry disproportionate information (introductions, decisions, next steps).

#### Step 4 — Save to SQLite

Both the raw `diarized_transcript` JSON and the processed transcript string are written to SQLite immediately after receiving the Sarvam webhook — before any OpenAI call. The transcript is never at risk of loss.

---

### 4.4 OpenAI Integration

#### Single Structured Call with Speaker Context

```javascript
const systemPrompt = `
You are a professional summarizer for meetings, legal proceedings, and personal notes
in Indian contexts. Speakers may use code-mixed Hindi-English — preserve names and
technical terms as spoken. Output only valid JSON with exactly this shape:

{
  "executive_summary": "2-3 sentence high-level overview",
  "topic_breakdown": [
    {
      "topic": "string",
      "summary": "string",
      "speaker_contributions": { "Speaker 1": "brief role", "Speaker 2": "brief role" },
      "timestamp_range": "MM:SS - MM:SS"
    }
  ],
  "action_items": [
    { "action": "string", "owner": "Speaker name or unknown", "deadline": "if mentioned" }
  ],
  "key_decisions": ["string"],
  "child_summary": "Simple 3-4 sentence version a 10-year-old can understand, plain English",
  "key_quotes": [
    { "speaker": "string", "quote": "verbatim from transcript", "timestamp": "MM:SS" }
  ]
}

Tailor tone to context_tag: business = concise, legal = precise, personal = friendly, kids = simple.
`.trim();

const userPrompt = `
context_tag: ${sessionContext}
num_speakers: ${numSpeakers}

Transcript (speaker-labelled, timestamps included):
${processedTranscript}
`.trim();

const response = await openai.chat.completions.create({
  model: "gpt-4o",
  response_format: { type: "json_object" },
  messages: [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ],
  max_tokens: 1800,
  temperature: 0.3, // low temperature = consistent, factual output
});

const summary = JSON.parse(response.choices[0].message.content);
```

**Session context tags** (user sets optionally before recording):

- `"business_meeting"` — concise, action-item focused
- `"legal_deposition"` — precise, quote-heavy, formal
- `"personal_note"` — friendly, informal
- `"lecture_kids"` — simplified vocabulary, child_summary prioritized

#### Token Budget Estimate

| Component                             | Tokens           |
| ------------------------------------- | ---------------- |
| System prompt                         | ~300             |
| Processed transcript — 60 min session | ~3,500–6,000     |
| After truncation (> 6k words)         | ~2,500–4,200     |
| Output JSON with speaker attribution  | ~800–1,200       |
| **Total per 60-min session**          | **~3,600–5,700** |

At GPT-4o pricing (~$5/1M input, ~$15/1M output), a full 60-minute meeting costs roughly **$0.03–0.05**. With truncation applied, typical cost is closer to **$0.02–0.03**.

---

### 4.5 Summary Renderer & UI

All persona switching is **client-side only** — zero additional API calls after the initial summarization.

**Persona views:**

- **Brief** — `executive_summary` only, single card
- **Detailed** — `topic_breakdown` as expandable accordion with timestamp links
- **Business / Legal** — `key_decisions` + `action_items` (with owner chips) + `key_quotes`
- **For kids** — `child_summary` in large friendly font with simplified layout
- **By speaker** — groups `topic_breakdown` by `speaker_contributions`, shows each person's key contributions

**Transcript view:** Full structured transcript with timestamps. Tapping a timestamp deep-links into the original audio file and seeks `expo-av` to that position.

**Export options:**

- Copy to clipboard (plain text)
- Share sheet (native iOS/Android)
- Export as PDF (`react-native-html-to-pdf`)
- Save to Files app / Google Drive

---

## 5. Data Flow — Full Sequence

```
User           App             Backend           Sarvam          OpenAI
 │              │                 │                 │               │
 │─ Start rec ─▶│                 │                 │               │
 │              │ buffer locally  │                 │               │
 │─ Stop rec  ─▶│                 │                 │               │
 │              │─ POST audio ───▶│                 │               │
 │              │                 │─ createJob() ──▶│               │
 │              │                 │─ uploadFiles() ▶│               │
 │              │                 │─ job.start() ──▶│               │
 │              │◀── job_id ──────│                 │               │
 │              │ (shows          │                 │  processing   │
 │              │  "Processing")  │                 │               │
 │              │                 │◀── webhook ─────│               │
 │              │                 │ parse + store   │               │
 │              │                 │─ POST transcript ──────────────▶│
 │              │                 │◀── JSON summary ────────────────│
 │              │                 │ save to SQLite  │               │
 │              │◀── push notify ─│                 │               │
 │◀─ summary  ──│                 │                 │               │
```

For audio > 60 min, multiple files are uploaded to a single job. The rest of the flow is identical — the backend concatenates transcripts by chunk index before the OpenAI call.

---

## 6. Local Storage Schema (SQLite)

```sql
CREATE TABLE sessions (
  id              TEXT PRIMARY KEY,
  created_at      INTEGER NOT NULL,
  title           TEXT,
  source_type     TEXT CHECK(source_type IN ('live', 'upload', 'cloud')),
  duration_s      INTEGER,
  context_tag     TEXT,
  sarvam_job_id   TEXT,
  status          TEXT DEFAULT 'pending'
    CHECK(status IN ('pending','transcribing','summarizing','ready','failed'))
);

CREATE TABLE speaker_labels (
  session_id    TEXT REFERENCES sessions(id),
  speaker_id    TEXT,         -- "0", "1" ... as returned by Sarvam
  display_name  TEXT,         -- user-set name e.g. "Rahul", "Client"
  PRIMARY KEY (session_id, speaker_id)
);

CREATE TABLE transcripts (
  session_id      TEXT REFERENCES sessions(id),
  chunk_index     INTEGER,
  raw_diarized    TEXT,        -- full diarized_transcript JSON from Sarvam
  processed_text  TEXT,        -- speaker-formatted, filler-cleaned string
  word_count      INTEGER,
  PRIMARY KEY (session_id, chunk_index)
);

CREATE TABLE summaries (
  session_id          TEXT PRIMARY KEY REFERENCES sessions(id),
  executive_summary   TEXT,
  topic_breakdown     TEXT,    -- JSON string
  action_items        TEXT,    -- JSON string
  key_decisions       TEXT,    -- JSON string
  child_summary       TEXT,
  key_quotes          TEXT,    -- JSON string
  created_at          INTEGER
);
```

---

## 7. Offline & Resilience Strategy

**Transcript-first guarantee:** The raw Sarvam output is written to SQLite the moment the webhook fires — before any OpenAI call begins. If summarization fails, the transcript is safe and the user sees a "Retry Summary" button.

**Sarvam job recovery:** On app launch, query sessions with `status = 'transcribing'`. For each, check job status via the backend. If completed, re-trigger summarization. If still running, re-register the webhook.

**OpenAI retry:** 2 attempts with 4s backoff only. Not more — retrying an expensive call too aggressively wastes money.

**No re-transcription gate:** Before uploading audio to Sarvam, compute an MD5 hash of the file. If a transcript already exists in SQLite for that hash, skip the Sarvam call entirely and proceed straight to summarization.

**Webhook reliability:** The backend immediately responds 200 to Sarvam (required within 30 seconds), then processes the transcript asynchronously. Use a job queue (BullMQ on Railway) for processing so the webhook handler stays fast and never times out.

---

## 8. Security & API Key Management

API keys (Sarvam, OpenAI) are **never bundled in the app binary**. All external API calls go through the backend proxy.

```
React Native App
      │  (user's JWT)
      ▼
Your Backend API  ──▶  Sarvam API   (server-side key)
                  ──▶  OpenAI API   (server-side key)
```

- Store user session tokens in `expo-secure-store` on device
- Backend authenticates requests via JWT (Clerk or Supabase Auth)
- Rate limit per user at the backend (e.g. max 60 min transcription/day on free tier)
- Sarvam webhook secret stored in backend env vars only — never exposed to the client

---

## 9. Phased Build Plan

### Phase 1 — Core Pipeline (Weeks 1–3)

- Audio recording and file upload (expo-av, ffmpeg-kit)
- Backend proxy setup (Vercel / Railway)
- Sarvam `saaras:v3` codemix job: create, upload files, synchronous wait
- OpenAI single structured JSON call
- Basic summary display screen

### Phase 2 — Diarization & Webhooks (Weeks 4–5)

- Parse and render `diarized_transcript` entries with speaker labels
- User-settable speaker names per session
- Replace synchronous polling with async webhook flow
- SQLite history and offline transcript viewing

### Phase 3 — Resilience & Cost Controls (Week 6)

- MD5-based re-transcription gate
- Filler removal + TF-IDF truncation in Transcript Processor
- Retry UI for failed summarization
- Multi-chunk handling for audio > 60 min

### Phase 4 — Persona & UX (Week 7)

- Persona selector tabs (Business, Legal, Kids, Personal, By Speaker)
- Timestamp deep-link to audio playback
- Export options (PDF, share, clipboard)
- Session tagging and search

### Phase 5 — Auth & Security (Week 8)

- User authentication (Clerk or Supabase)
- Per-user rate limiting and usage tracking
- Optional cloud sync of summaries

---

## 10. Estimated API Cost Per User Per Month

**Moderate usage** — 10 sessions/month, avg. 25 min each:

| Service                                  | Calls    | Est. cost        |
| ---------------------------------------- | -------- | ---------------- |
| Sarvam `saaras:v3` codemix (10 × 25 min) | 10 jobs  | ~$0.80–$2.00     |
| OpenAI GPT-4o (1 call/session)           | 10 calls | ~$0.25–$0.40     |
| **Total**                                |          | **~$1.05–$2.40** |

**Heavy usage** — 30 sessions/month, avg. 45 min each:

| Service              | Calls    | Est. cost        |
| -------------------- | -------- | ---------------- |
| Sarvam (30 × 45 min) | 30 jobs  | ~$3.50–$7.00     |
| OpenAI GPT-4o        | 30 calls | ~$0.75–$1.20     |
| **Total**            |          | **~$4.25–$8.20** |

The webhook + single-call OpenAI strategy means no wasted polling requests and no duplicate summarization calls. Smart truncation reduces OpenAI spend by a further 20–35% on longer sessions.

---

## 11. Key Dependencies

**React Native app:**

```json
{
  "expo": "~51.0.0",
  "expo-av": "~14.0.0",
  "expo-document-picker": "~12.0.0",
  "expo-file-system": "~17.0.0",
  "expo-sqlite": "~14.0.0",
  "expo-secure-store": "~13.0.0",
  "ffmpeg-kit-react-native": "^6.0.0",
  "react-native-html-to-pdf": "^0.12.0",
  "zustand": "^4.5.0"
}
```

**Backend (Node.js):**

```json
{
  "sarvamai": "latest",
  "openai": "^4.0.0",
  "express": "^4.18.0",
  "bullmq": "^5.0.0",
  "jsonwebtoken": "^9.0.0"
}
```

---

## 12. Sarvam `saaras:v3` Quick-Reference

| Parameter           | Value                                   | Reason                                                 |
| ------------------- | --------------------------------------- | ------------------------------------------------------ |
| `model`             | `saaras:v3`                             | Best accuracy, latest and recommended model            |
| `mode`              | `codemix`                               | Natural Hindi-English and Indian mixed-language speech |
| `withDiarization`   | `true`                                  | Speaker separation — built in, no extra cost           |
| `numSpeakers`       | 2–8                                     | Set to expected count for best diarization accuracy    |
| `language_code`     | omit (auto-detect) or `hi-IN` / `en-IN` | Auto-detect works well with codemix                    |
| `input_audio_codec` | omit unless raw PCM                     | MP3 / WAV / M4A are auto-detected                      |
| `callback.url`      | your backend webhook endpoint           | Async — no polling needed                              |
| Max file duration   | 60 min                                  | One file = one hour                                    |
| Max files per job   | 20                                      | Single job handles up to 20 hours total                |
| Supported speakers  | up to 8 per file                        | Sufficient for meetings, panels, classrooms            |

---

_Architecture version 2.0 — updated with accurate Sarvam `saaras:v3` API, codemix mode, built-in diarization output parsing, webhook-first async flow, and 1-hour chunk strategy._
