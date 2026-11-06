import React from 'react';
import { Circle, Square, HardDrive, Cpu, Film, AlertTriangle, Mic, MicOff } from 'lucide-react';
import { LiveRecordingState } from '../../types/recording';
import { formatBytes, formatDuration } from '../../utils/formatters';
import { Button } from '../ui/Button';

interface RecordingControlBarProps {
  recordingState: LiveRecordingState;
  onStart: () => void;
  onRequestStop: () => void;
  canStart: boolean;
  selectedCameraName?: string;
}

export const RecordingControlBar: React.FC<RecordingControlBarProps> = ({
  recordingState,
  onStart,
  onRequestStop,
  canStart,
  selectedCameraName,
}) => {
  const isRecording = recordingState.status === 'recording';
  const isStopping = recordingState.status === 'stopping';

  return (
    <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors flex flex-wrap items-center justify-between gap-3 text-xs">
      {/* Left: Recording Status & Live Counters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Status Badge */}
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60">
          {isRecording ? (
            <>
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse shrink-0" />
              <span className="font-semibold text-rose-600 dark:text-rose-400 font-mono tracking-wide">
                REC
              </span>
            </>
          ) : isStopping ? (
            <>
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
              <span className="font-medium text-amber-600 dark:text-amber-400">
                Menyelesaikan Segmen...
              </span>
            </>
          ) : (
            <>
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400 dark:bg-slate-600 shrink-0" />
              <span className="font-medium text-slate-500 dark:text-slate-400">
                Standby Perekaman
              </span>
            </>
          )}
        </div>

        {/* Live Duration Timer */}
        {isRecording && (
          <div className="flex items-center gap-1.5 font-mono px-2.5 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300">
            <span className="text-[10px] text-rose-500 font-sans font-semibold">DURASI:</span>
            <span className="text-sm font-bold tracking-tight">
              {formatDuration(recordingState.elapsedSeconds)}
            </span>
          </div>
        )}

        {/* Audio Recording Status */}
        {isRecording && (
          <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 font-mono text-emerald-700 dark:text-emerald-300">
            {recordingState.hasAudio !== false ? (
              <>
                <Mic className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
                <span className="text-[11px] font-semibold">AUDIO REC</span>
              </>
            ) : (
              <>
                <MicOff className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[11px] text-slate-400">NO AUDIO</span>
              </>
            )}
          </div>
        )}

        {/* Growing File Size */}
        {isRecording && (
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-slate-800 dark:text-slate-200">
            <HardDrive className="w-3.5 h-3.5 text-cyan-500" />
            <span>{formatBytes(recordingState.currentFileSizeBytes)}</span>
          </div>
        )}

        {/* Active Codec & Encoder details */}
        {isRecording && (
          <div className="hidden md:flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
            <Cpu className="w-3.5 h-3.5 text-blue-500" />
            <span>Encoder:</span>
            <strong className="text-slate-800 dark:text-slate-200 font-mono">
              {recordingState.activeEncoder}
            </strong>
          </div>
        )}

        {/* Active Segment Count */}
        {isRecording && recordingState.segmentCount > 0 && (
          <div className="hidden lg:flex items-center gap-1 text-slate-500 dark:text-slate-400">
            <Film className="w-3.5 h-3.5 text-purple-500" />
            <span>Segmen Ke:</span>
            <strong className="text-slate-800 dark:text-slate-200 font-mono">
              #{recordingState.segmentCount}
            </strong>
          </div>
        )}

        {!isRecording && (
          <div className="hidden sm:flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 font-mono">
              <Mic className="w-3 h-3" />
              MIC AKTIF
            </span>
            <span>
              Siap merekam feed dari <strong className="text-slate-700 dark:text-slate-300">{selectedCameraName || 'Kamera'}</strong> (Video + Audio)
            </span>
          </div>
        )}
      </div>

      {/* Right: Action Buttons */}
      <div className="flex items-center gap-2">
        {!isRecording ? (
          <Button
            variant="danger"
            size="sm"
            onClick={onStart}
            disabled={!canStart || isStopping}
            icon={<Circle className="w-3.5 h-3.5 fill-current" />}
          >
            Mulai Merekam
          </Button>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            onClick={onRequestStop}
            disabled={isStopping}
            icon={<Square className="w-3.5 h-3.5 fill-current text-rose-500" />}
          >
            {isStopping ? 'Menghentikan...' : 'Stop Recording'}
          </Button>
        )}
      </div>
    </div>
  );
};
