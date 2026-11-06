import React, { useState, useRef } from 'react';
import {
  CameraDevice,
  CameraErrorState,
  CameraStatus,
  CameraStreamMetrics,
  FpsOption,
  GridMode,
  ResolutionId,
} from '../types/camera';
import { LiveRecordingState } from '../types/recording';
import { CameraControls } from '../components/camera/CameraControls';
import { CameraGrid } from '../components/camera/CameraGrid';
import { RecordingControlBar } from '../components/camera/RecordingControlBar';
import { StopConfirmModal } from '../components/camera/StopConfirmModal';
import { Info, Maximize, Shield, Sliders } from 'lucide-react';

interface LiveMonitoringProps {
  devices: CameraDevice[];
  selectedDeviceId: string;
  onDeviceChange: (id: string) => void;
  resolution: ResolutionId;
  onResolutionChange: (res: ResolutionId) => void;
  fps: FpsOption;
  onFpsChange: (fps: FpsOption) => void;
  status: CameraStatus;
  stream: MediaStream | null;
  error: CameraErrorState | null;
  metrics: CameraStreamMetrics | null;
  onStart: () => void;
  onStop: () => void;
  onSnapshot: () => void;
  onRefreshDevices: () => void;
  onVideoElementReady?: (video: HTMLVideoElement) => void;
  // Phase 2 Recording integration
  recordingState: LiveRecordingState;
  onStartRecording: () => void;
  onRequestStopRecording: () => void;
  onConfirmStopRecording: () => void;
  onCancelStopRecording: () => void;
  isStopConfirmOpen: boolean;
}

export const LiveMonitoring: React.FC<LiveMonitoringProps> = ({
  devices,
  selectedDeviceId,
  onDeviceChange,
  resolution,
  onResolutionChange,
  fps,
  onFpsChange,
  status,
  stream,
  error,
  metrics,
  onStart,
  onStop,
  onSnapshot,
  onRefreshDevices,
  onVideoElementReady,
  recordingState,
  onStartRecording,
  onRequestStopRecording,
  onConfirmStopRecording,
  onCancelStopRecording,
  isStopConfirmOpen,
}) => {
  const [gridMode, setGridMode] = useState<GridMode>('1x1');
  const containerRef = useRef<HTMLDivElement | null>(null);

  const selectedDevice = devices.find((d) => d.deviceId === selectedDeviceId);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch((err) => {
        console.warn('Gagal masuk mode fullscreen:', err);
      });
    } else {
      document.exitFullscreen().catch((err) => {
        console.warn('Gagal keluar mode fullscreen:', err);
      });
    }
  };

  const isStreaming = status === 'streaming';

  return (
    <div ref={containerRef} className="space-y-4 bg-slate-100 dark:bg-slate-950 p-1 md:p-2 rounded-xl transition-colors">
      {/* 1. Camera Control Bar */}
      <CameraControls
        devices={devices}
        selectedDeviceId={selectedDeviceId}
        onDeviceChange={onDeviceChange}
        resolution={resolution}
        onResolutionChange={onResolutionChange}
        fps={fps}
        onFpsChange={onFpsChange}
        status={status}
        onStart={onStart}
        onStop={onStop}
        onSnapshot={onSnapshot}
        onRefresh={onRefreshDevices}
        onToggleFullscreen={toggleFullscreen}
      />

      {/* 2. Phase 2: FFmpeg Recording Control Bar */}
      <RecordingControlBar
        recordingState={recordingState}
        onStart={onStartRecording}
        onRequestStop={onRequestStopRecording}
        canStart={isStreaming}
        selectedCameraName={selectedDevice?.label}
      />

      {/* 3. Live Camera Grid Viewport */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 transition-colors">
        <CameraGrid
          gridMode={gridMode}
          onGridModeChange={setGridMode}
          stream={stream}
          status={status}
          error={error}
          metrics={metrics}
          selectedDeviceName={selectedDevice?.label}
          onStart={onStart}
          onRefreshDevices={onRefreshDevices}
          onVideoElementReady={onVideoElementReady}
        />
      </div>

      {/* 4. Stream Telemetry & Technical Metrics Details */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2.5">
          <Sliders className="w-4 h-4 text-cyan-500 shrink-0" />
          <div className="min-w-0">
            <span className="text-slate-400 block text-[10px]">STATUS STREAM</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
              {status === 'streaming' ? 'Live Streaming Aktif' : status === 'requesting' ? 'Menghubungkan...' : 'Standby / Mati'}
            </span>
          </div>
        </div>

        <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2.5">
          <Maximize className="w-4 h-4 text-blue-500 shrink-0" />
          <div className="min-w-0">
            <span className="text-slate-400 block text-[10px]">RESOLUSI AKTUAL</span>
            <span className="font-semibold font-mono text-slate-800 dark:text-slate-200 truncate block">
              {metrics?.width && metrics?.height ? `${metrics.width} × ${metrics.height} (${metrics.aspectRatio})` : '—'}
            </span>
          </div>
        </div>

        <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2.5">
          <Info className="w-4 h-4 text-emerald-500 shrink-0" />
          <div className="min-w-0">
            <span className="text-slate-400 block text-[10px]">FRAME RATE (FPS)</span>
            <span className="font-semibold font-mono text-slate-800 dark:text-slate-200 truncate block">
              {metrics?.fps ? `${metrics.fps} FPS` : '—'}
            </span>
          </div>
        </div>

        <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2.5">
          <Shield className="w-4 h-4 text-purple-500 shrink-0" />
          <div className="min-w-0">
            <span className="text-slate-400 block text-[10px]">RECORDING ENGINE</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
              {recordingState.status === 'recording'
                ? `Merekam [${recordingState.activeCodec.toUpperCase()}]`
                : 'DirectShow / FFmpeg H.264 & H.265'}
            </span>
          </div>
        </div>
      </div>

      {/* Stop Confirmation Dialog */}
      <StopConfirmModal
        isOpen={isStopConfirmOpen}
        onCancel={onCancelStopRecording}
        onConfirm={onConfirmStopRecording}
        elapsedSeconds={recordingState.elapsedSeconds}
        cameraName={recordingState.cameraName || selectedDevice?.label || 'Kamera'}
      />
    </div>
  );
};
