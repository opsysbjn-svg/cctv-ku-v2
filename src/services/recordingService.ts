import {
  CleanupReport,
  FFmpegStatus,
  LiveRecordingState,
  RecordingConfig,
  RecordingItem,
  StorageMetrics,
} from '../types/recording';
import { StorageService } from './storageService';

// Check if running inside native Tauri 2 desktop environment
export function isTauri(): boolean {
  return (
    typeof window !== 'undefined' &&
    ('__TAURI_INTERNALS__' in window || '__TAURI__' in window)
  );
}

// Safely invoke Tauri commands if available in desktop webview
async function tauriInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (isTauri()) {
    const w = window as unknown as {
      __TAURI_INTERNALS__?: { invoke: (cmd: string, args?: Record<string, unknown>) => Promise<T> };
      __TAURI__?: { core?: { invoke: (cmd: string, args?: Record<string, unknown>) => Promise<T> } };
    };
    if (w.__TAURI_INTERNALS__?.invoke) {
      return w.__TAURI_INTERNALS__.invoke(cmd, args);
    }
    if (w.__TAURI__?.core?.invoke) {
      return w.__TAURI__.core.invoke(cmd, args);
    }
  }
  throw new Error('Not running in Tauri desktop environment');
}

export class RecordingService {
  private static liveState: LiveRecordingState = {
    status: 'idle',
    cameraName: '',
    elapsedSeconds: 0,
    currentFileSizeBytes: 0,
    activeCodec: 'h264',
    activeEncoder: 'libx264',
    segmentCount: 0,
  };

  private static stateListeners: Array<(state: LiveRecordingState) => void> = [];
  private static tickerTimer: ReturnType<typeof setInterval> | null = null;
  private static segmentTimer: ReturnType<typeof setTimeout> | null = null;

  // Web Browser Fallback MediaRecorder instance
  private static mediaRecorder: MediaRecorder | null = null;
  private static recordedChunks: Blob[] = [];
  private static currentRecordingConfig: RecordingConfig | null = null;
  private static currentSegmentStartTime: Date | null = null;
  private static sessionStartTime: Date | null = null;

  public static subscribe(listener: (state: LiveRecordingState) => void): () => void {
    this.stateListeners.push(listener);
    listener(this.liveState);
    return () => {
      this.stateListeners = this.stateListeners.filter((l) => l !== listener);
    };
  }

  private static notifyListeners() {
    this.stateListeners.forEach((l) => l({ ...this.liveState }));
  }

  /**
   * Check FFmpeg status and available encoders (Tauri native or Browser preview)
   */
  public static async getFFmpegStatus(): Promise<FFmpegStatus> {
    if (isTauri()) {
      try {
        return await tauriInvoke<FFmpegStatus>('check_ffmpeg');
      } catch (err) {
        try {
          return await tauriInvoke<FFmpegStatus>('check_ffmpeg_status');
        } catch (e2) {
          console.warn('Gagal memanggil check_ffmpeg di Tauri:', e2);
        }
      }
    }

    // Browser Preview environment status
    return {
      isAvailable: true,
      version: 'FFmpeg 7.0.1 (Bundled Windows Sidecar Target)',
      binaryPath: 'src-tauri/binaries/ffmpeg-x86_64-pc-windows-msvc.exe',
      hasLibx264: true,
      hasLibx265: true,
      hasNvenc: true,
      hasQsv: true,
      hasAmf: true,
      availableEncoders: ['libx264', 'libx265', 'h264_nvenc', 'hevc_nvenc', 'h264_qsv'],
    };
  }

  /**
   * Start recording session (Native DirectShow via FFmpeg on Desktop, MediaRecorder on Browser)
   */
  public static async startRecording(
    config: RecordingConfig,
    activeMediaStream?: MediaStream | null
  ): Promise<string> {
    if (this.liveState.status === 'recording') {
      throw new Error('Perekaman sedang aktif. Hentikan rekaman sebelumnya terlebih dahulu.');
    }

    if (isTauri()) {
      try {
        const result = await tauriInvoke<string>('start_recording', { config });
        this.liveState = {
          status: 'recording',
          cameraName: config.cameraName,
          elapsedSeconds: 0,
          currentFileSizeBytes: 0,
          activeCodec: config.codec,
          activeEncoder: config.codec === 'h265' ? 'libx265' : 'libx264',
          segmentCount: 1,
        };
        this.startPollingTauriStatus();
        this.notifyListeners();
        return result;
      } catch (err) {
        this.liveState.status = 'error';
        this.liveState.errorMessage = String(err);
        this.notifyListeners();
        throw err;
      }
    }

    // --- Browser Preview Engine (MediaRecorder with Real Blobs & Segmentation) ---
    if (!activeMediaStream || activeMediaStream.getVideoTracks().length === 0) {
      throw new Error('Stream video kamera tidak aktif. Nyalakan preview kamera terlebih dahulu.');
    }

    this.currentRecordingConfig = config;
    this.sessionStartTime = new Date();
    this.currentSegmentStartTime = new Date();
    this.recordedChunks = [];

    // Attach microphone audio track if requested
    let recordStream = activeMediaStream;
    if (recordStream.getAudioTracks().length === 0 && config.recordAudio !== false) {
      try {
        const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const micTrack = micStream.getAudioTracks()[0];
        if (micTrack) {
          recordStream = new MediaStream([
            ...recordStream.getVideoTracks(),
            micTrack,
          ]);
        }
      } catch (micErr) {
        console.warn('Microphone tidak dapat diakses:', micErr);
      }
    }

    const candidateMimeTypes = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/mp4;codecs=avc1,mp4a.40.2',
      'video/webm',
      'video/mp4',
    ];

    let chosenMimeType = '';
    for (const mt of candidateMimeTypes) {
      if (MediaRecorder.isTypeSupported(mt)) {
        chosenMimeType = mt;
        break;
      }
    }

    const hasAudio = recordStream.getAudioTracks().length > 0;

    try {
      this.mediaRecorder = new MediaRecorder(recordStream, {
        mimeType: chosenMimeType || undefined,
        videoBitsPerSecond:
          config.profile === 'high_quality' ? 4000000 : config.profile === 'space_saver' ? 1200000 : 2500000,
        audioBitsPerSecond: 128000,
      });

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          this.recordedChunks.push(e.data);
          this.liveState.currentFileSizeBytes += e.data.size;
          this.notifyListeners();
        }
      };

      this.mediaRecorder.onstop = () => {
        this.saveCurrentSegment(false);
      };

      this.mediaRecorder.start(1000);

      this.liveState = {
        status: 'recording',
        cameraName: config.cameraName,
        elapsedSeconds: 0,
        currentFileSizeBytes: 0,
        activeCodec: config.codec,
        activeEncoder: config.codec === 'h265' ? 'libx265 (HEVC)' : 'libx264 (H.264)',
        segmentCount: 1,
        hasAudio,
      };

      this.startBrowserTimers(config.segmentDuration);
      this.notifyListeners();

      const audioNotice = hasAudio ? ' [Video + Suara Mikrofon]' : ' [Hanya Video]';
      return `Perekaman berhasil dimulai (Segmentasi: ${config.segmentDuration} detik)${audioNotice}.`;
    } catch (err) {
      this.liveState.status = 'error';
      this.liveState.errorMessage = err instanceof Error ? err.message : String(err);
      this.notifyListeners();
      throw err;
    }
  }

  /**
   * Stop active recording session
   */
  public static async stopRecording(): Promise<string> {
    if (this.liveState.status !== 'recording') {
      return 'Tidak ada sesi perekaman aktif.';
    }

    this.liveState.status = 'stopping';
    this.notifyListeners();

    if (this.tickerTimer) {
      clearInterval(this.tickerTimer);
      this.tickerTimer = null;
    }
    if (this.segmentTimer) {
      clearTimeout(this.segmentTimer);
      this.segmentTimer = null;
    }

    if (isTauri()) {
      try {
        const result = await tauriInvoke<string>('stop_recording');
        this.liveState.status = 'idle';
        this.notifyListeners();
        return result;
      } catch (err) {
        this.liveState.status = 'error';
        this.liveState.errorMessage = String(err);
        this.notifyListeners();
        throw err;
      }
    }

    // Stop browser MediaRecorder
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
      this.mediaRecorder = null;
    }

    this.liveState.status = 'idle';
    this.notifyListeners();
    return 'Perekaman berhasil dihentikan dan segmen rekaman telah disimpan ke penyimpanan lokal.';
  }

  /**
   * In-Browser Segmentation helper conforming to Section H path structure:
   * CCTV-KU/{sanitizedCam}/{YYYY}/{MM}/{DD}/{fileName}
   */
  private static saveCurrentSegment(isContinuing: boolean) {
    if (this.recordedChunks.length === 0 || !this.currentRecordingConfig) return;

    const mimeType = this.mediaRecorder?.mimeType || 'video/webm';
    const blob = new Blob(this.recordedChunks, { type: mimeType });
    const blobUrl = URL.createObjectURL(blob);
    const now = new Date();
    const startTime = this.currentSegmentStartTime || this.sessionStartTime || now;
    const duration = Math.max(1, Math.round((now.getTime() - startTime.getTime()) / 1000));

    // Section E: Application formed timestamp prefix
    const dateStr = startTime.toISOString().replace(/[-:T]/g, '').slice(0, 14);
    const segNum = String(this.liveState.segmentCount).padStart(3, '0');
    const isMp4 = mimeType.includes('mp4');
    const extension = isMp4 ? 'mp4' : 'webm';
    const fileName = `CCTV_${dateStr}_${segNum}.${extension}`;

    // Section H: CCTV-KU/{Camera}/{YYYY}/{MM}/{DD}/
    const sanitizedCam = this.currentRecordingConfig.cameraName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const basePath = StorageService.getSettings().customStoragePath || 'C:\\CCTV-KU';
    const filePath = `${basePath}\\${sanitizedCam}\\${startTime.getFullYear()}\\${String(startTime.getMonth() + 1).padStart(2, '0')}\\${String(startTime.getDate()).padStart(2, '0')}\\${fileName}`;

    const newRecord: RecordingItem = {
      id: 'rec_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      cameraId: this.currentRecordingConfig.cameraId,
      cameraName: this.currentRecordingConfig.cameraName,
      fileName,
      filePath,
      codec: this.currentRecordingConfig.codec.toUpperCase(),
      resolution: this.currentRecordingConfig.resolution || '1280x720',
      fps: this.currentRecordingConfig.fps || 30,
      bitrate: Math.round((blob.size * 8) / duration),
      duration,
      fileSize: blob.size,
      startTime: startTime.toISOString(),
      endTime: now.toISOString(),
      recordingStatus: 'completed',
      isLocked: false,
      createdAt: now.toISOString(),
      blobUrl,
      hasAudio: Boolean(this.liveState.hasAudio),
    };

    StorageService.saveRecording(newRecord);
    StorageService.storeBlob(newRecord.id, blob);

    StorageService.addLog({
      category: 'recording',
      title: 'Segmen Rekaman Selesai',
      detail: `${fileName} (${duration}s, ${(blob.size / (1024 * 1024)).toFixed(1)} MB)${newRecord.hasAudio ? ' [Dengan Suara]' : ''}`,
      level: 'success',
    });

    this.recordedChunks = [];
    this.currentSegmentStartTime = new Date();

    if (isContinuing) {
      this.liveState.segmentCount += 1;
      this.notifyListeners();
    }
  }

  private static startBrowserTimers(segmentDurationSeconds: number) {
    if (this.tickerTimer) clearInterval(this.tickerTimer);
    this.tickerTimer = setInterval(() => {
      this.liveState.elapsedSeconds += 1;
      this.notifyListeners();
    }, 1000);

    const scheduleNextSegment = () => {
      this.segmentTimer = setTimeout(() => {
        if (this.liveState.status === 'recording' && this.mediaRecorder) {
          this.saveCurrentSegment(true);
          scheduleNextSegment();
        }
      }, segmentDurationSeconds * 1000);
    };

    scheduleNextSegment();
  }

  private static startPollingTauriStatus() {
    if (this.tickerTimer) clearInterval(this.tickerTimer);
    this.tickerTimer = setInterval(async () => {
      try {
        const status = await tauriInvoke<LiveRecordingState>('get_recording_status');
        this.liveState = status;
        this.notifyListeners();
        if (status.status !== 'recording') {
          if (this.tickerTimer) clearInterval(this.tickerTimer);
        }
      } catch (e) {
        console.warn('Gagal polling status recording di Tauri:', e);
      }
    }, 1000);
  }

  /**
   * Retrieve list of recordings (with optional filters & sorting)
   */
  public static async getRecordings(filters?: {
    cameraId?: string;
    dateFilter?: string;
    searchQuery?: string;
    codecFilter?: string;
    sortOrder?: 'desc' | 'asc';
  }): Promise<RecordingItem[]> {
    if (isTauri()) {
      try {
        return await tauriInvoke<RecordingItem[]>('get_recordings', {
          cameraId: filters?.cameraId,
          dateFilter: filters?.dateFilter,
          searchQuery: filters?.searchQuery,
          codecFilter: filters?.codecFilter,
          sortOrder: filters?.sortOrder || 'desc',
        });
      } catch (err) {
        console.warn('Gagal memuat rekaman dari SQLite Tauri:', err);
      }
    }

    // Browser mode: filter and hydrate from local mirror & IndexedDB
    let items = StorageService.getRecordings();

    if (filters?.cameraId && filters.cameraId !== 'all') {
      items = items.filter((r) => r.cameraId === filters.cameraId || r.cameraName === filters.cameraId);
    }
    if (filters?.dateFilter && filters.dateFilter !== 'all') {
      items = items.filter((r) => r.startTime.startsWith(filters.dateFilter!));
    }
    if (filters?.codecFilter && filters.codecFilter !== 'all') {
      items = items.filter((r) => r.codec.toLowerCase() === filters.codecFilter!.toLowerCase());
    }
    if (filters?.searchQuery && filters.searchQuery.trim() !== '') {
      const q = filters.searchQuery.toLowerCase();
      items = items.filter(
        (r) => r.fileName.toLowerCase().includes(q) || r.cameraName.toLowerCase().includes(q)
      );
    }

    // Sort
    const isAsc = filters?.sortOrder === 'asc';
    items.sort((a, b) => {
      const ta = new Date(a.startTime).getTime();
      const tb = new Date(b.startTime).getTime();
      return isAsc ? ta - tb : tb - ta;
    });

    // Hydrate blob URLs from IndexedDB for playable playback in browser
    for (const item of items) {
      if (!item.blobUrl) {
        const storedBlob = await StorageService.getBlob(item.id);
        if (storedBlob) {
          item.blobUrl = URL.createObjectURL(storedBlob);
        }
      }
    }

    return items;
  }

  public static async deleteRecording(id: string): Promise<boolean> {
    if (isTauri()) {
      try {
        await tauriInvoke<boolean>('delete_recording', { id });
      } catch (err) {
        console.warn('Gagal menghapus rekaman di Tauri:', err);
      }
    }
    StorageService.deleteRecording(id);
    await StorageService.deleteBlob(id);
    return true;
  }

  public static async deleteRecordings(ids: string[]): Promise<number> {
    let count = 0;
    for (const id of ids) {
      const ok = await this.deleteRecording(id);
      if (ok) count++;
    }
    return count;
  }

  public static async toggleLockRecording(id: string): Promise<boolean> {
    if (isTauri()) {
      try {
        return await tauriInvoke<boolean>('toggle_lock_recording', { id });
      } catch (err) {
        console.warn('Gagal toggle lock rekaman di Tauri:', err);
      }
    }
    StorageService.toggleLockRecording(id);
    return true;
  }

  public static async lockRecording(id: string): Promise<boolean> {
    if (isTauri()) {
      try {
        return await tauriInvoke<boolean>('lock_recording', { id });
      } catch (err) {
        console.warn('Gagal lock rekaman di Tauri:', err);
      }
    }
    const item = StorageService.getRecordings().find((r) => r.id === id);
    if (item && !item.isLocked) {
      StorageService.toggleLockRecording(id);
    }
    return true;
  }

  public static async unlockRecording(id: string): Promise<boolean> {
    if (isTauri()) {
      try {
        return await tauriInvoke<boolean>('unlock_recording', { id });
      } catch (err) {
        console.warn('Gagal unlock rekaman di Tauri:', err);
      }
    }
    const item = StorageService.getRecordings().find((r) => r.id === id);
    if (item && item.isLocked) {
      StorageService.toggleLockRecording(id);
    }
    return true;
  }

  public static async getStorageMetrics(): Promise<StorageMetrics> {
    const customPath = StorageService.getSettings().customStoragePath;
    if (isTauri()) {
      try {
        return await tauriInvoke<StorageMetrics>('get_storage_stats', { customPath });
      } catch (err) {
        try {
          return await tauriInvoke<StorageMetrics>('get_storage_metrics', { customPath });
        } catch (e2) {
          console.warn('Gagal mengambil storage metrics di Tauri:', e2);
        }
      }
    }
    return StorageService.getStorageMetrics();
  }

  public static async runCleanup(
    retentionDays: number,
    maxQuotaGb?: number
  ): Promise<CleanupReport> {
    const customPath = StorageService.getSettings().customStoragePath;
    if (isTauri()) {
      try {
        return await tauriInvoke<CleanupReport>('run_cleanup_now', {
          retentionDays,
          maxQuotaGb: maxQuotaGb || 100,
          storagePath: customPath,
          isEnabled: true,
        });
      } catch (err) {
        console.warn('Gagal menjalankan run_cleanup_now di Tauri:', err);
      }
    }
    return StorageService.runAutoCleanup(retentionDays, maxQuotaGb);
  }

  public static async openRecordingFolder(path?: string): Promise<{ success: boolean; isDesktop: boolean; message: string; targetPath: string }> {
    const targetPath = path || StorageService.getSettings().customStoragePath || 'C:\\CCTV-KU';
    if (isTauri()) {
      try {
        const msg = await tauriInvoke<string>('open_recording_folder', { path: targetPath });
        return {
          success: true,
          isDesktop: true,
          message: msg || `Folder dibuka di Windows Explorer: ${targetPath}`,
          targetPath,
        };
      } catch (err) {
        return {
          success: false,
          isDesktop: true,
          message: `Gagal membuka folder di Windows Explorer: ${err}`,
          targetPath,
        };
      }
    }

    // In Browser Preview mode: cleanly inform the user without alert()
    return {
      success: true,
      isDesktop: false,
      message: `Mode Browser Preview: Pembukaan Windows File Explorer secara langsung memerlukan aplikasi desktop CCTV-KU (Tauri). Folder rekaman lokal Anda diset ke: ${targetPath}`,
      targetPath,
    };
  }
}
