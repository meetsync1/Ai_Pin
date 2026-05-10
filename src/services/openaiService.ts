/**
 * openaiService.ts
 *
 * ARCHITECTURE NOTE:
 * The frontend NEVER calls OpenAI directly.
 * Summarization is handled exclusively by the backend (/api/transcribe returns
 * the summary in the response, and /api/session/{id}/retry-summary re-runs it).
 *
 * This file is intentionally a stub — it only re-exports types used by the UI.
 * Do NOT add any fetch() calls to openai.com from this file.
 */

export type { BackendSummaryPayload as SummaryPayload } from "@/src/services/backendService";
