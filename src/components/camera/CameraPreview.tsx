import React, { useEffect, useRef, useState } from 'react';
import {
  CameraStatus,
  CameraStreamMetrics,
  CameraErrorState,
} from '../../types/camera';
import {
  VideoOff,
  Video,
  AlertCircle,
  Loader2,
  RefreshCw,
  Sliders,
  Cctv,
  Volume2,
  Volume1,
  VolumeX,
  Plus,
  Minus,
  Mic,
  MicOff,
} from 'lucide-react';
import { Button } from '../ui/Button';

interface CameraPreviewProps {
  stream: MediaStream | null;
  status: CameraStatus;
  error: CameraErrorState | null;
  metrics: CameraStreamMetrics | null;
  selectedDeviceName?: string;
  onStart: () => void;
  onRefreshDevices?: () => void;
  onVideoElementReady?: (video: HTMLVideoElement) => void;
  aspectRatio?: '16/9' | '4/3' | 'auto';
  className?: string;
}

export const CameraPreview: React.FC<CameraPreviewProps> = ({
  stream,
  status,
  error,
  metrics,
  selectedDeviceName = 'Kamera 01',
  onStart,
  onRefreshDevices,
  onVideoElementReady,
  aspectRatio = '16/9',
  className = '',
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [currentTimeStr, setCurrentTimeStr] = useState<string>('');

  // Audio volume state
  const [volume, setVolume] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('cctv_live_volume');
      return saved ? parseInt(saved, 10) : 80;
    } catch {
      return 80;
    }
  });
  // Default muted on live preview to prevent acoustic feedback loop until user enables sound
  const [isMuted, setIsMuted] = useState<boolean>(true);

  // Keep HUD time updated
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTimeStr(
        now.toLocaleDateString('id-ID', { year: 'numeric', month: '2-digit', day: '2-digit' }) +
          ' ' +
          now.toLocaleTimeString('id-ID', { hour12: false })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Sync MediaStream to HTMLVideoElement when stream changes or mounts
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (stream) {
      if (video.srcObject !== stream) {
        video.srcObject = stream;
        video
          .play()
          .catch((err) => console.warn('Video play was interrupted or autoPlay blocked:', err));
      }
      if (onVideoElementReady) {
        onVideoElementReady(video);
      }
    } else {
      video.srcObject = null;
    }
  }, [stream, onVideoElementReady]);

  // Apply volume and mute settings to video element
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.volume = volume / 100;
      video.muted = isMuted;
    }
  }, [volume, isMuted]);

  const handleVolumeChange = (newVol: number) => {
    const clamped = Math.max(0, Math.min(100, newVol));
    setVolume(clamped);
    if (clamped > 0 && isMuted) {
      setIsMuted(false);
    } else if (clamped === 0) {
      setIsMuted(true);
    }
    try {
      localStorage.setItem('cctv_live_volume', clamped.toString());
    } catch {
      // ignore
    }
  };

  const handleVolumeDown = () => {
    const next = Math.max(0, volume - 10);
    setVolume(next);
    if (next === 0) {
      setIsMuted(true);
    }
    try {
      localStorage.setItem('cctv_live_volume', next.toString());
    } catch {
      // ignore
    }
  };

  const handleVolumeUp = () => {
    const next = Math.min(100, volume + 10);
    setVolume(next);
    setIsMuted(false);
    try {
      localStorage.setItem('cctv_live_volume', next.toString());
    } catch {
      // ignore
    }
  };

  const toggleMute = () => {
    setIsMuted((prev) => !prev);
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current && onVideoElementReady) {
      onVideoElementReady(videoRef.current);
    }
  };

  return (
    <div
      className={`relative w-full overflow-hidden rounded-xl bg-slate-950 border border-slate-800 text-slate-100 flex items-center justify-center select-none shadow-inner ${
        aspectRatio === '16/9' ? 'aspect-video' : aspectRatio === '4/3' ? 'aspect-4/3' : 'min-h-[380px]'
      } ${className}`}
    >
      {/* 1. Live Video Stream */}
      {status === 'streaming' && stream && (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isMuted}
          onError={(e) => {
            // Prevent uncaught source errors in browser console
            e.preventDefault();
          }}
          onLoadedMetadata={handleLoadedMetadata}
          className="w-full h-full object-contain block"
        />
      )}

      {/* 2. HUD Watermark / Overlay (Visible when streaming) */}
      {status === 'streaming' && (
        <div className="absolute inset-0 pointer-events-none p-3 sm:p-4 flex flex-col justify-between">
          {/* Top HUD: Channel, Live status, Audio status & Clock */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-slate-900/80 backdrop-blur-xs border border-slate-700/60 font-mono text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-semibold text-emerald-400">LIVE</span>
                <span className="text-slate-500">|</span>
                <span className="text-slate-200 truncate max-w-[180px]">{selectedDeviceName}</span>
              </div>

              {/* Audio Stream Status Indicator */}
              <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-900/80 backdrop-blur-xs border border-slate-700/60 font-mono text-[10px]">
                {metrics?.hasAudio ? (
                  <>
                    <Mic className="w-3 h-3 text-emerald-400 animate-pulse" />
                    <span className="text-emerald-300 font-medium">AUDIO REC ON</span>
                  </>
                ) : (
                  <>
                    <MicOff className="w-3 h-3 text-slate-500" />
                    <span className="text-slate-400">AUDIO OFF</span>
                  </>
                )}
              </div>
            </div>

            <div className="px-2.5 py-1 rounded bg-slate-900/80 backdrop-blur-xs border border-slate-700/60 font-mono text-xs text-cyan-300">
              {currentTimeStr}
            </div>
          </div>

          {/* Bottom HUD: Camera tag, Interactive Sound Controls (+ -), Resolution & FPS */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
            <div className="px-2 py-0.5 rounded bg-slate-900/80 backdrop-blur-xs border border-slate-700/60 text-slate-300">
              CCTV-KU CAM #01
            </div>

            {/* Interactive Volume Controls + - */}
            <div className="pointer-events-auto flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950/85 backdrop-blur-md border border-slate-700/80 shadow-md">
              <button
                type="button"
                onClick={toggleMute}
                className="p-1 rounded text-slate-300 hover:text-cyan-400 hover:bg-slate-800 transition-colors cursor-pointer"
                title={isMuted ? 'Nyalakan Audio Live' : 'Mute Audio Live'}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                ) : volume < 50 ? (
                  <Volume1 className="w-3.5 h-3.5 text-cyan-400" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                )}
              </button>

              <button
                type="button"
                onClick={handleVolumeDown}
                disabled={volume <= 0}
                className="w-5 h-5 rounded flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-cyan-400 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer text-xs"
                title="Kecilkan Volume (-10%)"
              >
                <Minus className="w-3 h-3" />
              </button>

              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={isMuted ? 0 : volume}
                onChange={(e) => handleVolumeChange(Number(e.target.value))}
                className="w-14 sm:w-20 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                title={`Volume: ${isMuted ? '0% (Muted)' : `${volume}%`}`}
              />

              <button
                type="button"
                onClick={handleVolumeUp}
                disabled={volume >= 100}
                className="w-5 h-5 rounded flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-cyan-400 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer text-xs"
                title="Besarkan Volume (+10%)"
              >
                <Plus className="w-3 h-3" />
              </button>

              <span className="text-[10px] min-w-[34px] text-center px-1 rounded bg-slate-900 border border-slate-700 text-cyan-300">
                {isMuted ? 'MUTE' : `${volume}%`}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="px-2 py-0.5 rounded bg-slate-900/80 backdrop-blur-xs border border-slate-700/60 text-cyan-400">
                {metrics?.width && metrics?.height ? `${metrics.width}×${metrics.height}` : 'Auto'}
              </div>
              <div className="px-2 py-0.5 rounded bg-slate-900/80 backdrop-blur-xs border border-slate-700/60 text-slate-300">
                {metrics?.fps ? `${metrics.fps} FPS` : '30 FPS'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Idle Standby Screen */}
      {status === 'idle' && (
        <div className="p-6 text-center max-w-md mx-auto space-y-3 z-10">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-cyan-400 shadow-md">
            <Cctv className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-200">Kamera Siap / Standby</h3>
            <p className="text-xs text-slate-400 mt-1">
              Webcam belum diaktifkan. Klik tombol di bawah untuk menyalakan live preview video.
            </p>
          </div>
          <div className="pt-2">
            <Button variant="primary" size="md" onClick={onStart}>
              Mulai Preview
            </Button>
          </div>
        </div>
      )}

      {/* 4. Requesting / Connecting Screen */}
      {status === 'requesting' && (
        <div className="p-6 text-center max-w-sm mx-auto space-y-3 z-10">
          <Loader2 className="w-10 h-10 mx-auto text-cyan-400 animate-spin" />
          <h3 className="text-sm font-semibold text-slate-200">Menghubungkan ke Perangkat...</h3>
          <p className="text-xs text-slate-400">
            Menginisialisasi stream sensor kamera dan meminta izin akses media.
          </p>
        </div>
      )}

      {/* 5. Error Screen */}
      {status === 'error' && error && (
        <div className="p-6 text-center max-w-md mx-auto space-y-3 z-10">
          <div className="w-12 h-12 mx-auto rounded-xl bg-rose-950/60 border border-rose-800/80 flex items-center justify-center text-rose-400">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-rose-300">{error.title}</h3>
            <p className="text-xs text-slate-300 mt-1">{error.message}</p>
            {error.resolutionHint && (
              <div className="mt-3 p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-cyan-300 text-left">
                <strong>Saran Solusi:</strong> {error.resolutionHint}
              </div>
            )}
          </div>
          <div className="flex items-center justify-center gap-2 pt-2">
            <Button variant="secondary" size="sm" onClick={onStart}>
              Coba Lagi
            </Button>
            {onRefreshDevices && (
              <Button variant="ghost" size="sm" onClick={onRefreshDevices}>
                Refresh Perangkat
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Background surveillance grid lines */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px]" />
    </div>
  );
};
