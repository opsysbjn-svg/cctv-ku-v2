export interface CameraDevice {
  deviceId: string;
  label: string;
  groupId?: string;
}

export type ResolutionId = '480p' | '720p' | '1080p' | 'auto';

export interface ResolutionOption {
  id: ResolutionId;
  label: string;
  width?: number;
  height?: number;
  description: string;
}

export type FpsOption = 10 | 15 | 24 | 30;

export type CameraStatus = 'idle' | 'requesting' | 'streaming' | 'error';

export interface CameraStreamMetrics {
  width: number;
  height: number;
  fps: number;
  aspectRatio: string;
  facingMode?: string;
  deviceId?: string;
  deviceName?: string;
  hasAudio?: boolean;
  audioTrackLabel?: string;
}

export interface CameraErrorState {
  code: 'NOT_FOUND' | 'PERMISSION_DENIED' | 'DEVICE_BUSY' | 'UNSUPPORTED_RESOLUTION' | 'DISCONNECTED' | 'UNKNOWN';
  title: string;
  message: string;
  resolutionHint?: string;
}

export interface SnapshotData {
  id: string;
  timestamp: string;
  dataUrl: string;
  width: number;
  height: number;
  deviceName: string;
}

export type GridMode = '1x1' | '2x2' | '3x3' | '4x4';
