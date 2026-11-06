import React from 'react';
import { GridMode, CameraStatus, CameraStreamMetrics, CameraErrorState } from '../../types/camera';
import { CameraPreview } from './CameraPreview';
import { Grid, Monitor, Plus, Cctv } from 'lucide-react';

interface CameraGridProps {
  gridMode: GridMode;
  onGridModeChange: (mode: GridMode) => void;
  stream: MediaStream | null;
  status: CameraStatus;
  error: CameraErrorState | null;
  metrics: CameraStreamMetrics | null;
  selectedDeviceName?: string;
  onStart: () => void;
  onRefreshDevices?: () => void;
  onVideoElementReady?: (video: HTMLVideoElement) => void;
}

export const CameraGrid: React.FC<CameraGridProps> = ({
  gridMode,
  onGridModeChange,
  stream,
  status,
  error,
  metrics,
  selectedDeviceName,
  onStart,
  onRefreshDevices,
  onVideoElementReady,
}) => {
  const getSlotCount = () => {
    switch (gridMode) {
      case '2x2':
        return 4;
      case '3x3':
        return 9;
      case '4x4':
        return 16;
      default:
        return 1;
    }
  };

  const getGridClass = () => {
    switch (gridMode) {
      case '2x2':
        return 'grid grid-cols-1 md:grid-cols-2 gap-3';
      case '3x3':
        return 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5';
      case '4x4':
        return 'grid grid-cols-2 md:grid-cols-4 gap-2';
      default:
        return 'w-full';
    }
  };

  const slotCount = getSlotCount();
  const dummySlots = Array.from({ length: Math.max(0, slotCount - 1) }, (_, i) => i + 2);

  return (
    <div className="space-y-3">
      {/* Grid Mode Toolbar */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <Monitor className="w-4 h-4 text-cyan-500" />
          <span>Tampilan Monitor:</span>
          <strong className="text-slate-800 dark:text-slate-200 uppercase font-mono">{gridMode}</strong>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
          {(['1x1', '2x2', '3x3', '4x4'] as GridMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => onGridModeChange(mode)}
              className={`px-2.5 py-1 text-xs font-mono font-medium rounded-md transition-colors cursor-pointer ${
                gridMode === mode
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Grid Container */}
      <div className={getGridClass()}>
        {/* Channel 1: Primary Active Webcam */}
        <div className="relative group">
          <CameraPreview
            stream={stream}
            status={status}
            error={error}
            metrics={metrics}
            selectedDeviceName={selectedDeviceName}
            onStart={onStart}
            onRefreshDevices={onRefreshDevices}
            onVideoElementReady={onVideoElementReady}
            aspectRatio={gridMode === '1x1' ? '16/9' : 'auto'}
            className={gridMode !== '1x1' ? 'h-56 sm:h-64' : ''}
          />
          {gridMode !== '1x1' && (
            <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-blue-600/90 text-white font-mono text-[10px] uppercase font-semibold">
              CH 01 - USB
            </div>
          )}
        </div>

        {/* Dummy Channels for Multi-Grid Preparation (Tahap 2 Architecture) */}
        {dummySlots.map((slotNum) => {
          const chStr = String(slotNum).padStart(2, '0');
          return (
            <div
              key={slotNum}
              className="relative h-56 sm:h-64 rounded-xl bg-slate-950 border border-slate-800/80 flex flex-col items-center justify-center p-4 text-center select-none"
            >
              <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono text-[10px] uppercase">
                CH {chStr}
              </div>

              <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800/80 flex items-center justify-center text-slate-600 mb-2">
                <Cctv className="w-5 h-5" />
              </div>

              <div className="text-xs font-medium text-slate-400">Channel {chStr} Kosong</div>
              <div className="text-[11px] text-slate-600 mt-1">
                Dukungan IP Camera / RTSP Tambahan (Tahap 2)
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
