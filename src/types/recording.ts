export type RecordingStatus = 'idle' | 'recording' | 'stopping' | 'error';

export type CodecType = 'h264' | 'h265';

export type CompressionProfile = 'space_saver' | 'balanced' | 'high_quality' | 'custom';

export type HwAccelMode = 'auto' | 'cpu' | 'nvenc' | 'qsv' | 'amf';

export interface RecordingItem {
  id: string;
  cameraId: string;
  cameraName: string;
  fileName: string;
  filePath: string;
  codec: string;
  resolution: string;
  fps: number;
  bitrate: number;
  duration: number; // in seconds
  fileSize: number; // in bytes
  startTime: string; // ISO string
  endTime: string; // ISO string
  recordingStatus: 'completed' | 'recording' | 'interrupted' | 'missing';
  isLocked: boolean;
  createdAt: string;
  blobUrl?: string; // used for in-browser video playback
  hasAudio?: boolean;
}

export interface RecordingConfig {
  cameraId: string;
  cameraName: string;
  resolution: string;
  fps: number;
  codec: CodecType;
  profile: CompressionProfile;
  customCrf?: number;
  segmentDuration: number; // in seconds, e.g. 300 = 5 min
  outputDir?: string;
  hwAccel: HwAccelMode;
  recordAudio?: boolean;
}

export interface LiveRecordingState {
  status: RecordingStatus;
  cameraName: string;
  elapsedSeconds: number;
  currentFileSizeBytes: number;
  activeCodec: string;
  activeEncoder: string;
  segmentCount: number;
  errorMessage?: string;
  hasAudio?: boolean;
}

export interface StorageMetrics {
  totalDiskBytes: number;
  usedDiskBytes: number;
  availableDiskBytes: number;
  cctvRecordingsBytes: number;
  totalRecordingsCount: number;
  todayRecordingsCount: number;
  storagePath: string;
  maxQuotaGb: number;
}

export interface FFmpegStatus {
  isAvailable: boolean;
  version: string;
  binaryPath: string;
  hasLibx264: boolean;
  hasLibx265: boolean;
  hasNvenc: boolean;
  hasQsv: boolean;
  hasAmf: boolean;
  availableEncoders?: string[];
}

export interface CleanupReport {
  checkedCount: number;
  deletedCount: number;
  freedBytes: number;
  skippedLockedCount: number;
  skippedRecordingCount: number;
  failedCount: number;
  executedAt: string;
  status: 'success' | 'failed' | 'empty';
  message: string;
}
