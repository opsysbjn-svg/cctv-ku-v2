import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { RecordingItem } from '../types/recording';
import { RecordingService, isTauri } from '../services/recordingService';
import { StorageService } from '../services/storageService';
import { VideoPlayerModal } from '../components/playback/VideoPlayerModal';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import {
  PlaySquare,
  Search,
  Filter,
  Play,
  Lock,
  Unlock,
  Trash2,
  Download,
  FolderOpen,
  Calendar,
  Film,
  RefreshCw,
  HardDrive,
  Info,
  Mic,
  X,
  CheckSquare,
  AlertTriangle,
  ArrowUpDown,
  Copy,
  Check,
  AlertCircle,
} from 'lucide-react';
import { formatBytes, formatDuration, formatFullDate, formatLogTime } from '../utils/formatters';

export const Playback: React.FC = () => {
  const [recordings, setRecordings] = useState<RecordingItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [cameraFilter, setCameraFilter] = useState('all');
  const [codecFilter, setCodecFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [activeRecording, setActiveRecording] = useState<RecordingItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Checkbox multi-select state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // In-app delete modals (replacing window.confirm)
  const [itemToDelete, setItemToDelete] = useState<RecordingItem | null>(null);
  const [isBatchDeleteModalOpen, setIsBatchDeleteModalOpen] = useState(false);
  const [isDownloadingBatch, setIsDownloadingBatch] = useState(false);
  const [batchNotice, setBatchNotice] = useState<string | null>(null);

  // Folder modal
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [folderNotice, setFolderNotice] = useState<{ message: string; targetPath: string; isDesktop: boolean } | null>(null);
  const [copiedPath, setCopiedPath] = useState(false);

  const fetchRecordings = useCallback(async () => {
    setIsLoading(true);
    try {
      const items = await RecordingService.getRecordings({
        searchQuery,
        cameraId: cameraFilter,
        codecFilter,
        dateFilter,
        sortOrder,
      });
      setRecordings(items);
    } catch (e) {
      console.warn('Gagal memuat daftar rekaman:', e);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, cameraFilter, codecFilter, dateFilter, sortOrder]);

  useEffect(() => {
    fetchRecordings();
  }, [fetchRecordings]);

  // Clean selectedIds if recordings list changed
  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => recordings.some((r) => r.id === id)));
  }, [recordings]);

  const handleToggleLock = async (id: string) => {
    await RecordingService.toggleLockRecording(id);
    fetchRecordings();
    if (activeRecording && activeRecording.id === id) {
      setActiveRecording((prev) => (prev ? { ...prev, isLocked: !prev.isLocked } : null));
    }
  };

  // Single delete initiation (opens in-app modal)
  const handleDeleteClick = (item: RecordingItem) => {
    if (item.isLocked) return;
    setItemToDelete(item);
  };

  // Confirm single delete
  const confirmSingleDelete = async () => {
    if (!itemToDelete) return;
    await RecordingService.deleteRecording(itemToDelete.id);
    setSelectedIds((prev) => prev.filter((id) => id !== itemToDelete.id));
    setItemToDelete(null);
    fetchRecordings();
  };

  // Confirm batch delete
  const confirmBatchDelete = async () => {
    const toDelete = recordings.filter((r) => selectedIds.includes(r.id) && !r.isLocked);
    for (const item of toDelete) {
      await RecordingService.deleteRecording(item.id);
    }
    setSelectedIds([]);
    setIsBatchDeleteModalOpen(false);
    fetchRecordings();
  };

  // Single export / download
  const handleExport = async (item: RecordingItem) => {
    let url = item.blobUrl;
    if (!url) {
      const blob = await StorageService.getBlob(item.id);
      if (blob) {
        url = URL.createObjectURL(blob);
      }
    }

    if (url) {
      const a = document.createElement('a');
      a.href = url;
      a.download = item.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      handleOpenFolder(item.filePath);
    }
  };

  // Batch download
  const handleBatchDownload = async () => {
    const toDownload = recordings.filter((r) => selectedIds.includes(r.id));
    if (toDownload.length === 0) return;

    setIsDownloadingBatch(true);
    let downloadedCount = 0;

    for (const item of toDownload) {
      downloadedCount++;
      setBatchNotice(`Mengunduh ${downloadedCount}/${toDownload.length}: ${item.fileName}...`);

      let url = item.blobUrl;
      if (!url) {
        const blob = await StorageService.getBlob(item.id);
        if (blob) {
          url = URL.createObjectURL(blob);
        }
      }

      if (url) {
        const a = document.createElement('a');
        a.href = url;
        a.download = item.fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        await new Promise((resolve) => setTimeout(resolve, 350));
      }
    }

    setIsDownloadingBatch(false);
    setBatchNotice(`Berhasil mengunduh ${toDownload.length} file rekaman.`);
    setTimeout(() => setBatchNotice(null), 3000);
  };

  // Checkbox selection logic
  const isAllSelected = recordings.length > 0 && recordings.every((r) => selectedIds.includes(r.id));
  const isSomeSelected = selectedIds.length > 0 && !isAllSelected;

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(recordings.map((r) => r.id));
    }
  };

  const handleToggleSelectRow = (id: string, e: React.MouseEvent | React.ChangeEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectedRecordings = recordings.filter((r) => selectedIds.includes(r.id));
  const unlockedSelected = selectedRecordings.filter((r) => !r.isLocked);
  const lockedSelected = selectedRecordings.filter((r) => r.isLocked);

  // Distinct camera list for filter dropdown
  const cameraOptions = Array.from(new Set(recordings.map((r) => r.cameraName)));

  // Distinct date list for filter dropdown
  const dateOptions = useMemo(() => {
    const dates = new Set<string>();
    recordings.forEach((r) => {
      if (r.startTime) dates.add(r.startTime.slice(0, 10));
    });
    return Array.from(dates).sort().reverse();
  }, [recordings]);

  const handleOpenFolder = async (path?: string) => {
    const res = await RecordingService.openRecordingFolder(path);
    setFolderNotice(res);
    setIsFolderModalOpen(true);
  };

  const handleCopyPath = () => {
    const p = folderNotice?.targetPath || StorageService.getSettings().customStoragePath || 'C:\\CCTV-KU';
    navigator.clipboard.writeText(p);
    setCopiedPath(true);
    setTimeout(() => setCopiedPath(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-cyan-400">
            <PlaySquare className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Playback & Arsip Rekaman Video
              </h2>
              {isTauri() ? (
                <Badge status="online" label="SQLite Native" size="sm" />
              ) : (
                <Badge status="idle" label="Local IndexedDB" size="sm" />
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Katalog rekaman aktual lokal dengan pemutar video, audio volume kontrol, dan seleksi batch
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleOpenFolder()}
            icon={<FolderOpen className="w-3.5 h-3.5" />}
          >
            Buka Folder Rekaman
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={fetchRecordings}
            disabled={isLoading}
            icon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama file atau kamera..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Camera Filter */}
          <select
            value={cameraFilter}
            onChange={(e) => setCameraFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500 cursor-pointer"
          >
            <option value="all">Semua Kamera</option>
            {cameraOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Date Filter (Section G.3) */}
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500 cursor-pointer font-mono"
          >
            <option value="all">Semua Tanggal</option>
            {dateOptions.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          {/* Codec Filter */}
          <select
            value={codecFilter}
            onChange={(e) => setCodecFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500 cursor-pointer"
          >
            <option value="all">Semua Codec</option>
            <option value="h264">H.264</option>
            <option value="h265">H.265</option>
          </select>

          {/* Sort Order Toggle (Section G.4) */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
            icon={<ArrowUpDown className="w-3.5 h-3.5 text-cyan-400" />}
          >
            {sortOrder === 'desc' ? 'Waktu: Terbaru' : 'Waktu: Terlama'}
          </Button>
        </div>
      </div>

      {/* Batch Actions Toolbar (Appears when 1 or more items are selected) */}
      {selectedIds.length > 0 && (
        <div className="p-3.5 rounded-xl bg-slate-900 border border-cyan-500/60 shadow-lg flex flex-wrap items-center justify-between gap-3 text-xs animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="font-bold text-slate-100 font-mono">
              {selectedIds.length} rekaman dipilih
            </span>
            {lockedSelected.length > 0 && (
              <span className="text-[11px] text-amber-400 font-mono">
                ({lockedSelected.length} terkunci/aman)
              </span>
            )}
            {batchNotice && (
              <span className="text-cyan-300 font-mono text-[11px] ml-2">
                {batchNotice}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Download Selected */}
            <Button
              variant="secondary"
              size="sm"
              onClick={handleBatchDownload}
              disabled={isDownloadingBatch}
              icon={<Download className="w-3.5 h-3.5 text-cyan-400" />}
            >
              {isDownloadingBatch ? 'Mengunduh...' : `Download Terpilih (${selectedIds.length})`}
            </Button>

            {/* Delete Selected */}
            <Button
              variant="danger"
              size="sm"
              onClick={() => setIsBatchDeleteModalOpen(true)}
              disabled={unlockedSelected.length === 0}
              icon={<Trash2 className="w-3.5 h-3.5" />}
            >
              Hapus Terpilih ({unlockedSelected.length})
            </Button>

            {/* Deselect All */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedIds([])}
              icon={<X className="w-3.5 h-3.5" />}
            >
              Batal
            </Button>
          </div>
        </div>
      )}

      {/* Recordings Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 select-none">
              <tr>
                {/* Select All Checkbox */}
                <th className="px-3.5 py-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = isSomeSelected;
                    }}
                    onChange={handleToggleSelectAll}
                    disabled={recordings.length === 0}
                    className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-cyan-500 focus:ring-cyan-500 cursor-pointer accent-cyan-500"
                    title={isAllSelected ? 'Batalkan pilihan semua' : 'Pilih semua rekaman'}
                  />
                </th>
                <th className="px-4 py-3 font-semibold">Nama File</th>
                <th className="px-4 py-3 font-semibold">Kamera</th>
                <th className="px-4 py-3 font-semibold font-mono">Waktu Mulai</th>
                <th className="px-4 py-3 font-semibold font-mono">Durasi</th>
                <th className="px-4 py-3 font-semibold">Codec & Resolusi</th>
                <th className="px-4 py-3 font-semibold font-mono">Ukuran</th>
                <th className="px-4 py-3 font-semibold text-center">Proteksi</th>
                <th className="px-4 py-3 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-800 dark:text-slate-200">
              {recordings.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-slate-400">
                    <Film className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm font-medium">Belum ada file rekaman video aktual.</p>
                    <p className="text-xs mt-1">
                      Mulai sesi perekaman melalui menu <strong>Live Monitoring</strong> atau <strong>Dashboard</strong>.
                    </p>
                  </td>
                </tr>
              ) : (
                recordings.map((rec) => {
                  const startDate = new Date(rec.startTime);
                  const isSelected = selectedIds.includes(rec.id);
                  const isMissing = rec.recordingStatus === 'missing';

                  return (
                    <tr
                      key={rec.id}
                      className={`transition-colors cursor-default ${
                        isSelected
                          ? 'bg-cyan-50/40 dark:bg-cyan-950/20'
                          : isMissing
                          ? 'bg-rose-50/20 dark:bg-rose-950/10'
                          : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      {/* Row Checkbox */}
                      <td className="px-3.5 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => handleToggleSelectRow(rec.id, e)}
                          className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-cyan-500 focus:ring-cyan-500 cursor-pointer accent-cyan-500"
                        />
                      </td>

                      {/* File Name */}
                      <td className="px-4 py-3 font-medium">
                        <div className="flex items-center gap-2">
                          <Film className={`w-4 h-4 shrink-0 ${isMissing ? 'text-rose-400' : 'text-cyan-500'}`} />
                          <div className="flex flex-col">
                            <button
                              onClick={() => !isMissing && setActiveRecording(rec)}
                              disabled={isMissing}
                              className={`font-mono text-left truncate max-w-[220px] ${
                                isMissing
                                  ? 'text-slate-400 line-through cursor-not-allowed'
                                  : 'text-blue-600 dark:text-cyan-400 hover:underline cursor-pointer'
                              }`}
                              title={isMissing ? 'File tidak ditemukan di disk fisik' : 'Klik untuk memutar video'}
                            >
                              {rec.fileName}
                            </button>
                            {isMissing && (
                              <span className="text-[10px] text-rose-500 font-medium">
                                File fisik tidak ditemukan
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Camera */}
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300 truncate max-w-[140px]">
                        {rec.cameraName}
                      </td>

                      {/* Start Time */}
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {formatLogTime(startDate)} ({startDate.toLocaleDateString('id-ID')})
                      </td>

                      {/* Duration */}
                      <td className="px-4 py-3 font-mono text-[11px] font-semibold text-slate-900 dark:text-slate-100">
                        {formatDuration(rec.duration)}
                      </td>

                      {/* Codec & Res + Audio status badge */}
                      <td className="px-4 py-3 font-mono text-[11px]">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-cyan-600 dark:text-cyan-400 mr-1.5 font-bold">
                          {rec.codec}
                        </span>
                        <span className="text-slate-500 dark:text-slate-400 mr-1.5">{rec.resolution}</span>
                        {rec.hasAudio !== false && (
                          <span
                            className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800/80 text-emerald-700 dark:text-emerald-400 text-[9px] font-semibold"
                            title="Klip merekam suara mikrofon"
                          >
                            <Mic className="w-2.5 h-2.5" />
                            AUD
                          </span>
                        )}
                      </td>

                      {/* File Size */}
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                        {formatBytes(rec.fileSize)}
                      </td>

                      {/* Locked State */}
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleToggleLock(rec.id)}
                          className={`p-1 rounded transition-colors cursor-pointer ${
                            rec.isLocked
                              ? 'text-cyan-500 hover:text-cyan-400'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                          title={rec.isLocked ? 'Terkunci (Klik untuk membuka)' : 'Buka (Klik untuk mengunci)'}
                        >
                          {rec.isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setActiveRecording(rec)}
                            disabled={isMissing}
                            className={`p-1.5 rounded-lg transition-colors ${
                              isMissing
                                ? 'opacity-30 cursor-not-allowed text-slate-500'
                                : 'text-slate-600 hover:text-cyan-400 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer'
                            }`}
                            title={isMissing ? 'File tidak ditemukan' : 'Putar Video & Audio'}
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                          </button>

                          <button
                            onClick={() => handleExport(rec)}
                            disabled={isMissing}
                            className={`p-1.5 rounded-lg transition-colors ${
                              isMissing
                                ? 'opacity-30 cursor-not-allowed text-slate-500'
                                : 'text-slate-600 hover:text-blue-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer'
                            }`}
                            title="Download File Rekaman"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDeleteClick(rec)}
                            disabled={rec.isLocked}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              rec.isLocked
                                ? 'opacity-30 cursor-not-allowed text-slate-500'
                                : 'text-slate-600 hover:text-rose-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                            }`}
                            title={rec.isLocked ? 'File terkunci, buka kunci dahulu' : 'Hapus Rekaman'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Buka Folder Rekaman */}
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
            <label className="text-slate-400 block mb-1.5 font-medium">Jalur Direktori Penyimpanan:</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={folderNotice?.targetPath || StorageService.getSettings().customStoragePath || 'C:\\CCTV-KU'}
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

          <div className="pt-2 flex justify-end">
            <Button variant="secondary" size="sm" onClick={() => setIsFolderModalOpen(false)}>
              Tutup
            </Button>
          </div>
        </div>
      </Modal>

      {/* Single Delete Confirmation Modal */}
      <Modal
        isOpen={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        title="Hapus File Rekaman"
        maxWidth="md"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setItemToDelete(null)}>
              Batal
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={confirmSingleDelete}
              icon={<Trash2 className="w-3.5 h-3.5" />}
            >
              Hapus Permanen
            </Button>
          </>
        }
      >
        {itemToDelete && (
          <div className="space-y-3 text-xs text-slate-300">
            <p>
              Apakah Anda yakin ingin menghapus file rekaman berikut secara permanen?
            </p>
            <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5 font-mono text-[11px]">
              <div>
                <span className="text-slate-500">File:</span>{' '}
                <strong className="text-slate-100">{itemToDelete.fileName}</strong>
              </div>
              <div>
                <span className="text-slate-500">Kamera:</span>{' '}
                <span className="text-cyan-400">{itemToDelete.cameraName}</span>
              </div>
              <div>
                <span className="text-slate-500">Ukuran:</span> {formatBytes(itemToDelete.fileSize)} |{' '}
                <span className="text-slate-500">Durasi:</span> {formatDuration(itemToDelete.duration)}
              </div>
              <div>
                <span className="text-slate-500">Path:</span>{' '}
                <span className="text-slate-400 break-all">{itemToDelete.filePath}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 rounded bg-rose-950/40 border border-rose-800/50 text-rose-300 text-[11px]">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>File fisik rekaman akan dihapus dari penyimpanan dan tidak dapat dipulihkan.</span>
            </div>
          </div>
        )}
      </Modal>

      {/* Batch Delete Confirmation Modal */}
      <Modal
        isOpen={isBatchDeleteModalOpen}
        onClose={() => setIsBatchDeleteModalOpen(false)}
        title="Hapus Rekaman Terpilih"
        maxWidth="md"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setIsBatchDeleteModalOpen(false)}>
              Batal
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={confirmBatchDelete}
              icon={<Trash2 className="w-3.5 h-3.5" />}
            >
              Hapus {unlockedSelected.length} File
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-xs text-slate-300">
          <p>
            Apakah Anda yakin ingin menghapus{' '}
            <strong className="text-white">{unlockedSelected.length} file rekaman</strong> yang dipilih
            secara permanen?
          </p>
          {lockedSelected.length > 0 && (
            <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-800/60 text-amber-300 text-[11px]">
              <strong>Catatan:</strong> {lockedSelected.length} file terlindungi/terkunci akan dilewati dan tidak akan dihapus.
            </div>
          )}
          <div className="flex items-center gap-2 p-2 rounded bg-rose-950/40 border border-rose-800/50 text-rose-300 text-[11px]">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>Tindakan ini permanen dan akan menghapus file fisik dari hard disk lokal.</span>
          </div>
        </div>
      </Modal>

      {/* Video Player Modal */}
      <VideoPlayerModal
        recording={activeRecording}
        onClose={() => setActiveRecording(null)}
        onToggleLock={handleToggleLock}
      />
    </div>
  );
};
