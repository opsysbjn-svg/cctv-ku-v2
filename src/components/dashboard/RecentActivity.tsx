import React from 'react';
import { ActivityLogItem } from '../../types/system';
import { formatLogTime } from '../../utils/formatters';
import { Camera, HardDrive, Info, AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';

interface RecentActivityProps {
  logs: ActivityLogItem[];
  onClearLogs?: () => void;
}

export const RecentActivity: React.FC<RecentActivityProps> = ({ logs, onClearLogs }) => {
  const getCategoryIcon = (category: string, level: string) => {
    if (level === 'error') return <ShieldAlert className="w-4 h-4 text-rose-500" />;
    if (level === 'warning') return <AlertTriangle className="w-4 h-4 text-amber-500" />;
    if (category === 'camera') return <Camera className="w-4 h-4 text-cyan-500" />;
    if (category === 'storage') return <HardDrive className="w-4 h-4 text-blue-500" />;
    return <Info className="w-4 h-4 text-slate-400" />;
  };

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Aktivitas Terakhir
          </h3>
          <span className="text-xs text-slate-400">({logs.length})</span>
        </div>
        {logs.length > 0 && onClearLogs && (
          <button
            onClick={onClearLogs}
            className="text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:underline cursor-pointer"
          >
            Bersihkan Log
          </button>
        )}
      </div>

      <div className="divide-y divide-slate-100 dark:divide-slate-800/60 max-h-80 overflow-y-auto">
        {logs.length === 0 ? (
          <div className="p-8 text-center text-slate-400 dark:text-slate-500">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Belum ada riwayat aktivitas yang tercatat</p>
            <p className="text-xs mt-1">Aktivitas kamera dan sistem akan muncul di sini</p>
          </div>
        ) : (
          logs.slice(0, 10).map((log) => (
            <div key={log.id} className="p-3.5 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors flex items-start gap-3">
              <div className="mt-0.5 shrink-0">{getCategoryIcon(log.category, log.level)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                    {log.title}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500 shrink-0">
                    {formatLogTime(log.timestamp)}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                  {log.detail}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
