import {
  SessionRecord,
  SessionStatus,
  SessionSummary,
  SpeakerLabel,
  TranscriptChunk,
} from "@/src/types";
import { getAllSql, getFirstSql, initializeDatabase, runSql } from "./db";

let initialized = false;

async function ensureInit() {
  if (!initialized) {
    await initializeDatabase();
    initialized = true;
  }
}

function mapSession(row: any): SessionRecord {
  return {
    id: row.id,
    createdAt: row.created_at,
    title: row.title ?? "Untitled Session",
    sourceType: row.source_type,
    durationSeconds: row.duration_s ?? 0,
    contextTag: row.context_tag ?? "business_meeting",
    sarvamJobId: row.sarvam_job_id,
    status: row.status as SessionStatus,
  };
}

export async function createSession(
  input: Omit<SessionRecord, "id" | "createdAt" | "status" | "sarvamJobId">,
) {
  await ensureInit();
  const id = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const createdAt = Date.now();
  const status: SessionStatus = "pending";
  await runSql(
    "INSERT INTO sessions (id, created_at, title, source_type, duration_s, context_tag, sarvam_job_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [
      id,
      createdAt,
      input.title,
      input.sourceType,
      input.durationSeconds,
      input.contextTag,
      "",
      status,
    ],
  );
  return { id, createdAt, status, sarvamJobId: "", ...input };
}

export async function updateSessionStatus(
  sessionId: string,
  status: SessionStatus,
) {
  await ensureInit();
  await runSql("UPDATE sessions SET status = ? WHERE id = ?", [
    status,
    sessionId,
  ]);
}

export async function updateSessionJobId(sessionId: string, jobId: string) {
  await ensureInit();
  await runSql("UPDATE sessions SET sarvam_job_id = ? WHERE id = ?", [
    jobId,
    sessionId,
  ]);
}

export async function updateSessionTitle(sessionId: string, title: string) {
  await ensureInit();
  await runSql("UPDATE sessions SET title = ? WHERE id = ?", [
    title,
    sessionId,
  ]);
}

export async function deleteSession(sessionId: string) {
  await ensureInit();
  await runSql("DELETE FROM transcripts WHERE session_id = ?", [sessionId]);
  await runSql("DELETE FROM summaries WHERE session_id = ?", [sessionId]);
  await runSql("DELETE FROM speaker_labels WHERE session_id = ?", [sessionId]);
  await runSql("DELETE FROM audio_hashes WHERE session_id = ?", [sessionId]);
  await runSql("DELETE FROM sessions WHERE id = ?", [sessionId]);
}

export async function getSessions(): Promise<SessionRecord[]> {
  await ensureInit();
  const rows = await getAllSql<any>(
    "SELECT * FROM sessions ORDER BY created_at DESC",
  );
  return rows.map(mapSession);
}

export async function getSessionById(
  sessionId: string,
): Promise<SessionRecord | null> {
  await ensureInit();
  const row = await getFirstSql<any>("SELECT * FROM sessions WHERE id = ?", [
    sessionId,
  ]);
  return row ? mapSession(row) : null;
}

export async function saveSpeakerLabel(label: SpeakerLabel) {
  await ensureInit();
  await runSql(
    "INSERT OR REPLACE INTO speaker_labels (session_id, speaker_id, display_name) VALUES (?, ?, ?)",
    [label.sessionId, label.speakerId, label.displayName],
  );
}

export async function getSpeakerLabels(
  sessionId: string,
): Promise<Record<string, string>> {
  await ensureInit();
  const result = await getAllSql<any>(
    "SELECT * FROM speaker_labels WHERE session_id = ?",
    [sessionId],
  );
  const labels: Record<string, string> = {};
  for (const row of result) {
    labels[row.speaker_id] = row.display_name;
  }
  return labels;
}

export async function saveTranscriptChunk(chunk: TranscriptChunk) {
  await ensureInit();
  await runSql(
    "INSERT OR REPLACE INTO transcripts (session_id, chunk_index, raw_diarized, processed_text, word_count) VALUES (?, ?, ?, ?, ?)",
    [
      chunk.sessionId,
      chunk.chunkIndex,
      typeof chunk.rawDiarized === "string"
        ? chunk.rawDiarized
        : JSON.stringify(chunk.rawDiarized ?? {}),
      typeof chunk.processedText === "string"
        ? chunk.processedText
        : JSON.stringify(chunk.processedText ?? ""),
      typeof chunk.wordCount === "number"
        ? chunk.wordCount
        : Number(chunk.wordCount) || 0,
    ],
  );
}

export async function getTranscriptsBySession(
  sessionId: string,
): Promise<TranscriptChunk[]> {
  await ensureInit();
  const result = await getAllSql<any>(
    "SELECT * FROM transcripts WHERE session_id = ? ORDER BY chunk_index ASC",
    [sessionId],
  );
  return result.map((row: any) => ({
    sessionId: row.session_id,
    chunkIndex: row.chunk_index,
    rawDiarized: row.raw_diarized,
    processedText: row.processed_text,
    wordCount: row.word_count,
  }));
}

export async function saveSummary(summary: SessionSummary) {
  await ensureInit();
  const topicBreakdown = JSON.stringify(summary.topic_breakdown ?? []);
  const actionItems = JSON.stringify(summary.action_items ?? []);
  const keyDecisions = JSON.stringify(summary.key_decisions ?? []);
  const keyQuotes = JSON.stringify(summary.key_quotes ?? []);
  await runSql(
    "INSERT OR REPLACE INTO summaries (session_id, executive_summary, topic_breakdown, action_items, key_decisions, child_summary, key_quotes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [
      summary.sessionId,
      summary.executive_summary ?? "",
      topicBreakdown,
      actionItems,
      keyDecisions,
      summary.child_summary ?? "",
      keyQuotes,
      summary.createdAt ?? Date.now(),
    ],
  );
}

export async function getSummary(
  sessionId: string,
): Promise<SessionSummary | null> {
  await ensureInit();
  const row = await getFirstSql<any>(
    "SELECT * FROM summaries WHERE session_id = ?",
    [sessionId],
  );
  if (!row) {
    return null;
  }
  return {
    sessionId: row.session_id,
    executive_summary: row.executive_summary ?? "",
    topic_breakdown: row.topic_breakdown ? JSON.parse(row.topic_breakdown) : [],
    action_items: row.action_items ? JSON.parse(row.action_items) : [],
    key_decisions: row.key_decisions ? JSON.parse(row.key_decisions) : [],
    child_summary: row.child_summary ?? "",
    key_quotes: row.key_quotes ? JSON.parse(row.key_quotes) : [],
    createdAt: row.created_at ?? 0,
  };
}

export async function getSessionIdByHash(hash: string) {
  await ensureInit();
  const row = await getFirstSql<any>(
    "SELECT session_id FROM audio_hashes WHERE hash = ?",
    [hash],
  );
  return row?.session_id ?? null;
}

export async function saveAudioHash(hash: string, sessionId: string) {
  await ensureInit();
  await runSql(
    "INSERT OR REPLACE INTO audio_hashes (hash, session_id) VALUES (?, ?)",
    [hash, sessionId],
  );
}
