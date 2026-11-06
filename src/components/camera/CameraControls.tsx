import React from 'react';
import {
  Play,
  Square,
  Camera,
  RefreshCw,
  Maximize2,
  Sliders,
} from 'lucide-react';
import {
  CameraDevice,
  CameraStatus,
  FpsOption,
  ResolutionId,
} from '../../types/camera';
import { Button } from '../ui/Button';
import { RESOLUTION_PRESETS, FPS_PRESETS } from '../../utils/formatters';

interface CameraControlsProps {
  devices: CameraDevice[];
  selectedDeviceId: string;
  onDeviceChange: (deviceId: string) => void;
  resolution: ResolutionId;
  onResolutionChange: (res: ResolutionId) => void;
  fps: FpsOption;
  onFpsChange: (fps: FpsOption) => void;
  status: CameraStatus;
  onStart: () => void;
  onStop: () => void;
  onSnapshot: () => void;
  onRefresh: () => void;
  onToggleFullscreen?: () => void;
  isDetecting?: boolean;
}

export const CameraControls: React.FC<CameraControlsProps> = ({
  devices,
  selectedDeviceId,
  onDeviceChange,
  resolution,
  onResolutionChange,
  fps,
  onFpsChange,
  status,
  onStart,
  onStop,
  onSnapshot,
  onRefresh,
  onToggleFullscreen,
  isDetecting = false,
}) => {
  const isStreaming = status === 'streaming';
  const isRequesting = status === 'requesting';

  return (
    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Left: Device Selection & Preset Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Device Selector */}
          <div className="flex items-center gap-2">
            <label htmlFor="camera-select" className="text-xs font-semibold text-slate-500 dark:text-slate-400 shrink-0">
              Perangkat:
            </label>
            <select
              id="camera-select"
              value={selectedDeviceId}
              onChange={(e) => onDeviceChange(e.target.value)}
              disabled={devices.length === 0 || isRequesting}
              className="text-xs font-medium px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50 cursor-pointer min-w-[200px]"
            >
              {devices.length === 0 ? (
                <option value="">Tidak ada kamera terdeteksi</option>
              ) : (
                devices.map((device, idx) => (
                  <option key={device.deviceId || idx} value={device.deviceId}>
                    {device.label}
                  </option>
                ))
              )}
            </select>
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              disabled={isDetecting}
              title="Refresh daftar perangkat webcam"
              className="p-2"
            >
              <RefreshCw className={`w-4 h-4 ${isDetecting ? 'animate-spin text-cyan-500' : ''}`} />
            </Button>
          </div>

          <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 hidden md:block" />

          {/* Resolution Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 shrink-0">
              Resolusi:
            </span>
            <select
              value={resolution}
              onChange={(e) => onResolutionChange(e.target.value as ResolutionId)}
              disabled={isRequesting}
              className="text-xs px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500 cursor-pointer"
            >
              {RESOLUTION_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.label}
                </option>
              ))}
            </select>
          </div>

          {/* FPS Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 shrink-0">
              FPS:
            </span>
            <select
              value={fps}
              onChange={(e) => onFpsChange(Number(e.target.value) as FpsOption)}
              disabled={isRequesting}
              className="text-xs px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500 cursor-pointer"
            >
              {FPS_PRESETS.map((item) => (
                <option key={item} value={item}>
                  {item} FPS
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Right: Actions (Start/Stop, Snapshot, Fullscreen) */}
        <div className="flex items-center gap-2.5">
          {!isStreaming ? (
            <Button
              variant="primary"
              size="sm"
              onClick={onStart}
              disabled={devices.length === 0 || isRequesting}
              icon={<Play className="w-4 h-4 fill-current" />}
            >
              {isRequesting ? 'Menghubungkan...' : 'Mulai Preview'}
            </Button>
          ) : (
            <Button
              variant="danger"
              size="sm"
              onClick={onStop}
              icon={<Square className="w-4 h-4 fill-current" />}
            >
              Hentikan Preview
            </Button>
          )}

          <Button
            variant="secondary"
            size="sm"
            onClick={onSnapshot}
            disabled={!isStreaming}
            title="Ambil foto frame (Snapshot)"
            icon={<Camera className="w-4 h-4" />}
          >
            Snapshot
          </Button>

          {onToggleFullscreen && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleFullscreen}
              title="Layar Penuh"
              className="p-2"
            >
              <Maximize2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
