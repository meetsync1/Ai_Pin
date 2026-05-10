import {
  chunkAudio,
  convertToWav16kMono,
  hashFile,
} from "@/src/services/audioManager";
import { transcribeWithBackend } from "@/src/services/backendService";
import {
  createSession,
  getSessionById,
  getSessionIdByHash,
  saveAudioHash,
  saveSummary,
  saveTranscriptChunk,
  updateSessionJobId,
  updateSessionStatus,
} from "@/src/storage/sessionStore";
import { SessionSourceType } from "@/src/types";

export async function runTranscriptionWorkflow(input: {
  audioUri: string;
  durationSeconds: number;
  title: string;
  sourceType: SessionSourceType;
  contextTag: string;
  numSpeakers: number;
}) {
  const audioHash = await hashFile(input.audioUri);
  const existingSessionId = await getSessionIdByHash(audioHash);
  if (existingSessionId) {
    const existingSession = await getSessionById(existingSessionId);
    if (existingSession) {
      return existingSession.id;
    }
  }

  const session = await createSession({
    title: input.title,
    sourceType: input.sourceType,
    durationSeconds: input.durationSeconds,
    contextTag: input.contextTag,
  });

  await saveAudioHash(audioHash, session.id);

  try {
    await updateSessionStatus(session.id, "transcribing");

    const wavUri = await convertToWav16kMono(input.audioUri);
    const chunks = await chunkAudio(wavUri, input.durationSeconds);
    const files = chunks.map((uri, index) => ({
      uri,
      name: `chunk_${index}.wav`,
      type: "audio/wav",
    }));

    const response = await transcribeWithBackend({
      sessionId: session.id,
      contextTag: input.contextTag,
      numSpeakers: input.numSpeakers,
      sourceType: input.sourceType,
      files,
      waitForCompletion: true,
    });

    if (response.job_id) {
      await updateSessionJobId(session.id, response.job_id);
    }

    if (response.status !== "ready") {
      await updateSessionStatus(session.id, "transcribing");
      return session.id;
    }

    if (response.chunks?.length) {
      for (const chunk of response.chunks) {
        await saveTranscriptChunk({
          sessionId: session.id,
          chunkIndex: chunk.chunk_index,
          rawDiarized: chunk.raw_diarized,
          processedText: chunk.processed_text,
          wordCount: chunk.word_count,
        });
      }
    }

    if (response.summary) {
      await saveSummary({
        sessionId: session.id,
        executive_summary: response.summary.summary,
        topic_breakdown: [],
        action_items: response.summary.action_items ?? [],
        key_decisions: response.summary.key_points ?? [],
        child_summary: "",
        key_quotes: [],
        createdAt: Date.now(),
      });
    }

    await updateSessionStatus(session.id, "ready");
    return session.id;
  } catch (error) {
    await updateSessionStatus(session.id, "failed");
    throw error;
  }
}
