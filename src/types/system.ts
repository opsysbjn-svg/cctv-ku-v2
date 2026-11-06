import { ResolutionId, FpsOption } from './camera';
import { CodecType, CompressionProfile, HwAccelMode } from './recording';

export type ThemeMode = 'dark' | 'light' | 'system';

export type AppPage =
  | 'dashboard'
  | 'live'
  | 'playback'
  | 'cameras'
  | 'motion'
  | 'storage'
  | 'schedule'
  | 'reports'
  | 'settings';

export type LogLevel = 'info' | 'success' | 'warning' | 'error';

export interface ActivityLogItem {
  id: string;
  timestamp: string;
  level: LogLevel;
  category: 'camera' | 'system' | 'storage' | 'network' | 'recording';
  title: string;
  detail: string;
}

export interface AppSettings {
  theme: ThemeMode;
  sidebarCollapsed: boolean;
  defaultResolution: ResolutionId;
  defaultFps: FpsOption;
  snapshotFormat: 'image/jpeg' | 'image/png';
  hardwareAcceleration: boolean;
  // Phase 2: Recording, Compression & Storage Settings
  defaultCodec: CodecType;
  compressionProfile: CompressionProfile;
  customCrf: number;
  segmentDuration: number; // in seconds (300 = 5 min, 600 = 10 min, etc.)
  retentionDays: number; // 0 = never, or 3, 7, 14, 30, 60, 90
  maxDiskQuotaGb: number;
  customStoragePath: string;
  hwAccelMode: HwAccelMode;
  recordAudioWithVideo?: boolean;
  defaultVolume?: number;
}
