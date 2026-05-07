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
