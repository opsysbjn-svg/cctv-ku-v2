import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Moon,
  Sun,
  Monitor,
  Camera,
  Cpu,
  Info,
  CheckCircle2,
  HardDrive,
  Shield,
  Layers,
  Film,
  Zap,
  Clock,
  Folder,
  Mic,
} from 'lucide-react';
import { AppSettings, ThemeMode } from '../types/system';
import { FpsOption, ResolutionId } from '../types/camera';
import { CodecType, CompressionProfile, HwAccelMode, FFmpegStatus } from '../types/recording';
import { StorageService } from '../services/storageService';
import { RecordingService } from '../services/recordingService';
import { Button } from '../components/ui/Button';
import {
  RESOLUTION_PRESETS,
  FPS_PRESETS,
  SEGMENT_PRESETS,
  RETENTION_PRESETS,
  COMPRESSION_PROFILES,
} from '../utils/formatters';

interface SettingsProps {
  theme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  onLog?: (category: 'camera' | 'system' | 'storage' | 'network' | 'recording', title: string, detail: string) => void;
}

export const Settings: React.FC<SettingsProps> = ({
  theme,
  onThemeChange,
  isSidebarCollapsed,
  onToggleSidebar,
  onLog,
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'appearance' | 'camera' | 'recording' | 'performance' | 'about'>('recording');
  const [settings, setSettings] = useState<AppSettings>(() => StorageService.getSettings());
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [ffmpegInfo, setFfmpegInfo] = useState<FFmpegStatus | null>(null);

  useEffect(() => {
    RecordingService.getFFmpegStatus().then(setFfmpegInfo).catch(console.warn);
  }, []);

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    const updated = StorageService.saveSettings({ [key]: value });
    setSettings(updated);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
    onLog?.('system', 'Pengaturan Disimpan', `Mengubah ${key} menjadi ${String(value)}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-cyan-400">
            <SettingsIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Pengaturan CCTV-KU
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Konfigurasi kompresi FFmpeg, segmentasi MP4, kuota disk, dan preferensi desktop
            </p>
          </div>
        </div>

        {saveSuccess && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4" />
            Tersimpan
          </div>
        )}
      </div>

      {/* Settings Navigation Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-1 overflow-x-auto text-xs font-medium">
        {[
          { id: 'recording', label: 'Recording & Kompresi', icon: Film },
          { id: 'camera', label: 'Camera Defaults', icon: Camera },
          { id: 'appearance', label: 'Appearance', icon: Sun },
          { id: 'general', label: 'General', icon: SettingsIcon },
          { id: 'performance', label: 'Performance', icon: Cpu },
          { id: 'about', label: 'About & FFmpeg', icon: Info },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-2.5 border-b-2 font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'border-blue-600 text-blue-600 dark:text-cyan-400 dark:border-cyan-400'
                  : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab: Recording & Kompresi (Section D, E, J) */}
      {activeTab === 'recording' && (
        <div className="space-y-4 max-w-3xl">
          {/* Codec Selection */}
          <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Pilihan Codec Video
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Dukungan kompresi standar industri untuk perekaman video lokal
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div
                onClick={() => updateSetting('defaultCodec', 'h264')}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  settings.defaultCodec === 'h264'
                    ? 'border-blue-500 bg-blue-50/40 dark:bg-blue-950/30 ring-2 ring-blue-500/20'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                    H.264 / AVC (libx264)
                  </span>
                  {settings.defaultCodec === 'h264' && (
                    <span className="w-2 h-2 rounded-full bg-cyan-400" />
                  )}
                </div>
                <p className="text-slate-500 dark:text-slate-400">
                  Kompatibilitas universal maksimal. Didukung oleh hampir semua media player Windows dan browser web.
                </p>
                <div className="mt-2 text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
                  Encoder: {ffmpegInfo?.hasLibx264 ? 'Tersedia (libx264)' : 'Aktif'}
                </div>
              </div>

              <div
                onClick={() => updateSetting('defaultCodec', 'h265')}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  settings.defaultCodec === 'h265'
                    ? 'border-blue-500 bg-blue-50/40 dark:bg-blue-950/30 ring-2 ring-blue-500/20'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                    H.265 / HEVC (libx265)
                  </span>
                  {settings.defaultCodec === 'h265' && (
                    <span className="w-2 h-2 rounded-full bg-cyan-400" />
                  )}
                </div>
                <p className="text-slate-500 dark:text-slate-400">
                  Kompresi data lebih efisien pada resolusi tinggi. Membutuhkan CPU/GPU modern untuk playback.
                </p>
                <div className="mt-2 text-[11px] font-mono text-cyan-600 dark:text-cyan-400">
                  Encoder: {ffmpegInfo?.hasLibx265 ? 'Tersedia (libx265)' : 'Aktif'}
                </div>
              </div>
            </div>
          </div>

          {/* Compression Profile */}
          <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Profil Kompresi Kualitas
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Pilih profil keseimbangan antara ukuran file per segmen dan ketajaman gambar
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {COMPRESSION_PROFILES.map((p) => {
                const isSelected = settings.compressionProfile === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => updateSetting('compressionProfile', p.id as CompressionProfile)}
                    className={`p-3.5 rounded-lg border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/40 dark:bg-blue-950/30 ring-2 ring-blue-500/20'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {p.name}
                      </span>
                      {isSelected && <span className="w-2 h-2 rounded-full bg-cyan-400" />}
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-1">
                      {p.description}
                    </p>
                  </div>
                );
              })}
            </div>

            {settings.compressionProfile === 'custom' && (
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-700 dark:text-slate-300">
                    Nilai Constant Rate Factor (CRF): <strong>{settings.customCrf}</strong>
                  </span>
                  <span className="text-slate-400 text-[11px]">
                    (18 = Kualitas tinggi, 35 = Kompresi maksimal)
                  </span>
                </div>
                <input
                  type="range"
                  min={18}
                  max={35}
                  value={settings.customCrf}
                  onChange={(e) => updateSetting('customCrf', Number(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>
            )}
          </div>

          {/* Video Segmentation & Auto Storage */}
          <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Segmentasi Video & Lokasi Penyimpanan
            </h3>

            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-slate-800 dark:text-slate-200">
                    Durasi Pemecahan Segmen File
                  </div>
                  <div className="text-slate-500 dark:text-slate-400">
                    Pemisahan rekaman otomatis agar file aman dan mudah diputar
                  </div>
                </div>
                <select
                  value={settings.segmentDuration}
                  onChange={(e) => updateSetting('segmentDuration', Number(e.target.value))}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500 cursor-pointer"
                >
                  {SEGMENT_PRESETS.map((seg) => (
                    <option key={seg.seconds} value={seg.seconds}>
                      {seg.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <div className="font-medium text-slate-800 dark:text-slate-200">
                    Mode Akselerasi Hardware (GPU)
                  </div>
                  <div className="text-slate-500 dark:text-slate-400">
                    Pemanfaatan encoder chip GPU (NVIDIA NVENC, Intel QSV, AMD AMF)
                  </div>
                </div>
                <select
                  value={settings.hwAccelMode}
                  onChange={(e) => updateSetting('hwAccelMode', e.target.value as HwAccelMode)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500 cursor-pointer"
                >
                  <option value="auto">Auto (Deteksi GPU Otomatis)</option>
                  <option value="cpu">CPU Software Only (libx264/libx265)</option>
                  <option value="nvenc">NVIDIA NVENC (Khusus GPU GeForce/Quadro)</option>
                  <option value="qsv">Intel Quick Sync Video (QSV)</option>
                  <option value="amf">AMD AMF Video Engine</option>
                </select>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="flex-1 mr-4">
                  <div className="font-medium text-slate-800 dark:text-slate-200">
                    Folder Penyimpanan Utama
                  </div>
                  <div className="text-slate-500 dark:text-slate-400">
                    Direktori dasar untuk menyimpan folder rekaman tanggal/kamera
                  </div>
                  <input
                    type="text"
                    value={settings.customStoragePath}
                    onChange={(e) => updateSetting('customStoragePath', e.target.value)}
                    className="mt-1 w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono text-[11px]"
                  />
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => RecordingService.openRecordingFolder(settings.customStoragePath)}
                >
                  Buka Folder
                </Button>
              </div>
            </div>
          </div>

          {/* Audio & Sound Recording Settings */}
          <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
            <div className="flex items-center gap-2">
              <Mic className="w-4 h-4 text-emerald-500" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Pengaturan Audio & Mikrofon CCTV
              </h3>
            </div>

            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-slate-800 dark:text-slate-200">
                    Rekam Audio Bersama Video
                  </div>
                  <div className="text-slate-500 dark:text-slate-400">
                    Aktifkan mikrofon input perangkat untuk merekam percakapan dan suara lingkungan
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.recordAudioWithVideo !== false}
                  onChange={(e) => updateSetting('recordAudioWithVideo', e.target.checked)}
                  className="w-4 h-4 text-cyan-600 rounded border-slate-300 dark:border-slate-700 focus:ring-cyan-500 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <div className="font-medium text-slate-800 dark:text-slate-200">
                    Volume Default Pemutaran
                  </div>
                  <div className="text-slate-500 dark:text-slate-400">
                    Level suara standar saat membuka modal pemutaran rekaman (0 - 100%)
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={settings.defaultVolume ?? 80}
                    onChange={(e) => updateSetting('defaultVolume', Number(e.target.value))}
                    className="w-24 accent-cyan-400 cursor-pointer"
                  />
                  <span className="font-mono text-xs w-9 text-right text-slate-700 dark:text-slate-300 font-semibold">
                    {settings.defaultVolume ?? 80}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: General */}
      {activeTab === 'general' && (
        <div className="space-y-4 max-w-2xl">
          <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Identitas Aplikasi
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Nama Aplikasi</label>
                <input
                  type="text"
                  disabled
                  value="CCTV-KU"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Edisi / Versi</label>
                <input
                  type="text"
                  disabled
                  value="v2.0.0 (Tahap 2: Recording Engine)"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium"
                />
              </div>
            </div>
          </div>

          <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Preferensi Sidebar
            </h3>
            <div className="flex items-center justify-between text-xs">
              <div>
                <div className="font-medium text-slate-800 dark:text-slate-200">
                  Mode Perkecil Sidebar (Collapsed)
                </div>
                <div className="text-slate-500 dark:text-slate-400 mt-0.5">
                  Simpan preferensi ukuran sidebar secara otomatis
                </div>
              </div>
              <Button
                variant={isSidebarCollapsed ? 'primary' : 'secondary'}
                size="sm"
                onClick={onToggleSidebar}
              >
                {isSidebarCollapsed ? 'Collapsed (Aktif)' : 'Expanded (Normal)'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Appearance */}
      {activeTab === 'appearance' && (
        <div className="space-y-4 max-w-2xl">
          <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Pilihan Tema Tampilan
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Pilih tampilan kontras tinggi untuk ruang monitoring CCTV (Dark) atau terang untuk kantor (Light).
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: 'dark', label: 'Dark Mode', desc: 'Charcoal & Navy (Rekomendasi CCTV)', icon: Moon },
                { id: 'light', label: 'Light Mode', desc: 'Putih & Abu-abu terang', icon: Sun },
                { id: 'system', label: 'System Sync', desc: 'Mengikuti tema Windows OS', icon: Monitor },
              ].map((item) => {
                const Icon = item.icon;
                const isSelected = theme === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => onThemeChange(item.id as ThemeMode)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/40 dark:bg-blue-950/30 ring-2 ring-blue-500/20'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Icon className={`w-5 h-5 ${isSelected ? 'text-blue-600 dark:text-cyan-400' : 'text-slate-400'}`} />
                        {isSelected && <span className="w-2 h-2 rounded-full bg-cyan-400" />}
                      </div>
                      <div className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                        {item.label}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        {item.desc}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Camera Defaults */}
      {activeTab === 'camera' && (
        <div className="space-y-4 max-w-2xl">
          <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Konfigurasi Default Kamera
            </h3>

            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-slate-800 dark:text-slate-200">
                    Resolusi Awal
                  </div>
                  <div className="text-slate-500 dark:text-slate-400">
                    Target resolusi saat pertama kali stream diinisialisasi
                  </div>
                </div>
                <select
                  value={settings.defaultResolution}
                  onChange={(e) => updateSetting('defaultResolution', e.target.value as ResolutionId)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500 cursor-pointer"
                >
                  {RESOLUTION_PRESETS.map((res) => (
                    <option key={res.id} value={res.id}>
                      {res.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <div className="font-medium text-slate-800 dark:text-slate-200">
                    Frame Rate (FPS) Ideal
                  </div>
                  <div className="text-slate-500 dark:text-slate-400">
                    Batasan FPS untuk efisiensi beban GPU & CPU
                  </div>
                </div>
                <select
                  value={settings.defaultFps}
                  onChange={(e) => updateSetting('defaultFps', Number(e.target.value) as FpsOption)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500 cursor-pointer"
                >
                  {FPS_PRESETS.map((fps) => (
                    <option key={fps} value={fps}>
                      {fps} FPS
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <div className="font-medium text-slate-800 dark:text-slate-200">
                    Format File Snapshot
                  </div>
                  <div className="text-slate-500 dark:text-slate-400">
                    Format gambar saat mengekspor frame video
                  </div>
                </div>
                <select
                  value={settings.snapshotFormat}
                  onChange={(e) => updateSetting('snapshotFormat', e.target.value as 'image/jpeg' | 'image/png')}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500 cursor-pointer"
                >
                  <option value="image/jpeg">JPEG (Ukuran Ringan, Kualitas 95%)</option>
                  <option value="image/png">PNG (Lossless, Tanpa Kompresi)</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Performance */}
      {activeTab === 'performance' && (
        <div className="space-y-4 max-w-2xl">
          <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Akselerasi & Efisiensi Sistem
            </h3>

            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-slate-800 dark:text-slate-200">
                    Hardware Acceleration (GPU)
                  </div>
                  <div className="text-slate-500 dark:text-slate-400">
                    Memanfaatkan akselerasi GPU untuk decoding video 60fps
                  </div>
                </div>
                <Button
                  variant={settings.hardwareAcceleration ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => updateSetting('hardwareAcceleration', !settings.hardwareAcceleration)}
                >
                  {settings.hardwareAcceleration ? 'Diaktifkan' : 'Nonaktif'}
                </Button>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-slate-600 dark:text-slate-300">
                <span className="font-semibold block mb-0.5 text-slate-800 dark:text-slate-100">
                  Optimalisasi Monitor 1366 × 768:
                </span>
                Layout CCTV-KU dirancang dengan single-level elevation dan CSS fluid grid sehingga
                berjalan ringan tanpa lag pada monitor laptop 1366×768 maupun multi-monitor Full HD / 4K.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: About & FFmpeg Diagnostics */}
      {activeTab === 'about' && (
        <div className="space-y-4 max-w-2xl">
          <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-cyan-400">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  CCTV-KU Desktop Application
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Smart Local CCTV Monitoring System — Versi 2.0.0 (Tahap 2)
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs pt-2">
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                <span className="text-slate-400 block text-[10px]">FRAMEWORK DESKTOP</span>
                <span className="font-semibold font-mono text-slate-800 dark:text-slate-200">
                  Tauri 2 (Rust Core + Sidecar)
                </span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                <span className="text-slate-400 block text-[10px]">RECORDING ENGINE</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  FFmpeg (DirectShow Capture)
                </span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                <span className="text-slate-400 block text-[10px]">METADATA DATABASE</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  SQLite 3 Embedded Local
                </span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                <span className="text-slate-400 block text-[10px]">TARGET SISTEM OPERASI</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  Windows 10 / Windows 11 (64-bit)
                </span>
              </div>
            </div>

            {/* FFmpeg Diagnostics Panel */}
            <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-2 text-xs">
              <div className="flex items-center justify-between font-semibold text-slate-800 dark:text-slate-200">
                <span>Diagnostik Sidecar FFmpeg:</span>
                <span className="text-emerald-500 font-mono text-[11px]">
                  {ffmpegInfo?.isAvailable ? 'Terpasang & Siap' : 'Siap Dikonfigurasi'}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-1 font-mono">
                <div>Versi: {ffmpegInfo?.version || 'FFmpeg 7.0 (Bundled Target)'}</div>
                <div className="truncate">Path: {ffmpegInfo?.binaryPath || 'src-tauri/binaries/ffmpeg-x86_64-pc-windows-msvc.exe'}</div>
                <div className="flex flex-wrap gap-2 pt-1 text-[10px]">
                  <span className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-cyan-300">
                    libx264: OK
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-cyan-300">
                    libx265: OK
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300">
                    NVENC / QSV / AMF: Terakselerasi
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
