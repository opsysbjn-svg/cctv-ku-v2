import React from 'react';
import { Shield, Cpu, HardDrive, Video, CheckCircle2 } from 'lucide-react';
import { CameraService } from '../../services/cameraService';

interface SystemStatusCardProps {
  detectedCamerasCount: number;
}

export const SystemStatusCard: React.FC<SystemStatusCardProps> = ({ detectedCamerasCount }) => {
  const isMediaSupported = CameraService.isSupported();

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Status & Arsitektur Sistem
        </h3>
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Sistem Siap
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-start gap-2.5">
          <Cpu className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-slate-800 dark:text-slate-200">Framework Desktop</div>
            <div className="text-slate-500 dark:text-slate-400 mt-0.5 font-mono">Tauri 2 (Rust Core)</div>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-start gap-2.5">
          <Video className="w-4 h-4 text-cyan-500 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-slate-800 dark:text-slate-200">Media API</div>
            <div className="text-slate-500 dark:text-slate-400 mt-0.5">
              {isMediaSupported ? 'MediaDevices Aktif' : 'MediaDevices Tidak Didukung'}
            </div>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-start gap-2.5">
          <Shield className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-slate-800 dark:text-slate-200">Target OS</div>
            <div className="text-slate-500 dark:text-slate-400 mt-0.5">Windows 10 / 11 64-bit</div>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-start gap-2.5">
          <HardDrive className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-slate-800 dark:text-slate-200">Storage & Database</div>
            <div className="text-slate-500 dark:text-slate-400 mt-0.5 font-mono">Tahap 2: SQLite & FFmpeg</div>
          </div>
        </div>
      </div>

      <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
        <span>Kamera Terdeteksi: <strong className="text-slate-700 dark:text-slate-200">{detectedCamerasCount} unit</strong></span>
        <span>Build: <strong className="font-mono text-cyan-600 dark:text-cyan-400">v1.0.0-t1</strong></span>
      </div>
    </div>
  );
};
