import { AppSettings, ActivityLogItem } from '../types/system';
import { SnapshotData } from '../types/camera';
import { CleanupReport, RecordingItem, StorageMetrics } from '../types/recording';

const SETTINGS_KEY = 'cctv_ku_settings';
const LOGS_KEY = 'cctv_ku_logs';
const SNAPSHOTS_KEY = 'cctv_ku_snapshots';
const RECORDINGS_KEY = 'cctv_ku_recordings_db';

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  sidebarCollapsed: false,
  defaultResolution: '720p',
  defaultFps: 30,
  snapshotFormat: 'image/jpeg',
  hardwareAcceleration: true,
  // Phase 2 Settings
  defaultCodec: 'h264',
  compressionProfile: 'balanced',
  customCrf: 23,
  segmentDuration: 300, // 5 menit
  retentionDays: 14, // 14 hari
  maxDiskQuotaGb: 100, // 100 GB
  customStoragePath: 'C:\\CCTV-KU',
  hwAccelMode: 'auto',
  recordAudioWithVideo: true,
  defaultVolume: 80,
};

export class StorageService {
  public static getSettings(): AppSettings {
    try {
      const data = localStorage.getItem(SETTINGS_KEY);
      if (data) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
      }
    } catch (e) {
      console.warn('Gagal membaca pengaturan dari localStorage:', e);
    }
    return DEFAULT_SETTINGS;
  }

  public static saveSettings(settings: Partial<AppSettings>): AppSettings {
    const current = this.getSettings();
    const updated = { ...current, ...settings };
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Gagal menyimpan pengaturan ke localStorage:', e);
    }
    return updated;
  }

  public static getLogs(): ActivityLogItem[] {
    try {
      const data = localStorage.getItem(LOGS_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.warn('Gagal membaca log aktivitas:', e);
    }
    return [];
  }

  public static addLog(item: Omit<ActivityLogItem, 'id' | 'timestamp'>): ActivityLogItem[] {
    const logs = this.getLogs();
    const newLog: ActivityLogItem = {
      ...item,
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      timestamp: new Date().toISOString(),
    };
    const updated = [newLog, ...logs].slice(0, 100);
    try {
      localStorage.setItem(LOGS_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Gagal menyimpan log aktivitas:', e);
    }
    return updated;
  }

  public static clearLogs(): void {
    try {
      localStorage.removeItem(LOGS_KEY);
    } catch (e) {
      console.warn('Gagal menghapus log aktivitas:', e);
    }
  }

  public static getSnapshots(): SnapshotData[] {
    try {
      const data = localStorage.getItem(SNAPSHOTS_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.warn('Gagal membaca snapshot:', e);
    }
    return [];
  }

  public static saveSnapshot(snapshot: SnapshotData): SnapshotData[] {
    const current = this.getSnapshots();
    const updated = [snapshot, ...current].slice(0, 30);
    try {
      localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Gagal menyimpan snapshot ke localStorage:', e);
    }
    return updated;
  }

  public static deleteSnapshot(id: string): SnapshotData[] {
    const current = this.getSnapshots();
    const updated = current.filter((s) => s.id !== id);
    try {
      localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Gagal menghapus snapshot:', e);
    }
    return updated;
  }

  // --- SQLite Web Mirror for Browser Mode & Local Fallback ---

  public static getRecordings(): RecordingItem[] {
    try {
      const data = localStorage.getItem(RECORDINGS_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.warn('Gagal membaca daftar rekaman lokal:', e);
    }
    return [];
  }

  public static saveRecording(recording: RecordingItem): RecordingItem[] {
    const current = this.getRecordings();
    const existingIdx = current.findIndex((r) => r.id === recording.id);
    let updated: RecordingItem[];
    if (existingIdx >= 0) {
      updated = [...current];
      updated[existingIdx] = recording;
    } else {
      updated = [recording, ...current];
    }
    try {
      localStorage.setItem(RECORDINGS_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Gagal menyimpan rekaman ke database lokal:', e);
    }
    return updated;
  }

  public static deleteRecording(id: string): RecordingItem[] {
    const current = this.getRecordings();
    const target = current.find((r) => r.id === id);
    if (target?.isLocked) {
      console.warn('Rekaman terkunci tidak boleh dihapus.');
      return current;
    }
    if (target?.blobUrl && target.blobUrl.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(target.blobUrl);
      } catch (_) {}
    }
    const updated = current.filter((r) => r.id !== id);
    try {
      localStorage.setItem(RECORDINGS_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Gagal menghapus rekaman:', e);
    }
    return updated;
  }

  public static toggleLockRecording(id: string): RecordingItem[] {
    const current = this.getRecordings();
    const updated = current.map((item) =>
      item.id === id ? { ...item, isLocked: !item.isLocked } : item
    );
    try {
      localStorage.setItem(RECORDINGS_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Gagal mengubah status kunci rekaman:', e);
    }
    return updated;
  }

  public static getStorageMetrics(): StorageMetrics {
    const settings = this.getSettings();
    const recordings = this.getRecordings();

    const cctvBytes = recordings.reduce((acc, curr) => acc + (curr.fileSize || 0), 0);
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayCount = recordings.filter((r) => r.startTime.startsWith(todayStr)).length;

    // Simulated local drive for web development preview (512 GB)
    const totalDisk = 512 * 1024 * 1024 * 1024;
    const baseUsed = 180 * 1024 * 1024 * 1024;
    const usedDisk = baseUsed + cctvBytes;
    const availableDisk = totalDisk - usedDisk;

    return {
      totalDiskBytes: totalDisk,
      usedDiskBytes: usedDisk,
      availableDiskBytes: availableDisk,
      cctvRecordingsBytes: cctvBytes,
      totalRecordingsCount: recordings.length,
      todayRecordingsCount: todayCount,
      storagePath: settings.customStoragePath || 'C:\\CCTV-KU',
      maxQuotaGb: settings.maxDiskQuotaGb || 100,
    };
  }

  public static runAutoCleanup(days: number, maxQuotaGb?: number): CleanupReport {
    const executedAt = new Date().toISOString();
    if (days <= 0) {
      return {
        checkedCount: 0,
        deletedCount: 0,
        freedBytes: 0,
        skippedLockedCount: 0,
        skippedRecordingCount: 0,
        failedCount: 0,
        executedAt,
        status: 'empty',
        message: 'Kebijakan retensi diatur ke "Tidak Pernah Menghapus Otomatis".',
      };
    }

    const current = this.getRecordings();
    const thresholdDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const checkedCount = current.length;
    let deletedCount = 0;
    let freedBytes = 0;
    let skippedLockedCount = 0;
    let skippedRecordingCount = 0;
    let failedCount = 0;

    const remaining = current.filter((item) => {
      if (item.isLocked) {
        skippedLockedCount++;
        return true;
      }
      if (item.recordingStatus === 'recording') {
        skippedRecordingCount++;
        return true;
      }
      const itemDate = new Date(item.startTime);
      if (itemDate < thresholdDate) {
        deletedCount++;
        freedBytes += item.fileSize || 0;
        this.deleteBlob(item.id);
        if (item.blobUrl && item.blobUrl.startsWith('blob:')) {
          try {
            URL.revokeObjectURL(item.blobUrl);
          } catch (_) {}
        }
        return false;
      }
      return true;
    });

    try {
      localStorage.setItem(RECORDINGS_KEY, JSON.stringify(remaining));
    } catch (e) {
      failedCount++;
    }

    const status = deletedCount > 0 ? 'success' : (failedCount > 0 ? 'failed' : 'empty');
    const message = deletedCount > 0
      ? `Pembersihan berhasil: ${deletedCount} file rekaman dihapus (${(freedBytes / (1024 * 1024)).toFixed(1)} MB dibebaskan).`
      : (skippedLockedCount > 0 && checkedCount === skippedLockedCount
        ? 'Semua file lama sedang terkunci (locked), tidak ada file yang dihapus.'
        : 'Tidak ada rekaman yang memenuhi kriteria pembersihan saat ini.');

    return {
      checkedCount,
      deletedCount,
      freedBytes,
      skippedLockedCount,
      skippedRecordingCount,
      failedCount,
      executedAt,
      status,
      message,
    };
  }

  // --- IndexedDB Persistent Blob Store for Browser Mode ---
  private static openBlobDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        return reject(new Error('IndexedDB not supported'));
      }
      const req = indexedDB.open('cctv_ku_media_db', 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('video_blobs')) {
          db.createObjectStore('video_blobs');
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  public static async storeBlob(id: string, blob: Blob): Promise<void> {
    try {
      const db = await this.openBlobDB();
      const tx = db.transaction('video_blobs', 'readwrite');
      tx.objectStore('video_blobs').put(blob, id);
      return new Promise((res, rej) => {
        tx.oncomplete = () => res();
        tx.onerror = () => rej(tx.error);
      });
    } catch (e) {
      console.warn('Gagal menyimpan blob ke IndexedDB:', e);
    }
  }

  public static async getBlob(id: string): Promise<Blob | null> {
    try {
      const db = await this.openBlobDB();
      const tx = db.transaction('video_blobs', 'readonly');
      const req = tx.objectStore('video_blobs').get(id);
      return new Promise((res) => {
        req.onsuccess = () => res(req.result || null);
        req.onerror = () => res(null);
      });
    } catch {
      return null;
    }
  }

  public static async deleteBlob(id: string): Promise<void> {
    try {
      const db = await this.openBlobDB();
      const tx = db.transaction('video_blobs', 'readwrite');
      tx.objectStore('video_blobs').delete(id);
    } catch (_) {}
  }
}
