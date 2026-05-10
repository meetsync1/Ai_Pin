export interface RecordingMetadata {
  id: string;
  filename: string;
  fileUri: string;
  duration: number;
  createdAt: string;
  title: string;
  tags: string[];
  mimeType: string;
  fileSize: number;
}

export interface AudioRecorderState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  metering: number;
}

export interface RecordingListItem extends RecordingMetadata {
  formattedDuration: string;
  formattedDate: string;
}

export type SessionSourceType = "live" | "upload" | "cloud";
export type SessionStatus =
  | "pending"
  | "transcribing"
  | "summarizing"
  | "ready"
  | "failed";

export interface SessionRecord {
  id: string;
  createdAt: number;
  title: string;
  sourceType: SessionSourceType;
  durationSeconds: number;
  contextTag: string;
  sarvamJobId: string | null;
  status: SessionStatus;
}

export interface SpeakerLabel {
  sessionId: string;
  speakerId: string;
  displayName: string;
}

export interface DiarizedEntry {
  transcript: string;
  start_time_seconds: number;
  end_time_seconds: number;
  speaker_id: string;
}

export interface TranscriptChunk {
  sessionId: string;
  chunkIndex: number;
  rawDiarized: string;
  processedText: string;
  wordCount: number;
}

export interface SummaryTopic {
  topic: string;
  summary: string;
  speaker_contributions: Record<string, string>;
  timestamp_range: string;
}

export interface SummaryActionItem {
  action: string;
  owner: string;
  deadline: string;
}

export interface SummaryQuote {
  speaker: string;
  quote: string;
  timestamp: string;
}

export interface SessionSummary {
  sessionId: string;
  executive_summary: string;
  topic_breakdown: SummaryTopic[];
  action_items: SummaryActionItem[];
  key_decisions: string[];
  child_summary: string;
  key_quotes: SummaryQuote[];
  createdAt: number;
}
