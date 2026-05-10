import { openDatabaseSync, type SQLiteDatabase } from "expo-sqlite";

export const db: SQLiteDatabase = openDatabaseSync("transcriptor.db");

export type SqlBind = string | number | null;

function normalizeParams(params: unknown[]): SqlBind[] {
  return params.map((param) => {
    if (param === undefined || param === null) {
      return null;
    }
    if (typeof param === "string" || typeof param === "number") {
      return param;
    }
    if (typeof param === "boolean") {
      return param ? 1 : 0;
    }
    if (typeof param === "object") {
      console.warn("normalizeParams: coercing object param", {
        type: Object.prototype.toString.call(param),
      });
    }
    const json = JSON.stringify(param);
    return json ?? String(param);
  });
}

export async function runSql(sql: string, params: unknown[] = []) {
  const normalized = normalizeParams(params);
  try {
    return await db.runAsync(sql, ...normalized);
  } catch (error) {
    console.error("runSql failed", { sql, params: normalized });
    throw error;
  }
}

export async function getAllSql<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
) {
  const normalized = normalizeParams(params);
  try {
    return await db.getAllAsync<T>(sql, ...normalized);
  } catch (error) {
    console.error("getAllSql failed", { sql, params: normalized });
    throw error;
  }
}

export async function getFirstSql<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
) {
  const normalized = normalizeParams(params);
  try {
    return await db.getFirstAsync<T>(sql, ...normalized);
  } catch (error) {
    console.error("getFirstSql failed", { sql, params: normalized });
    throw error;
  }
}

export async function initializeDatabase() {
  await db.execAsync(
    [
      "CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY NOT NULL, created_at INTEGER NOT NULL, title TEXT, source_type TEXT, duration_s INTEGER, context_tag TEXT, sarvam_job_id TEXT, status TEXT)",
      "CREATE TABLE IF NOT EXISTS speaker_labels (session_id TEXT NOT NULL, speaker_id TEXT NOT NULL, display_name TEXT, PRIMARY KEY (session_id, speaker_id))",
      "CREATE TABLE IF NOT EXISTS transcripts (session_id TEXT NOT NULL, chunk_index INTEGER NOT NULL, raw_diarized TEXT, processed_text TEXT, word_count INTEGER, PRIMARY KEY (session_id, chunk_index))",
      "CREATE TABLE IF NOT EXISTS summaries (session_id TEXT PRIMARY KEY NOT NULL, executive_summary TEXT, topic_breakdown TEXT, action_items TEXT, key_decisions TEXT, child_summary TEXT, key_quotes TEXT, created_at INTEGER)",
      "CREATE TABLE IF NOT EXISTS audio_hashes (hash TEXT PRIMARY KEY NOT NULL, session_id TEXT NOT NULL)",
    ].join(";"),
  );
}
