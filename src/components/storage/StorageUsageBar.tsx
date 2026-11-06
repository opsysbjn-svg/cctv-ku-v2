import React from 'react';
import { StorageMetrics } from '../../types/recording';
import { formatBytes } from '../../utils/formatters';

interface StorageUsageBarProps {
  metrics: StorageMetrics;
}

export const StorageUsageBar: React.FC<StorageUsageBarProps> = ({ metrics }) => {
  const total = metrics.totalDiskBytes || 1;
  const cctv = metrics.cctvRecordingsBytes || 0;
  const otherUsed = Math.max(0, metrics.usedDiskBytes - cctv);
  const free = Math.max(0, metrics.availableDiskBytes);

  const cctvPct = Math.min(100, (cctv / total) * 100);
  const otherPct = Math.min(100 - cctvPct, (otherUsed / total) * 100);
  const freePct = Math.max(0, 100 - cctvPct - otherPct);

  return (
    <div className="space-y-3">
      {/* Visual Multi-Segment Bar */}
      <div className="h-4 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex shadow-inner">
        {/* CCTV-KU Usage */}
        <div
          style={{ width: `${Math.max(cctvPct > 0 ? 1 : 0, cctvPct)}%` }}
          className="bg-cyan-500 transition-all duration-300"
          title={`Rekaman CCTV-KU: ${formatBytes(cctv)} (${cctvPct.toFixed(1)}%)`}
        />
        {/* Other System Files */}
        <div
          style={{ width: `${otherPct}%` }}
          className="bg-slate-400 dark:bg-slate-600 transition-all duration-300"
          title={`Sistem & Aplikasi Lain: ${formatBytes(otherUsed)} (${otherPct.toFixed(1)}%)`}
        />
        {/* Free Space */}
        <div
          style={{ width: `${freePct}%` }}
          className="bg-emerald-500/30 transition-all duration-300"
          title={`Ruang Bebas Tersedia: ${formatBytes(free)} (${freePct.toFixed(1)}%)`}
        />
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-between text-xs gap-3 text-slate-500 dark:text-slate-400 font-mono">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 shrink-0" />
          <span>Rekaman CCTV-KU: <strong className="text-slate-800 dark:text-slate-200">{formatBytes(cctv)}</strong></span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-400 dark:bg-slate-600 shrink-0" />
          <span>Sistem & Lainnya: <strong className="text-slate-800 dark:text-slate-200">{formatBytes(otherUsed)}</strong></span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/50 shrink-0" />
          <span>Ruang Bebas: <strong className="text-emerald-600 dark:text-emerald-400">{formatBytes(free)}</strong></span>
        </div>
      </div>
    </div>
  );
};
