import React from 'react';
import { Activity, ShieldAlert, Sliders, Bell, Eye, Cpu } from 'lucide-react';

export const MotionDetection: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-600/10 border border-cyan-500/20 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Motion Detection
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Deteksi perubahan visual per-frame, penentuan zona sensitif, dan pemicu alarm otomatis
            </p>
          </div>
        </div>
      </div>

      {/* Tahap 2 Planned Module Card */}
      <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-800 bg-white/50 dark:bg-slate-900/40 p-8 text-center max-w-2xl mx-auto space-y-4">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500">
          <ShieldAlert className="w-8 h-8 text-amber-500/80" />
        </div>

        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
            Fitur Dijadwalkan — Tahap 2
          </span>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-2">
            Deteksi Gerakan Berbasis Frame Analysis
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-lg mx-auto leading-relaxed">
            Algoritma deteksi gerakan menggunakan Web Worker Canvas pixel differencing dan OpenCV/Rust
            sedang dipersiapkan untuk Tahap 2 guna menjaga efisiensi CPU tanpa membebani sistem operasi.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left pt-4">
          <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
              <Eye className="w-4 h-4 text-cyan-500" />
              <span>Zona Monitoring</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Pemetaan area spesifik (masking) untuk mengabaikan pergerakan dahan atau jalan umum.
            </p>
          </div>

          <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
              <Sliders className="w-4 h-4 text-blue-500" />
              <span>Ambang Sensitivitas</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Pengaturan sensitivitas pixel delta untuk mencegah alarm palsu akibat perubahan cahaya.
            </p>
          </div>

          <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
              <Bell className="w-4 h-4 text-rose-500" />
              <span>Pemicu Notifikasi</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Pemberitahuan instan di desktop Windows dan pengambilan snapshot bukti kejadian.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
