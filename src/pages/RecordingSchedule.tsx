import React from 'react';
import { Calendar, Clock, CheckCircle2, ShieldCheck, Film } from 'lucide-react';

export const RecordingSchedule: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-600/10 border border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Recording Schedule
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Pengaturan jadwal perekaman berkala, perekaman kontinu 24/7, atau berbasis deteksi gerakan
            </p>
          </div>
        </div>
      </div>

      {/* Tahap 2 Scheduled Card */}
      <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-800 bg-white/50 dark:bg-slate-900/40 p-8 text-center max-w-2xl mx-auto space-y-4">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500">
          <Clock className="w-8 h-8 text-purple-500" />
        </div>

        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/50 px-2 py-0.5 rounded border border-purple-200 dark:border-purple-800">
            Fitur Dijadwalkan — Tahap 2
          </span>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-2">
            Mesin Penjadwalan Perekaman Video
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-lg mx-auto leading-relaxed">
            Sistem penjadwalan akan mengontrol proses perekaman otomatis tanpa memerlukan interaksi pengguna.
            Modul ini diintegrasikan bersama daemon background Tauri 2 dan FFmpeg encoder pada Tahap 2.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left pt-4">
          <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
              <Film className="w-4 h-4 text-purple-500" />
              <span>Perekaman Kontinu 24/7</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Perekaman tanpa henti dengan pemotongan segmen per 15/30/60 menit.
            </p>
          </div>

          <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
              <Clock className="w-4 h-4 text-blue-500" />
              <span>Jadwal Khusus Hari</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Penetapan jam kerja aktif (misal Senin-Jumat 08:00 - 18:00 WIB).
            </p>
          </div>

          <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Hemat Penyimpanan</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Rekam hanya saat ada aktivitas atau sensor mendeteksi intrusi.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
