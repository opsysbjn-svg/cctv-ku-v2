import { useState, useEffect, useCallback } from 'react';
import {
  LiveRecordingState,
  RecordingConfig,
  CodecType,
  CompressionProfile,
  HwAccelMode,
} from '../types/recording';
import { RecordingService } from '../services/recordingService';
import { StorageService } from '../services/storageService';

interface UseRecordingOptions {
  onLog?: (category: 'camera' | 'system' | 'storage' | 'network' | 'recording', title: string, detail: string, level?: 'info' | 'success' | 'warning' | 'error') => void;
}

export function useRecording(options?: UseRecordingOptions) {
  const { onLog } = options || {};
  const [recordingState, setRecordingState] = useState<LiveRecordingState>({
    status: 'idle',
    cameraName: '',
    elapsedSeconds: 0,
    currentFileSizeBytes: 0,
    activeCodec: 'h264',
    activeEncoder: 'libx264',
    segmentCount: 0,
  });

  const [confirmStopOpen, setConfirmStopOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = RecordingService.subscribe((state) => {
      setRecordingState(state);
      if (state.errorMessage) {
        setErrorMessage(state.errorMessage);
      }
    });
    return unsubscribe;
  }, []);

  const startRecording = useCallback(
    async (
      cameraId: string,
      cameraName: string,
      resolution: string,
      fps: number,
      activeStream?: MediaStream | null
    ) => {
      const settings = StorageService.getSettings();
      setErrorMessage(null);

      const config: RecordingConfig = {
        cameraId,
        cameraName,
        resolution: resolution === 'auto' ? '1280x720' : resolution,
        fps,
        codec: settings.defaultCodec || 'h264',
        profile: settings.compressionProfile || 'balanced',
        customCrf: settings.customCrf,
        segmentDuration: settings.segmentDuration || 300,
        outputDir: settings.customStoragePath,
        hwAccel: settings.hwAccelMode || 'auto',
        recordAudio: settings.recordAudioWithVideo !== false,
      };

      try {
        const msg = await RecordingService.startRecording(config, activeStream);
        onLog?.(
          'recording',
          'Perekaman Dimulai',
          `${cameraName} | Codec: ${config.codec.toUpperCase()} (${config.profile}) | Segmen: ${config.segmentDuration}s`,
          'success'
        );
        return msg;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setErrorMessage(msg);
        onLog?.('recording', 'Perekaman Gagal Dimulai', msg, 'error');
        throw err;
      }
    },
    [onLog]
  );

  const requestStop = useCallback(() => {
    if (recordingState.status === 'recording') {
      setConfirmStopOpen(true);
    }
  }, [recordingState.status]);

  const cancelStop = useCallback(() => {
    setConfirmStopOpen(false);
  }, []);

  const confirmStop = useCallback(async () => {
    setConfirmStopOpen(false);
    try {
      const msg = await RecordingService.stopRecording();
      onLog?.('recording', 'Perekaman Dihentikan', msg, 'info');
      return msg;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
      onLog?.('recording', 'Gagal Menghentikan Perekaman', msg, 'error');
      throw err;
    }
  }, [onLog]);

  return {
    recordingState,
    isRecording: recordingState.status === 'recording',
    isStopping: recordingState.status === 'stopping',
    errorMessage,
    startRecording,
    requestStop,
    cancelStop,
    confirmStop,
    confirmStopOpen,
  };
}
