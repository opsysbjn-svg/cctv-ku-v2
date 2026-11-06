import React from 'react';
import { CameraStreamMetrics, CameraStatus } from '../../types/camera';
import { HardDrive, Monitor, Video, ShieldCheck, Circle } from 'lucide-react';
import { formatDuration } from '../../utils/formatters';

interface StatusBarProps {
  status: CameraStatus;
  metrics: CameraStreamMetrics | null;
  selectedDeviceLabel?: string;
  totalDevices: number;
  isRecording?: boolean;
  recordingElapsed?: number;
  activeCodec?: string;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  status,
  metrics,
  selectedDeviceLabel,
  totalDevices,
  isRecording = false,
  recordingElapsed = 0,
  activeCodec = 'H.264',
}) => {
  return (
    <footer className="h-8 px-4 bg-slate-900 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between gap-4 shrink-0 select-none font-mono">
      {/* Left: Camera & Stream info */}
      <div className="flex items-center gap-4 truncate">
        <div className="flex items-center gap-1.5 shrink-0">
          <Video className="w-3.5 h-3.5 text-cyan-400" />
          <span>
            {status === 'streaming'
              ? `${selectedDeviceLabel || 'Webcam'} [${metrics?.width || 0}×${metrics?.height || 0} @ ${metrics?.fps || 0}fps]`
              : `${totalDevices} Perangkat Video Terdeteksi`}
          </span>
        </div>

        <span className="text-slate-600 hidden sm:inline">|</span>

        {/* Recording Engine Status */}
        <div className="hidden sm:flex items-center gap-1.5 shrink-0">
          {isRecording ? (
            <div className="flex items-center gap-1.5 text-rose-400 font-semibold">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              <span>REC [{activeCodec.toUpperCase()}] {formatDuration(recordingElapsed)}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-slate-400">
              <HardDrive className="w-3.5 h-3.5 text-cyan-500" />
              <span>Engine: FFmpeg DirectShow / SQLite Aktif</span>
            </div>
          )}
        </div>
      </div>

      {/* Right: Runtime Platform & Security */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="hidden md:flex items-center gap-1 text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Local Storage Only</span>
        </div>
        <div className="flex items-center gap-1 text-slate-300">
          <Monitor className="w-3.5 h-3.5 text-blue-400" />
          <span>Windows Desktop (Tauri 2)</span>
        </div>
      </div>
    </footer>
  );
};
