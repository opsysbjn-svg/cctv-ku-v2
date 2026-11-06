import React, { useState } from 'react';
import { ActivityLogItem } from '../types/system';
import { FileText, Download, Trash2, Search, Filter, Camera, ShieldAlert, AlertTriangle, Info } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { formatLogTime, formatFullDate } from '../utils/formatters';

interface ReportsProps {
  logs: ActivityLogItem[];
  onClearLogs?: () => void;
}

export const Reports: React.FC<ReportsProps> = ({ logs, onClearLogs }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'camera' | 'system' | 'storage'>('all');

  const filteredLogs = logs.filter((log) => {
    const matchesCategory = categoryFilter === 'all' || log.category === categoryFilter;
    const matchesSearch =
      searchTerm === '' ||
      log.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.detail.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `cctv-ku-audit-log-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const getLogIcon = (level: string, category: string) => {
    if (level === 'error') return <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0" />;
    if (level === 'warning') return <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />;
    if (category === 'camera') return <Camera className="w-4 h-4 text-cyan-500 shrink-0" />;
    return <Info className="w-4 h-4 text-blue-500 shrink-0" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-cyan-400">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Laporan & Audit Log Aktivitas
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Riwayat peristiwa sistem, perubahan status sensor kamera, dan pencatatan audit lokal
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportJson}
            disabled={logs.length === 0}
            icon={<Download className="w-3.5 h-3.5" />}
          >
            Export Log (.JSON)
          </Button>

          {onClearLogs && (
            <Button
              variant="danger"
              size="sm"
              onClick={onClearLogs}
              disabled={logs.length === 0}
              icon={<Trash2 className="w-3.5 h-3.5" />}
            >
              Hapus Semua Log
            </Button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari kata kunci di riwayat log..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-medium">
          {(['all', 'camera', 'system', 'storage'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-md capitalize transition-colors cursor-pointer ${
                categoryFilter === cat
                  ? 'bg-blue-600 text-white font-semibold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              {cat === 'all' ? 'Semua Kategori' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3 font-semibold w-40 font-mono">Timestamp</th>
                <th className="px-4 py-3 font-semibold w-28">Kategori</th>
                <th className="px-4 py-3 font-semibold w-48">Peristiwa</th>
                <th className="px-4 py-3 font-semibold">Rincian Informasi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-800 dark:text-slate-200">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-400">
                    Tidak ada catatan aktivitas yang cocok dengan filter.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const d = new Date(log.timestamp);
                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {formatLogTime(d)} ({d.toLocaleDateString('id-ID')})
                      </td>
                      <td className="px-4 py-3 capitalize">
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {log.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium">
                        <div className="flex items-center gap-2">
                          {getLogIcon(log.level, log.category)}
                          <span className="truncate">{log.title}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400 break-words">
                        {log.detail}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
