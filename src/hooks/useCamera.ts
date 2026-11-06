import { useState, useEffect, useRef, useCallback } from 'react';
import {
  CameraDevice,
  CameraErrorState,
  CameraStatus,
  CameraStreamMetrics,
  FpsOption,
  ResolutionId,
  SnapshotData,
} from '../types/camera';
import { CameraService } from '../services/cameraService';
import { StorageService } from '../services/storageService';

import { ActivityLogItem } from '../types/system';

interface UseCameraOptions {
  onLog?: (category: ActivityLogItem['category'], title: string, detail: string, level?: 'info' | 'success' | 'warning' | 'error') => void;
}

export function useCamera(options?: UseCameraOptions) {
  const { onLog } = options || {};
  const settings = StorageService.getSettings();

  const [devices, setDevices] = useState<CameraDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [resolution, setResolution] = useState<ResolutionId>(settings.defaultResolution || 'auto');
  const [fps, setFps] = useState<FpsOption>(settings.defaultFps || 30);
  const [status, setStatus] = useState<CameraStatus>('idle');
  const [error, setError] = useState<CameraErrorState | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [metrics, setMetrics] = useState<CameraStreamMetrics | null>(null);
  const [isDetecting, setIsDetecting] = useState<boolean>(false);

  const streamRef = useRef<MediaStream | null>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);

  // Keep streamRef in sync
  useEffect(() => {
    streamRef.current = stream;
  }, [stream]);

  // Enumerate devices
  const refreshDevices = useCallback(async (isInitial = false) => {
    setIsDetecting(true);
    try {
      const deviceList = await CameraService.getAvailableDevices();
      setDevices(deviceList);

      if (deviceList.length > 0) {
        setSelectedDeviceId((prev) => {
          if (prev && deviceList.some((d) => d.deviceId === prev)) {
            return prev;
          }
          return deviceList[0].deviceId;
        });

        if (!isInitial) {
          onLog?.('camera', 'Perangkat Diperbarui', `Ditemukan ${deviceList.length} kamera video terhubung`, 'info');
        }
      } else {
        setSelectedDeviceId('');
        if (!isInitial) {
          onLog?.('camera', 'Tidak Ada Kamera', 'Tidak ada perangkat webcam yang terdeteksi', 'warning');
        }
      }
    } catch (err) {
      console.error('Error enumerating devices:', err);
      const parsed = CameraService.parseError(err);
      setError(parsed);
      onLog?.('camera', 'Gagal Deteksi Kamera', parsed.message, 'error');
    } finally {
      setIsDetecting(false);
    }
  }, [onLog]);

  // Initial device scan on mount (NO automatic preview start!)
  useEffect(() => {
    refreshDevices(true);

    // Listen to device changes (hotplugging USB camera)
    if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
      const handleDeviceChange = () => {
        refreshDevices(false);
      };
      navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
      return () => {
        navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
      };
    }
  }, [refreshDevices]);

  // Stop preview
  const stopPreview = useCallback(() => {
    if (streamRef.current) {
      CameraService.stopStream(streamRef.current);
      streamRef.current = null;
    }
    setStream(null);
    setStatus('idle');
    setMetrics(null);
    setError(null);
    onLog?.('camera', 'Preview Dihentikan', 'Kamera dimatikan oleh pengguna', 'info');
  }, [onLog]);

  // Start preview
  const startPreview = useCallback(async (
    targetDeviceId?: string,
    targetResolution?: ResolutionId,
    targetFps?: FpsOption
  ) => {
    // Clean up existing stream first
    if (streamRef.current) {
      CameraService.stopStream(streamRef.current);
      streamRef.current = null;
      setStream(null);
    }

    const devId = targetDeviceId ?? selectedDeviceId;
    const res = targetResolution ?? resolution;
    const frameRate = targetFps ?? fps;

    setStatus('requesting');
    setError(null);

    try {
      const enableAudio = settings.recordAudioWithVideo !== false;
      const newStream = await CameraService.startStream(devId, res, frameRate, enableAudio);
      streamRef.current = newStream;
      setStream(newStream);
      setStatus('streaming');

      // Update metrics
      const track = newStream.getVideoTracks()[0];
      const initialMetrics = CameraService.getTrackMetrics(newStream);
      setMetrics(initialMetrics);

      // Re-scan devices so that device labels get populated if permission was just granted
      refreshDevices(true);

      const deviceLabel = track?.label || 'Kamera';
      const audioNotice = newStream.getAudioTracks().length > 0 ? ' + Audio' : '';
      onLog?.(
        'camera',
        'Preview Kamera Aktif',
        `${deviceLabel} (${initialMetrics?.width || 'Auto'}x${initialMetrics?.height || 'Auto'} @ ${initialMetrics?.fps || frameRate}fps${audioNotice})`,
        'success'
      );
    } catch (err) {
      const parsed = CameraService.parseError(err);
      setError(parsed);
      setStatus('error');
      setStream(null);
      streamRef.current = null;
      onLog?.('camera', parsed.title, parsed.message, 'error');
    }
  }, [selectedDeviceId, resolution, fps, onLog, refreshDevices]);

  // Switch device
  const changeDevice = useCallback(async (newDeviceId: string) => {
    setSelectedDeviceId(newDeviceId);
    if (status === 'streaming') {
      await startPreview(newDeviceId, resolution, fps);
    }
  }, [status, resolution, fps, startPreview]);

  // Switch resolution
  const changeResolution = useCallback(async (newResolution: ResolutionId) => {
    setResolution(newResolution);
    if (status === 'streaming') {
      await startPreview(selectedDeviceId, newResolution, fps);
    }
  }, [status, selectedDeviceId, fps, startPreview]);

  // Switch FPS
  const changeFps = useCallback(async (newFps: FpsOption) => {
    setFps(newFps);
    if (status === 'streaming') {
      await startPreview(selectedDeviceId, resolution, newFps);
    }
  }, [status, selectedDeviceId, resolution, startPreview]);

  // Update metrics when video metadata is loaded
  const updateMetricsFromVideo = useCallback((videoElement: HTMLVideoElement) => {
    videoElementRef.current = videoElement;
    if (streamRef.current) {
      const updated = CameraService.getTrackMetrics(streamRef.current, videoElement);
      if (updated) {
        setMetrics((prev) => {
          if (
            prev &&
            prev.width === updated.width &&
            prev.height === updated.height &&
            prev.fps === updated.fps &&
            prev.aspectRatio === updated.aspectRatio &&
            prev.deviceName === updated.deviceName
          ) {
            return prev;
          }
          return updated;
        });
      }
    }
  }, []);

  // Capture snapshot
  const captureSnapshot = useCallback((): SnapshotData | null => {
    if (!videoElementRef.current || status !== 'streaming') {
      return null;
    }

    const result = CameraService.takeSnapshot(
      videoElementRef.current,
      settings.snapshotFormat || 'image/jpeg',
      0.95
    );

    if (!result) return null;

    const deviceName = metrics?.deviceName || 'Webcam';
    const snapshot: SnapshotData = {
      id: 'snap_' + Date.now(),
      timestamp: new Date().toISOString(),
      dataUrl: result.dataUrl,
      width: result.width,
      height: result.height,
      deviceName,
    };

    StorageService.saveSnapshot(snapshot);
    onLog?.(
      'camera',
      'Snapshot Diambil',
      `Snapshot ${result.width}x${result.height} disimpan dari ${deviceName}`,
      'success'
    );

    return snapshot;
  }, [status, metrics, settings.snapshotFormat, onLog]);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        CameraService.stopStream(streamRef.current);
      }
    };
  }, []);

  return {
    devices,
    selectedDeviceId,
    resolution,
    fps,
    status,
    error,
    stream,
    metrics,
    isDetecting,
    startPreview,
    stopPreview,
    changeDevice,
    changeResolution,
    changeFps,
    refreshDevices,
    updateMetricsFromVideo,
    captureSnapshot,
    videoElementRef,
  };
}
