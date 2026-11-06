import React, { useRef, useState, useEffect } from 'react';
import { RecordingItem } from '../../types/recording';
import { StorageService } from '../../services/storageService';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import {
  Play,
  Pause,
  Download,
  Lock,
  Unlock,
  Volume2,
  Volume1,
  VolumeX,
  Plus,
  Minus,
  Maximize,
  Calendar,
  Film,
  HardDrive,
  Cpu,
  Mic,
} from 'lucide-react';
import { formatBytes, formatDuration, formatFullDate, formatLogTime } from '../../utils/formatters';

interface VideoPlayerModalProps {
  recording: RecordingItem | null;
  onClose: () => void;
  onToggleLock: (id: string) => void;
}

export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({
  recording,
  onClose,
  onToggleLock,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [activeBlobUrl, setActiveBlobUrl] = useState<string | null>(recording?.blobUrl || null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState<number>(85);
  const [isMuted, setIsMuted] = useState(false);

  const [videoError, setVideoError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setIsPlaying(false);
    setCurrentTime(0);
    setVideoError(false);
    setIsMuted(false);
    setDuration(recording?.duration || 0);

    if (recording?.blobUrl) {
      setActiveBlobUrl(recording.blobUrl);
    } else if (recording?.id) {
      StorageService.getBlob(recording.id).then((blob: Blob | null) => {
        if (blob && isMounted) {
          const url = URL.createObjectURL(blob);
          setActiveBlobUrl(url);
        }
      });
    } else {
      setActiveBlobUrl(null);
    }

    return () => {
      isMounted = false;
    };
  }, [recording]);

  if (!recording) return null;

  const hasPlayableSource = Boolean((activeBlobUrl || recording.blobUrl) && !videoError);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.volume = volume / 100;
      videoRef.current.muted = isMuted;
      videoRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch((e) => console.warn('Gagal memutar video:', e));
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      videoRef.current.volume = volume / 100;
      videoRef.current.muted = isMuted;
      if (videoRef.current.duration && !isNaN(videoRef.current.duration)) {
        setDuration(videoRef.current.duration);
      }
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      if (videoRef.current.duration && !isNaN(videoRef.current.duration)) {
        setDuration(videoRef.current.duration);
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  const handleVolumeChange = (newVol: number) => {
    const clamped = Math.max(0, Math.min(100, newVol));
    setVolume(clamped);
    if (clamped > 0 && isMuted) {
      setIsMuted(false);
    } else if (clamped === 0) {
      setIsMuted(true);
    }
    if (videoRef.current) {
      videoRef.current.volume = clamped / 100;
      videoRef.current.muted = clamped === 0;
    }
  };

  const handleVolumeDown = () => {
    const next = Math.max(0, volume - 10);
    setVolume(next);
    if (next === 0) {
      setIsMuted(true);
    }
    if (videoRef.current) {
      videoRef.current.volume = next / 100;
      videoRef.current.muted = next === 0;
    }
  };

  const handleVolumeUp = () => {
    const next = Math.min(100, volume + 10);
    setVolume(next);
    setIsMuted(false);
    if (videoRef.current) {
      videoRef.current.volume = next / 100;
      videoRef.current.muted = false;
    }
  };

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (videoRef.current) {
      videoRef.current.muted = nextMuted;
    }
  };

  const handleDownload = () => {
    if (recording.blobUrl) {
      const a = document.createElement('a');
      a.href = recording.blobUrl;
      a.download = recording.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      alert(`File rekaman tersimpan secara lokal pada:\n${recording.filePath}`);
    }
  };

  const startDate = new Date(recording.startTime);

  return (
    <Modal
      isOpen={!!recording}
      onClose={onClose}
      title={recording.fileName}
      subtitle={`Kamera: ${recording.cameraName} | Direkam: ${formatFullDate(startDate)} ${formatLogTime(startDate)}`}
      maxWidth="4xl"
      footer={
        <>
          <div className="mr-auto flex items-center gap-2">
            <Button
              variant={recording.isLocked ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => onToggleLock(recording.id)}
              icon={recording.isLocked ? <Lock className="w-3.5 h-3.5 text-cyan-400" /> : <Unlock className="w-3.5 h-3.5" />}
            >
              {recording.isLocked ? 'Terkunci (Dilindungi)' : 'Kunci Rekaman'}
            </Button>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleDownload}
            icon={<Download className="w-3.5 h-3.5" />}
          >
            Ekspor Video
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Tutup
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Video Viewport & Controls */}
        <div className="relative aspect-video rounded-xl bg-slate-950 border border-slate-800 overflow-hidden flex flex-col justify-between group">
          {hasPlayableSource ? (
            <video
              ref={videoRef}
              src={activeBlobUrl || recording.blobUrl}
              onTimeUpdate={handleTimeUpdate}
              onEnded={() => setIsPlaying(false)}
              onLoadedMetadata={handleLoadedMetadata}
              onError={(e) => {
                e.preventDefault();
                setVideoError(true);
              }}
              muted={isMuted}
              playsInline
              className="w-full h-full object-contain cursor-pointer"
              onClick={togglePlay}
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-900/90 text-slate-300">
              <Film className="w-12 h-12 text-cyan-400 mb-2" />
              <div className="text-sm font-semibold text-slate-100">{recording.fileName}</div>
              <p className="text-xs text-slate-400 mt-1 font-mono max-w-md break-all">
                {recording.filePath}
              </p>
              <p className="text-[11px] text-cyan-400 mt-3">
                File fisik tersimpan di disk lokal PC. Gunakan tombol &quot;Ekspor Video&quot; atau buka di media player Windows.
              </p>
            </div>
          )}

          {/* Bottom Player Overlay Bar */}
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950/90 via-slate-950/60 to-transparent p-3 pt-6 space-y-2 opacity-90 group-hover:opacity-100 transition-opacity">
            {/* Timeline Scrubber */}
            <input
              type="range"
              min={0}
              max={duration || recording.duration || 100}
              step={0.1}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />

            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-200">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={togglePlay}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 hover:text-cyan-400 cursor-pointer transition-colors"
                  title={isPlaying ? 'Jeda (Pause)' : 'Putar (Play)'}
                >
                  {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                </button>

                {/* Audio Volume Controls (+ -) */}
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-900/90 border border-slate-700/80">
                  <button
                    type="button"
                    onClick={toggleMute}
                    className="p-1 rounded text-slate-300 hover:text-cyan-400 cursor-pointer"
                    title={isMuted ? 'Nyalakan Suara' : 'Matikan Suara (Mute)'}
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX className="w-4 h-4 text-rose-400" />
                    ) : volume < 50 ? (
                      <Volume1 className="w-4 h-4 text-cyan-400" />
                    ) : (
                      <Volume2 className="w-4 h-4 text-cyan-400" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleVolumeDown}
                    disabled={volume <= 0}
                    className="w-5 h-5 rounded flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-cyan-400 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer text-xs font-bold"
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
                    className="w-16 sm:w-20 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                    title={`Volume: ${isMuted ? '0% (Muted)' : `${volume}%`}`}
                  />

                  <button
                    type="button"
                    onClick={handleVolumeUp}
                    disabled={volume >= 100}
                    className="w-5 h-5 rounded flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-cyan-400 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer text-xs font-bold"
                    title="Besarkan Volume (+10%)"
                  >
                    <Plus className="w-3 h-3" />
                  </button>

                  <span className="font-mono text-[10px] min-w-[32px] text-center px-1 rounded bg-slate-950 border border-slate-700 text-cyan-300">
                    {isMuted ? 'MUTE' : `${volume}%`}
                  </span>
                </div>

                <div className="font-mono text-[11px] text-slate-300">
                  <span>{formatDuration(currentTime)}</span>
                  <span className="text-slate-500 mx-1">/</span>
                  <span>{formatDuration(duration || recording.duration)}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 font-mono text-[11px]">
                {recording.hasAudio !== false && (
                  <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-700/80 text-emerald-400 text-[10px]">
                    <Mic className="w-3 h-3" />
                    AUDIO ON
                  </span>
                )}
                <span className="px-1.5 py-0.5 rounded bg-slate-800/80 border border-slate-700 text-cyan-300">
                  {recording.codec}
                </span>
                <span className="px-1.5 py-0.5 rounded bg-slate-800/80 border border-slate-700 text-slate-300">
                  {recording.resolution}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Video Technical Specifications Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
          <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
            <span className="text-slate-400 block text-[10px]">KAPASITAS FILE</span>
            <span className="font-semibold font-mono text-slate-800 dark:text-slate-200">
              {formatBytes(recording.fileSize)}
            </span>
          </div>

          <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
            <span className="text-slate-400 block text-[10px]">CODEC / KOMPRESI</span>
            <span className="font-semibold font-mono text-slate-800 dark:text-slate-200">
              {recording.codec} @ {recording.fps} FPS
            </span>
          </div>

          <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
            <span className="text-slate-400 block text-[10px]">ESTIMASI BITRATE</span>
            <span className="font-semibold font-mono text-slate-800 dark:text-slate-200">
              {recording.bitrate ? `${(recording.bitrate / 1000).toFixed(0)} kbps` : 'Variabel'}
            </span>
          </div>

          <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
            <span className="text-slate-400 block text-[10px]">STATUS RETENSI</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {recording.isLocked ? (
                <span className="text-cyan-500 font-medium">Terkunci (Aman)</span>
              ) : (
                <span className="text-slate-400 font-medium">Auto-cleanup aktif</span>
              )}
            </span>
          </div>
        </div>
      </div>
    </Modal>
  );
};
