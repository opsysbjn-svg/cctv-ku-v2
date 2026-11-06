import React from 'react';
import {
  Camera,
  Video,
  HardDrive,
  Activity,
  Layers,
  ShieldCheck,
  Play,
  Square,
  Circle,
  RefreshCw,
} from 'lucide-react';
import { StatCard } from '../components/dashboard/StatCard';
import { RecentActivity } from '../components/dashboard/RecentActivity';
import { SystemStatusCard } from '../components/dashboard/SystemStatusCard';
import { CameraPreview } from '../components/camera/CameraPreview';
import { Button } from '../components/ui/Button';
import { CameraDevice, CameraErrorState, CameraStatus, CameraStreamMetrics } from '../types/camera';
import { ActivityLogItem } from '../types/system';
import { LiveRecordingState, StorageMetrics } from '../types/recording';
import { formatBytes, formatDuration } from '../utils/formatters';

interface DashboardProps {
  devices: CameraDevice[];
  selectedDeviceId: string;
  onDeviceChange: (id: string) => void;
  status: CameraStatus;
  stream: MediaStream | null;
  error: CameraErrorState | null;
  metrics: CameraStreamMetrics | null;
  onStart: () => void;
  onStop: () => void;
  onSnapshot: () => void;
  onRefreshDevices: () => void;
  onVideoElementReady?: (video: HTMLVideoElement) => void;
  logs: ActivityLogItem[];
  onClearLogs?: () => void;
  onNavigateToLive: () => void;
  // Phase 2 props
  recordingState: LiveRecordingState;
  storageMetrics: StorageMetrics | null;
  onStartRecording: () => void;
  onRequestStopRecording: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  devices,
  selectedDeviceId,
  onDeviceChange,
  status,
  stream,
  error,
  metrics,
  onStart,
  onStop,
  onSnapshot,
  onRefreshDevices,
  onVideoElementReady,
  logs,
  onClearLogs,
  onNavigateToLive,
  recordingState,
  storageMetrics,
  onStartRecording,
  onRequestStopRecording,
}) => {
  const isStreaming = status === 'streaming';
  const isRecording = recordingState.status === 'recording';
  const totalCameras = devices.length;
  const camerasOnline = isStreaming ? 1 : 0;
  const camerasOffline = isStreaming ? Math.max(0, totalCameras - 1) : totalCameras;
  const selectedDevice = devices.find((d) => d.deviceId === selectedDeviceId);

  return (
    <div className="space-y-6">
      {/* 1. Stat Cards Row (Section F & Phase 2 Real Storage & Recording Data) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <StatCard
          label="Total Cameras"
          value={totalCameras}
          subtext={`${totalCameras} perangkat terdeteksi`}
          icon={<Camera className="w-4 h-4" />}
          variant="default"
        />

        <StatCard
          label="Cameras Online"
          value={camerasOnline}
          subtext={camerasOnline > 0 ? '1 live preview aktif' : '0 kamera aktif'}
          icon={<Video className="w-4 h-4" />}
          variant={camerasOnline > 0 ? 'active' : 'default'}
        />

        <StatCard
          label="Cameras Offline"
          value={camerasOffline}
          subtext={`${camerasOffline} kamera standby`}
          icon={<Layers className="w-4 h-4" />}
          variant="default"
        />

        <StatCard
          label="Active Recording"
          value={isRecording ? 'Merekam' : 'Standby'}
          subtext={
            isRecording
              ? `${recordingState.activeCodec.toUpperCase()} • ${formatDuration(recordingState.elapsedSeconds)}`
              : 'Siap merekam feed webcam'
          }
          icon={<Activity className={`w-4 h-4 ${isRecording ? 'text-rose-500 animate-pulse' : ''}`} />}
          variant={isRecording ? 'active' : 'default'}
        />

        <StatCard
          label="Storage Used"
          value={storageMetrics ? formatBytes(storageMetrics.cctvRecordingsBytes) : '0 B'}
          subtext={
            storageMetrics
              ? `${storageMetrics.totalRecordingsCount} file rekaman tersimpan`
              : 'Database SQLite Lokal'
          }
          icon={<HardDrive className="w-4 h-4" />}
          variant="default"
        />

        <StatCard
          label="Available Storage"
          value={storageMetrics ? formatBytes(storageMetrics.availableDiskBytes) : '—'}
          subtext={
            storageMetrics
              ? `Drive ${storageMetrics.storagePath.slice(0, 3)}`
              : 'Ruang Hard Disk Bebas'
          }
          icon={<ShieldCheck className="w-4 h-4" />}
          variant="default"
        />
      </div>

      {/* 2. Main Center Grid: Live Camera Preview & Camera Devices List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 spans): Quick Live Camera Preview */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Live Camera Preview
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isStreaming
                  ? `Menampilkan ${selectedDevice?.label || 'Webcam'} secara real-time`
                  : 'Webcam standby. Klik "Mulai Preview" untuk mengaktifkan video'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {!isStreaming ? (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={onStart}
                  disabled={devices.length === 0}
                  icon={<Play className="w-3.5 h-3.5 fill-current" />}
                >
                  Mulai Preview
                </Button>
              ) : (
                <>
                  {/* Quick Record Button */}
                  {!isRecording ? (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={onStartRecording}
                      icon={<Circle className="w-3.5 h-3.5 fill-current" />}
                    >
                      Rekam
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={onRequestStopRecording}
                      icon={<Square className="w-3.5 h-3.5 fill-current text-rose-500" />}
                    >
                      Stop Rec ({formatDuration(recordingState.elapsedSeconds)})
                    </Button>
                  )}

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={onStop}
                    icon={<Square className="w-3.5 h-3.5 fill-current" />}
                  >
                    Matikan Kamera
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onSnapshot}
                    icon={<Camera className="w-3.5 h-3.5" />}
                  >
                    Snapshot
                  </Button>
                </>
              )}
              <Button variant="ghost" size="sm" onClick={onNavigateToLive}>
                Buka Layar Penuh
              </Button>
            </div>
          </div>

          <CameraPreview
            stream={stream}
            status={status}
            error={error}
            metrics={metrics}
            selectedDeviceName={selectedDevice?.label}
            onStart={onStart}
            onRefreshDevices={onRefreshDevices}
            onVideoElementReady={onVideoElementReady}
            aspectRatio="16/9"
          />
        </div>

        {/* Right Column (1 span): Device List & Quick Selector */}
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Daftar Perangkat Kamera
              </h3>
              <button
                onClick={onRefreshDevices}
                className="text-slate-400 hover:text-slate-200 p-1 rounded cursor-pointer"
                title="Refresh perangkat"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="mt-3 space-y-2">
              {devices.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  Tidak ada perangkat webcam yang terdeteksi. Hubungkan kamera USB lalu klik refresh.
                </div>
              ) : (
                devices.map((device, idx) => {
                  const isSelected = device.deviceId === selectedDeviceId;
                  const isCurrentStreaming = isSelected && isStreaming;

                  return (
                    <div
                      key={device.deviceId || idx}
                      onClick={() => onDeviceChange(device.deviceId)}
                      className={`p-3 rounded-lg border text-left transition-colors cursor-pointer flex items-center justify-between gap-2 ${
                        isSelected
                          ? 'border-blue-500/60 bg-blue-50/50 dark:bg-blue-950/20'
                          : 'border-slate-200 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                            {device.label}
                          </span>
                        </div>
                        <span className="text-[11px] font-mono text-slate-400 block truncate">
                          ID: {device.deviceId ? device.deviceId.slice(0, 16) + '...' : 'System Default'}
                        </span>
                      </div>

                      <div className="shrink-0 flex items-center gap-1">
                        {isCurrentStreaming ? (
                          <span className="text-[11px] font-semibold text-emerald-500 font-mono">
                            LIVE
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">
                            {isSelected ? 'Dipilih' : 'Siap'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* System Status summary */}
          <SystemStatusCard detectedCamerasCount={totalCameras} />
        </div>
      </div>

      {/* 3. Bottom Row: Recent Activity Log */}
      <RecentActivity logs={logs} onClearLogs={onClearLogs} />
    </div>
  );
};
