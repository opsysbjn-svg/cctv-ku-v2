import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { CleanupReport, RecordingItem, StorageMetrics } from '../types/recording';
import { SnapshotData } from '../types/camera';
import { RecordingService, isTauri } from '../services/recordingService';
import { StorageService } from '../services/storageService';
import { StorageUsageBar } from '../components/storage/StorageUsageBar';
import { SnapshotModal } from '../components/camera/SnapshotModal';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import {
  HardDrive,
  FolderOpen,
  RefreshCw,
  Trash2,
  Clock,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Folder,
  Sliders,
  Copy,
  Check,
  Film,
  Camera,
  Calendar,
  Layers,
  Info,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import { formatBytes, formatFullDate, RETENTION_PRESETS } from '../utils/formatters';

export const StorageManager: React.FC = () => {
  const [metrics, setMetrics] = useState<StorageMetrics | null>(null);
  const [recordings, setRecordings] = useState<RecordingItem[]>([]);
  const [snapshots, setSnapshots] = useState<SnapshotData[]>([]);
  const [activeSnapshot, setActiveSnapshot] = useState<SnapshotData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const settings = StorageService.getSettings();
  const [retentionDays, setRetentionDays] = useState(settings.retentionDays || 14);
  const [maxQuotaGb, setMaxQuotaGb] = useState(settings.maxDiskQuotaGb || 100);

  // Modals
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [folderNotice, setFolderNotice] = useState<{ message: string; targetPath: string; isDesktop: boolean } | null>(null);
  const [copiedPath, setCopiedPath] = useState(false);

  const [isCleanupConfirmOpen, setIsCleanupConfirmOpen] = useState(false);
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [cleanupReport, setCleanupReport] = useState<CleanupReport | null>(null);

  const fetchStorageData = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await RecordingService.getStorageMetrics();
      setMetrics(data);
      const items = await RecordingService.getRecordings();
      setRecordings(items);
      setSnapshots(StorageService.getSnapshots());
    } catch (e) {
      console.warn('Gagal memuat status penyimpanan:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStorageData();
  }, [fetchStorageData]);

  const handleSaveRetention = (days: number) => {
    setRetentionDays(days);
    StorageService.saveSettings({ retentionDays: days });
  };

  const handleSaveQuota = (gb: number) => {
    setMaxQuotaGb(gb);
    StorageService.saveSettings({ maxDiskQuotaGb: gb });
  };

  // Section I: Buka Folder Rekaman handler
  const handleOpenFolder = async () => {
    const res = await RecordingService.openRecordingFolder(metrics?.storagePath);
    setFolderNotice(res);
    setIsFolderModalOpen(true);
  };

  const handleCopyPath = () => {
    const p = folderNotice?.targetPath || metrics?.storagePath || 'C:\\CCTV-KU';
    navigator.clipboard.writeText(p);
    setCopiedPath(true);
    setTimeout(() => setCopiedPath(false), 2000);
  };

  // Section J: Jalankan Pembersihan Sekarang handler
  const handleExecuteCleanup = async () => {
    setIsCleaningUp(true);
    try {
      const report = await RecordingService.runCleanup(retentionDays, maxQuotaGb);
      setCleanupReport(report);
      setIsCleanupConfirmOpen(false);
      await fetchStorageData();
    } catch (e) {
      console.error('Gagal menjalankan pembersihan:', e);
    } finally {
      setIsCleaningUp(false);
    }
  };

  const handleDeleteSnapshot = (id: string) => {
    const updated = StorageService.deleteSnapshot(id);
    setSnapshots(updated);
  };

  const handleClearAllSnapshots = () => {
    snapshots.forEach((s) => StorageService.deleteSnapshot(s.id));
    setSnapshots([]);
  };

  // Section H: Recordings broken down by Camera
  const cameraBreakdown = useMemo(() => {
    const map = new Map<string, { count: number; bytes: number }>();
    for (const r of recordings) {
      const cam = r.cameraName || 'Kamera Utama';
      const existing = map.get(cam) || { count: 0, bytes: 0 };
      existing.count += 1;
      existing.bytes += r.fileSize || 0;
      map.set(cam, existing);
    }
    return Array.from(map.entries()).map(([name, data]) => ({
      name,
      count: data.count,
      bytes: data.bytes,
    }));
  }, [recordings]);

  // Section H: Recordings broken down by Date
  const dateBreakdown = useMemo(() => {
    const map = new Map<string, { count: number; bytes: number }>();
    for (const r of recordings) {
      const d = r.startTime ? r.startTime.slice(0, 10) : 'Tidak Diketahui';
      const existing = map.get(d) || { count: 0, bytes: 0 };
      existing.count += 1;
      existing.bytes += r.fileSize || 0;
      map.set(d, existing);
    }
    return Array.from(map.entries())
      .map(([date, data]) => ({
        date,
        count: data.count,
        bytes: data.bytes,
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [recordings]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-cyan-400">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Storage Manager & Kapasitas Disk Lokal
              </h2>
              {isTauri() ? (
                <Badge status="online" label="Tauri Desktop Native" size="sm" />
              ) : (
                <Badge status="idle" label="Browser Preview Mode" size="sm" />
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Pemantauan kuota penyimpanan hard disk, hierarki folder rekaman, dan pembersihan otomatis (Auto-Cleanup)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleOpenFolder}
            icon={<FolderOpen className="w-3.5 h-3.5" />}
          >
            Buka Folder Rekaman
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={fetchStorageData}
            disabled={isLoading}
            icon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* 1. Primary Disk & Storage KPI Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <span className="text-xs text-slate-400 block">Total Kapasitas Disk</span>
          <span className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100 block mt-1">
            {metrics ? formatBytes(metrics.totalDiskBytes) : '—'}
          </span>
          <span className="text-[11px] text-slate-400 block mt-0.5">Drive Penyimpanan</span>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <span className="text-xs text-slate-400 block">Kapasitas Terpakai</span>
          <span className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100 block mt-1">
            {metrics ? formatBytes(metrics.usedDiskBytes) : '—'}
          </span>
          <span className="text-[11px] text-slate-400 block mt-0.5">Sistem & Rekaman</span>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <span className="text-xs text-slate-400 block">Kapasitas Tersedia</span>
          <span className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 block mt-1">
            {metrics ? formatBytes(metrics.availableDiskBytes) : '—'}
          </span>
          <span className="text-[11px] text-emerald-500/80 block mt-0.5">Ruang Bebas</span>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <span className="text-xs text-slate-400 block">Ukuran Rekaman CCTV</span>
          <span className="text-xl font-bold font-mono text-cyan-600 dark:text-cyan-400 block mt-1">
            {metrics ? formatBytes(metrics.cctvRecordingsBytes) : '—'}
          </span>
          <span className="text-[11px] text-slate-400 block mt-0.5">Total File Video</span>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <span className="text-xs text-slate-400 block">Jumlah File Segmen</span>
          <span className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100 block mt-1">
            {metrics?.totalRecordingsCount ?? recordings.length}
          </span>
          <span className="text-[11px] text-slate-400 block mt-0.5">Tercatat di SQLite</span>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <span className="text-xs text-slate-400 block">Rekaman Hari Ini</span>
          <span className="text-xl font-bold font-mono text-blue-600 dark:text-blue-400 block mt-1">
            {metrics?.todayRecordingsCount ?? 0}
          </span>
          <span className="text-[11px] text-slate-400 block mt-0.5">Segmen 24 Jam</span>
        </div>
      </div>

      {/* 2. Visual Disk Allocation Bar */}
      {metrics && (
        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Alokasi & Pemakaian Kapasitas Hard Disk
            </h3>
            <span className="text-xs text-slate-400 font-mono flex items-center gap-1.5">
              <Folder className="w-3.5 h-3.5 text-cyan-500" />
              Folder Aktif: {metrics.storagePath}
            </span>
          </div>
          <StorageUsageBar metrics={metrics} />
        </div>
      )}

      {/* 3. Section H: Breakdown By Camera & Date */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Rekaman Berdasarkan Kamera */}
        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-cyan-500" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Rekaman Berdasarkan Kamera
            </h3>
          </div>

          {cameraBreakdown.length === 0 ? (
            <p className="text-xs text-slate-400 py-3 text-center">Belum ada file rekaman per kamera.</p>
          ) : (
            <div className="space-y-2">
              {cameraBreakdown.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-md bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-cyan-400">
                      <Film className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">{item.name}</span>
                      <span className="text-[11px] text-slate-400 block">{item.count} segmen video</span>
                    </div>
                  </div>
                  <span className="font-mono font-medium text-cyan-600 dark:text-cyan-400">
                    {formatBytes(item.bytes)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Rekaman Berdasarkan Tanggal */}
        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-500" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Rekaman Berdasarkan Tanggal
            </h3>
          </div>

          {dateBreakdown.length === 0 ? (
            <p className="text-xs text-slate-400 py-3 text-center">Belum ada arsip rekaman tercatat.</p>
          ) : (
            <div className="max-h-[220px] overflow-y-auto space-y-2 pr-1">
              {dateBreakdown.map((item) => (
                <div
                  key={item.date}
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-md bg-cyan-600/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                      <Calendar className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">{item.date}</span>
                      <span className="text-[11px] text-slate-400 block">{item.count} segmen tersimpan</span>
                    </div>
                  </div>
                  <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
                    {formatBytes(item.bytes)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 4. Auto Cleanup & Quota Configuration Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Retention Policy */}
        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-500" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Kebijakan Retensi Otomatis (Auto-Cleanup)
            </h3>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Sistem secara berkala menghapus file video lama yang tidak terkunci (*unlocked*)
            menggunakan algoritma FIFO aman untuk mencegah hard disk penuh.
          </p>

          <div className="space-y-3 text-xs">
            <div>
              <label className="text-slate-400 block mb-1">Batas Waktu Simpan Rekaman:</label>
              <select
                value={retentionDays}
                onChange={(e) => handleSaveRetention(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500 cursor-pointer"
              >
                {RETENTION_PRESETS.map((p) => (
                  <option key={p.days} value={p.days}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                File bertanda kunci (🔒) & proses aktif aman terlindungi.
              </span>
              <Button
                variant="danger"
                size="sm"
                onClick={() => setIsCleanupConfirmOpen(true)}
                disabled={isCleaningUp}
              >
                Jalankan Pembersihan Sekarang
              </Button>
            </div>
          </div>
        </div>

        {/* Quota Limit */}
        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-blue-500" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Batas Maksimum Kuota CCTV
            </h3>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Batas maksimum alokasi hard disk yang diizinkan untuk penyimpanan seluruh rekaman CCTV-KU.
          </p>

          <div className="space-y-3 text-xs">
            <div>
              <label className="text-slate-400 block mb-1">Maksimum Kuota Disk (GB):</label>
              <input
                type="number"
                min={10}
                max={4000}
                step={10}
                value={maxQuotaGb}
                onChange={(e) => handleSaveQuota(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 text-[11px] text-blue-800 dark:text-cyan-300">
              Sistem akan memberikan peringatan visual jika kapasitas rekaman mencapai 90% dari batas kuota {maxQuotaGb} GB.
            </div>
          </div>
        </div>
      </div>

      {/* 5. Local Snapshot Gallery (Preserved from Phase 1) */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Arsip Snapshot Lokal ({snapshots.length})
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Foto bukti tangkapan kamera beresolusi penuh
            </p>
          </div>

          {snapshots.length > 0 && (
            <Button
              variant="danger"
              size="sm"
              onClick={handleClearAllSnapshots}
              icon={<Trash2 className="w-3.5 h-3.5" />}
            >
              Hapus Semua Snapshot
            </Button>
          )}
        </div>

        <div className="p-5">
          {snapshots.length === 0 ? (
            <div className="py-8 text-center text-slate-400">
              <HardDrive className="w-8 h-8 mx-auto mb-1 opacity-30" />
              <p className="text-xs">Belum ada snapshot yang tersimpan.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {snapshots.map((item) => (
                <div
                  key={item.id}
                  className="group relative rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-950 overflow-hidden flex flex-col"
                >
                  <div className="aspect-video w-full overflow-hidden bg-slate-900">
                    <img
                      src={item.dataUrl}
                      alt={item.deviceName}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                  <div className="p-2 bg-white dark:bg-slate-900 text-[11px] flex items-center justify-between">
                    <span className="font-mono text-slate-500 truncate">{item.width}×{item.height}</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setActiveSnapshot(item)}
                        className="p-1 hover:text-cyan-500 cursor-pointer"
                        title="Lihat"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteSnapshot(item.id)}
                        className="p-1 hover:text-rose-500 cursor-pointer"
                        title="Hapus"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Snapshot Preview Modal */}
      <SnapshotModal snapshot={activeSnapshot} onClose={() => setActiveSnapshot(null)} />

      {/* Modal: Buka Folder Rekaman (Section I) */}
      <Modal
        isOpen={isFolderModalOpen}
        onClose={() => setIsFolderModalOpen(false)}
        title="Lokasi Folder Rekaman CCTV-KU"
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 rounded-lg border border-blue-200 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/30 text-blue-900 dark:text-cyan-300">
            <p className="leading-relaxed">
              {folderNotice?.message}
            </p>
          </div>

          <div>
            <label className="text-slate-400 block mb-1.5 font-medium">Jalur Direktori Penyimpanan Aktif:</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={folderNotice?.targetPath || metrics?.storagePath || 'C:\\CCTV-KU'}
                className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono text-[11px]"
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={handleCopyPath}
                icon={copiedPath ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              >
                {copiedPath ? 'Tersalin' : 'Salin'}
              </Button>
            </div>
          </div>

          <div>
            <label className="text-slate-400 block mb-1 font-medium">Struktur Hierarki Folder CCTV-KU:</label>
            <pre className="p-3 rounded-lg bg-slate-950 border border-slate-800 font-mono text-[11px] text-cyan-300 overflow-x-auto leading-relaxed">
{`CCTV-KU/
  Camera-01/
    2026/
      11/
        05/
          CCTV_20261105_165200_000.mp4
          CCTV_20261105_165200_001.mp4`}
            </pre>
            <span className="text-[11px] text-slate-400 block mt-1">
              Setiap segmen video MP4 disusun rapi secara otomatis per kamera dan per tanggal.
            </span>
          </div>

          <div className="pt-2 flex justify-end">
            <Button variant="secondary" size="sm" onClick={() => setIsFolderModalOpen(false)}>
              Tutup
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Konfirmasi Pembersihan (Section J) */}
      <Modal
        isOpen={isCleanupConfirmOpen}
        onClose={() => setIsCleanupConfirmOpen(false)}
        title="Konfirmasi Pembersihan Rekaman"
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3.5 rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold mb-1">Peringatan Penghapusan Rekaman Lama</p>
              <p className="leading-relaxed">
                Proses ini akan memeriksa seluruh file video rekaman lokal dan menghapus file yang memenuhi kebijakan retensi:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-slate-700 dark:text-slate-300">
                <li>Rekaman lebih tua dari <strong>{retentionDays} hari</strong></li>
                <li>File fisik dihapus terlebih dahulu dari disk, kemudian metadata SQLite diperbarui</li>
                <li>File yang sedang <strong>direkam aktif tidak akan dihapus</strong></li>
                <li>File dengan status <strong>terkunci (🔒) aman terlindungi</strong></li>
              </ul>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCleanupConfirmOpen(false)}
              disabled={isCleaningUp}
            >
              Batal
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleExecuteCleanup}
              disabled={isCleaningUp}
              icon={isCleaningUp ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            >
              {isCleaningUp ? 'Menjalankan Pembersihan...' : 'Jalankan Pembersihan Sekarang'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Laporan Hasil Pembersihan (Section J Requirements) */}
      <Modal
        isOpen={cleanupReport !== null}
        onClose={() => setCleanupReport(null)}
        title="Laporan Hasil Auto-Cleanup"
        maxWidth="md"
      >
        {cleanupReport && (
          <div className="space-y-4 text-xs">
            <div className={`p-3.5 rounded-lg border flex items-center gap-3 ${
              cleanupReport.status === 'success'
                ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300'
                : cleanupReport.status === 'empty'
                ? 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-cyan-300'
                : 'border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300'
            }`}>
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <div>
                <p className="font-semibold">{cleanupReport.message}</p>
                <p className="text-[11px] opacity-80 mt-0.5">Waktu eksekusi: {formatFullDate(new Date(cleanupReport.executedAt))}</p>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60">
                <span className="text-[11px] text-slate-400 block">File Diperiksa</span>
                <span className="text-base font-bold font-mono text-slate-900 dark:text-slate-100">{cleanupReport.checkedCount}</span>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60">
                <span className="text-[11px] text-slate-400 block">File Dihapus</span>
                <span className="text-base font-bold font-mono text-rose-600 dark:text-rose-400">{cleanupReport.deletedCount}</span>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60">
                <span className="text-[11px] text-slate-400 block">Ruang Dibebaskan</span>
                <span className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400">{formatBytes(cleanupReport.freedBytes)}</span>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60">
                <span className="text-[11px] text-slate-400 block">Dilewati (Terkunci)</span>
                <span className="text-base font-bold font-mono text-amber-500">{cleanupReport.skippedLockedCount}</span>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60">
                <span className="text-[11px] text-slate-400 block">Dilewati (Aktif Rekam)</span>
                <span className="text-base font-bold font-mono text-cyan-500">{cleanupReport.skippedRecordingCount}</span>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60">
                <span className="text-[11px] text-slate-400 block">Gagal Dihapus</span>
                <span className="text-base font-bold font-mono text-slate-400">{cleanupReport.failedCount}</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button variant="secondary" size="sm" onClick={() => setCleanupReport(null)}>
                Selesai
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
