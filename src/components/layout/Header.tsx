import React, { useState, useEffect } from 'react';
import {
  Cctv,
  Sun,
  Moon,
  Monitor,
  Bell,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { AppPage, ThemeMode } from '../../types/system';
import { CameraStatus } from '../../types/camera';
import { formatDigitalTime, formatFullDate } from '../../utils/formatters';

interface HeaderProps {
  activePage: AppPage;
  theme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  cameraStatus: CameraStatus;
  unreadLogsCount: number;
  onOpenNotifications: () => void;
  isRecording?: boolean;
}

const PAGE_TITLES: Record<AppPage, { title: string; subtitle: string }> = {
  dashboard: { title: 'Dashboard', subtitle: 'Pusat Kontrol & Ringkasan Sistem CCTV' },
  live: { title: 'Live Monitoring', subtitle: 'Pemantauan Kamera Real-Time' },
  playback: { title: 'Playback Rekaman', subtitle: 'Pemutaran Arsip Video Lokal' },
  cameras: { title: 'Daftar Kamera', subtitle: 'Manajemen Perangkat & Pengaturan Sensor' },
  motion: { title: 'Motion Detection', subtitle: 'Deteksi Gerakan & Pemicu Alarm' },
  storage: { title: 'Storage Manager', subtitle: 'Penyimpanan Lokal & Manajemen Kuota' },
  schedule: { title: 'Recording Schedule', subtitle: 'Jadwal Perekaman Otomatis' },
  reports: { title: 'Laporan & Log', subtitle: 'Audit Log & Riwayat Aktivitas Keamanan' },
  settings: { title: 'Pengaturan Sistem', subtitle: 'Konfigurasi Aplikasi & Preferensi Desktop' },
};

export const Header: React.FC<HeaderProps> = ({
  activePage,
  theme,
  onThemeChange,
  isSidebarCollapsed,
  onToggleSidebar,
  cameraStatus,
  unreadLogsCount,
  onOpenNotifications,
  isRecording = false,
}) => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDate(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const { time, seconds } = formatDigitalTime(currentDate);
  const dateStr = formatFullDate(currentDate);
  const pageInfo = PAGE_TITLES[activePage] || { title: 'CCTV-KU', subtitle: '' };

  const cycleTheme = () => {
    if (theme === 'dark') onThemeChange('light');
    else if (theme === 'light') onThemeChange('system');
    else onThemeChange('dark');
  };

  const getCameraStatusIndicator = () => {
    if (isRecording) {
      return {
        label: 'Merekam Video (REC)',
        dot: 'bg-rose-500 animate-pulse',
        text: 'text-rose-600 dark:text-rose-400 font-bold font-mono',
      };
    }
    switch (cameraStatus) {
      case 'streaming':
        return {
          label: 'Live Streaming',
          dot: 'bg-emerald-500 animate-pulse',
          text: 'text-emerald-600 dark:text-emerald-400',
        };
      case 'requesting':
        return {
          label: 'Menghubungkan...',
          dot: 'bg-amber-500',
          text: 'text-amber-600 dark:text-amber-400',
        };
      case 'error':
        return {
          label: 'Gangguan Kamera',
          dot: 'bg-rose-500',
          text: 'text-rose-600 dark:text-rose-400',
        };
      default:
        return {
          label: 'Standby',
          dot: 'bg-slate-400 dark:bg-slate-600',
          text: 'text-slate-500 dark:text-slate-400',
        };
    }
  };

  const statusInfo = getCameraStatusIndicator();

  return (
    <header className="h-16 px-4 md:px-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 shrink-0 transition-colors">
      {/* Left zone: Sidebar toggle + Active page title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          aria-label={isSidebarCollapsed ? 'Perlebar Sidebar' : 'Kecilkan Sidebar'}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800/80 transition-colors cursor-pointer"
        >
          {isSidebarCollapsed ? (
            <PanelLeftOpen className="w-5 h-5 text-blue-600 dark:text-cyan-400" />
          ) : (
            <PanelLeftClose className="w-5 h-5" />
          )}
        </button>

        <div className="hidden sm:block">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-none">
              {pageInfo.title}
            </h1>
            <span className="hidden lg:inline text-xs text-slate-400 dark:text-slate-500">|</span>
            <p className="hidden lg:inline text-xs text-slate-500 dark:text-slate-400">
              {pageInfo.subtitle}
            </p>
          </div>
        </div>
      </div>

      {/* Center/Right zone: Camera Status + Real-Time Digital Clock + Controls */}
      <div className="flex items-center gap-3 md:gap-5">
        {/* System & Camera Status */}
        <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-md bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
          <span className={`w-2 h-2 rounded-full ${statusInfo.dot} shrink-0`} />
          <span className={`text-xs font-medium ${statusInfo.text}`}>{statusInfo.label}</span>
        </div>

        {/* Real-time Digital Clock & Date */}
        <div className="flex flex-col items-end">
          <div className="flex items-baseline gap-1 font-mono text-slate-900 dark:text-slate-100">
            <span className="text-base font-semibold tracking-tight">{time}</span>
            <span className="text-xs text-cyan-600 dark:text-cyan-400 font-medium">:{seconds}</span>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 capitalize leading-none hidden md:inline">
            {dateStr}
          </span>
        </div>

        <div className="h-6 w-px bg-slate-200 dark:bg-slate-800" aria-hidden="true" />

        {/* Theme mode button */}
        <button
          onClick={cycleTheme}
          title={`Tema saat ini: ${theme}. Klik untuk mengganti.`}
          className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label="Ganti mode tema"
        >
          {theme === 'dark' ? (
            <Moon className="w-4 h-4 text-cyan-400" />
          ) : theme === 'light' ? (
            <Sun className="w-4 h-4 text-amber-500" />
          ) : (
            <Monitor className="w-4 h-4 text-blue-500" />
          )}
        </button>

        {/* Notifications Button */}
        <button
          onClick={onOpenNotifications}
          title="Buka Log & Notifikasi Aktivitas"
          aria-label="Notifikasi aktivitas"
          className="relative p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <Bell className="w-4 h-4" />
          {unreadLogsCount > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-blue-600 dark:bg-cyan-400 rounded-full ring-2 ring-white dark:ring-slate-900" />
          )}
        </button>
      </div>
    </header>
  );
};
