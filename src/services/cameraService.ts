import { CameraDevice, CameraErrorState, CameraStreamMetrics, FpsOption, ResolutionId } from '../types/camera';

export class CameraService {
  /**
   * Check if MediaDevices API is supported in the current environment
   */
  public static isSupported(): boolean {
    return typeof navigator !== 'undefined' && !!navigator.mediaDevices && !!navigator.mediaDevices.getUserMedia;
  }

  /**
   * List all available video input devices
   */
  public static async getAvailableDevices(): Promise<CameraDevice[]> {
    if (!this.isSupported()) {
      throw new Error('MediaDevices API tidak didukung pada browser / WebView ini.');
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((device) => device.kind === 'videoinput');

      return videoDevices.map((device, index) => ({
        deviceId: device.deviceId,
        label: device.label || `Kamera ${index + 1} (${device.deviceId ? device.deviceId.slice(0, 8) + '...' : 'Default'})`,
        groupId: device.groupId,
      }));
    } catch (err) {
      console.error('Gagal mendeteksi perangkat kamera:', err);
      throw err;
    }
  }

  /**
   * Build MediaStreamConstraints based on selected device, resolution, and fps
   */
  public static buildConstraints(
    deviceId?: string,
    resolution: ResolutionId = 'auto',
    fps: FpsOption = 30,
    enableAudio = true
  ): MediaStreamConstraints {
    const videoConstraints: MediaTrackConstraints = {};

    if (deviceId && deviceId !== 'default') {
      videoConstraints.deviceId = { ideal: deviceId };
    }

    if (resolution === '480p') {
      videoConstraints.width = { ideal: 640 };
      videoConstraints.height = { ideal: 480 };
    } else if (resolution === '720p') {
      videoConstraints.width = { ideal: 1280 };
      videoConstraints.height = { ideal: 720 };
    } else if (resolution === '1080p') {
      videoConstraints.width = { ideal: 1920 };
      videoConstraints.height = { ideal: 1080 };
    }

    if (fps) {
      videoConstraints.frameRate = { ideal: fps, max: fps };
    }

    const audioConstraints = enableAudio
      ? {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      : false;

    return {
      audio: audioConstraints,
      video: videoConstraints,
    };
  }

  /**
   * Request media stream from webcam with audio support and graceful fallbacks
   */
  public static async startStream(
    deviceId?: string,
    resolution: ResolutionId = 'auto',
    fps: FpsOption = 30,
    enableAudio = true
  ): Promise<MediaStream> {
    if (!this.isSupported()) {
      throw new Error('MediaDevices API tidak tersedia.');
    }

    // Attempt 1: Video + Audio with noise suppression
    try {
      const constraints = this.buildConstraints(deviceId, resolution, fps, enableAudio);
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err: unknown) {
      console.warn('Gagal meminta stream dengan audio, mencoba fallback...', err);

      // Attempt 2: If microphone failed (permission or not found), fallback to video only
      if (enableAudio) {
        try {
          const videoOnlyConstraints = this.buildConstraints(deviceId, resolution, fps, false);
          return await navigator.mediaDevices.getUserMedia(videoOnlyConstraints);
        } catch (videoOnlyErr) {
          console.warn('Fallback video-only juga terkendala:', videoOnlyErr);
        }
      }

      // Attempt 3: If error is OverconstrainedError, try generic video: true
      try {
        return await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: deviceId ? { deviceId: { ideal: deviceId } } : true,
        });
      } catch (fallbackErr) {
        throw this.parseError(fallbackErr || err);
      }
    }
  }

  /**
   * Safely stop all tracks in a MediaStream
   */
  public static stopStream(stream: MediaStream | null): void {
    if (!stream) return;
    try {
      const tracks = stream.getTracks();
      tracks.forEach((track) => {
        track.enabled = false;
        track.stop();
      });
    } catch (e) {
      console.warn('Gagal menghentikan stream track:', e);
    }
  }

  /**
   * Extract live metrics from an active video and audio track
   */
  public static getTrackMetrics(stream: MediaStream | null, videoElement?: HTMLVideoElement | null): CameraStreamMetrics | null {
    if (!stream) return null;
    const track = stream.getVideoTracks()[0];
    if (!track) return null;

    const audioTrack = stream.getAudioTracks()[0];
    const hasAudio = !!audioTrack && audioTrack.readyState === 'live';
    const audioTrackLabel = audioTrack ? audioTrack.label || 'Mikrofon Aktif' : undefined;

    const settings = track.getSettings ? track.getSettings() : {};
    const width = videoElement?.videoWidth || settings.width || 0;
    const height = videoElement?.videoHeight || settings.height || 0;
    const fps = Math.round(settings.frameRate || 30);

    let aspectRatio = '-';
    if (width > 0 && height > 0) {
      const ratio = width / height;
      if (Math.abs(ratio - 16 / 9) < 0.05) aspectRatio = '16:9';
      else if (Math.abs(ratio - 4 / 3) < 0.05) aspectRatio = '4:3';
      else aspectRatio = `${width}:${height}`;
    }

    return {
      width,
      height,
      fps,
      aspectRatio,
      facingMode: settings.facingMode,
      deviceId: settings.deviceId,
      deviceName: track.label || 'Webcam Aktif',
      hasAudio,
      audioTrackLabel,
    };
  }

  /**
   * Take a high-resolution snapshot from the video element
   */
  public static takeSnapshot(
    videoElement: HTMLVideoElement,
    format: 'image/jpeg' | 'image/png' = 'image/jpeg',
    quality = 0.95
  ): { dataUrl: string; width: number; height: number } | null {
    if (!videoElement || videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
      return null;
    }

    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL(format, quality);

    return {
      dataUrl,
      width: canvas.width,
      height: canvas.height,
    };
  }

  /**
   * Convert DOMExceptions into human-readable user guidance in Indonesian
   */
  public static parseError(err: unknown): CameraErrorState {
    if (err instanceof DOMException) {
      switch (err.name) {
        case 'NotAllowedError':
        case 'PermissionDeniedError':
          return {
            code: 'PERMISSION_DENIED',
            title: 'Izin Akses Kamera Ditolak',
            message: 'Aplikasi tidak memiliki izin untuk mengakses perangkat kamera.',
            resolutionHint: 'Buka izin kamera di browser atau pengaturan Windows Settings > Privacy & security > Camera.',
          };
        case 'NotFoundError':
        case 'DevicesNotFoundError':
          return {
            code: 'NOT_FOUND',
            title: 'Kamera Tidak Ditemukan',
            message: 'Tidak ada sensor atau webcam yang terhubung ke sistem ini.',
            resolutionHint: 'Pastikan webcam USB terpasang erat atau periksa driver kamera di Windows Device Manager.',
          };
        case 'NotReadableError':
        case 'TrackStartError':
          return {
            code: 'DEVICE_BUSY',
            title: 'Kamera Sedang Digunakan',
            message: 'Webcam terkunci atau sedang dipakai oleh aplikasi lain (Zoom, Teams, Skype, atau tab browser lain).',
            resolutionHint: 'Tutup aplikasi lain yang sedang menggunakan kamera, lalu klik coba lagi.',
          };
        case 'OverconstrainedError':
          return {
            code: 'UNSUPPORTED_RESOLUTION',
            title: 'Resolusi Tidak Didukung',
            message: 'Webcam tidak dapat memenuhi resolusi atau frame rate yang dipilih.',
            resolutionHint: 'Pilih opsi "Auto (Ideal)" atau resolusi yang lebih rendah.',
          };
        default:
          return {
            code: 'UNKNOWN',
            title: 'Gagal Mengakses Kamera',
            message: err.message || 'Terjadi kesalahan teknis saat mengakses webcam.',
            resolutionHint: 'Coba refresh daftar perangkat atau cabut dan pasang kembali webcam USB.',
          };
      }
    }

    return {
      code: 'UNKNOWN',
      title: 'Kesalahan Sistem',
      message: err instanceof Error ? err.message : 'Kesalahan tidak diketahui.',
      resolutionHint: 'Silakan refresh perangkat.',
    };
  }
}
