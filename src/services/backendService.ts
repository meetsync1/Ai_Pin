import { ENV, requireEnv } from "@/src/config/env";
import { SessionSourceType } from "@/src/types";

export interface BackendTranscriptChunk {
  chunk_index: number;
  raw_diarized: string;
  processed_text: string;
  word_count: number;
}

/** Simplified summary — English only, always produced by Groq. */
export interface BackendSummaryPayload {
  summary: string;
  key_points: string[];
  action_items: Array<
    string | { action?: string; owner?: string; deadline?: string }
  >;
}

export interface BackendTranscriptionResponse {
  session_id: string;
  job_id: string;
  status: "transcribing" | "summarizing" | "ready" | "failed";
  chunks?: BackendTranscriptChunk[];
  summary?: BackendSummaryPayload;
}

function getBaseUrl() {
  return requireEnv(ENV.backendUrl, "EXPO_PUBLIC_BACKEND_URL");
}

/** POST /api/transcribe — upload audio and start transcription + summarization. */
export async function transcribeWithBackend(input: {
  sessionId: string;
  contextTag: string;
  numSpeakers: number;
  sourceType: SessionSourceType;
  files: { uri: string; name: string; type: string }[];
  waitForCompletion?: boolean;
}) {
  const baseUrl = getBaseUrl();
  const form = new FormData();
  form.append("session_id", input.sessionId);
  form.append("context_tag", input.contextTag);
  form.append("num_speakers", String(input.numSpeakers));
  form.append("source_type", input.sourceType);
  form.append(
    "wait_for_completion",
    input.waitForCompletion === false ? "false" : "true",
  );
  for (const file of input.files) {
    form.append("files", {
      uri: file.uri,
      name: file.name,
      type: file.type,
    } as any);
  }

  const response = await fetch(`${baseUrl}/api/transcribe`, {
    method: "POST",
    body: form,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Backend transcribe failed: ${response.status} ${errorText}`,
    );
  }
  return (await response.json()) as BackendTranscriptionResponse;
}

/** GET /api/session/{sessionId} — fetch session status, chunks, and summary. */
export async function fetchBackendSession(sessionId: string) {
  const baseUrl = getBaseUrl();
  const response = await fetch(`${baseUrl}/api/session/${sessionId}`);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Backend session failed: ${response.status} ${errorText}`);
  }
  return (await response.json()) as BackendTranscriptionResponse & {
    context_tag?: string;
    num_speakers?: number;
    source_type?: SessionSourceType;
  };
}

/** POST /api/session/{sessionId}/retry-summary — re-run Groq summarization. */
export async function retrySummary(sessionId: string) {
  const baseUrl = getBaseUrl();
  const response = await fetch(
    `${baseUrl}/api/session/${sessionId}/retry-summary`,
    {
      method: "POST",
    },
  );
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Retry summary failed: ${response.status} ${errorText}`);
  }
  return (await response.json()) as BackendTranscriptionResponse;
}

/** GET /health — verify backend is running and env vars are configured. */
export async function checkBackendHealth() {
  const baseUrl = getBaseUrl();
  const response = await fetch(`${baseUrl}/health`);
  if (!response.ok) {
    throw new Error(`Health check failed: ${response.status}`);
  }
  return response.json() as Promise<{
    status: "ok" | "degraded";
    issues: string[];
    sarvam_job_base: string;
    groq_model: string;
    groq_base: string;
    webhook_mode: boolean;
  }>;
}
