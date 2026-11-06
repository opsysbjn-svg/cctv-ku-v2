import React from 'react';
import { ActivityLogItem } from '../../types/system';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { formatLogTime } from '../../utils/formatters';
import { Bell, Trash2, Camera, Info, ShieldAlert, AlertTriangle } from 'lucide-react';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: ActivityLogItem[];
  onClearLogs?: () => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({
  isOpen,
  onClose,
  logs,
  onClearLogs,
}) => {
  const getIcon = (level: string, category: string) => {
    if (level === 'error') return <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0" />;
    if (level === 'warning') return <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />;
    if (category === 'camera') return <Camera className="w-4 h-4 text-cyan-500 shrink-0" />;
    return <Info className="w-4 h-4 text-blue-500 shrink-0" />;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Notifikasi & Log Aktivitas"
      subtitle={`${logs.length} catatan aktivitas sistem lokal`}
      maxWidth="lg"
      footer={
        <>
          {logs.length > 0 && onClearLogs && (
            <Button
              variant="danger"
              size="sm"
              onClick={onClearLogs}
              icon={<Trash2 className="w-3.5 h-3.5" />}
            >
              Hapus Semua
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={onClose}>
            Tutup
          </Button>
        </>
      }
    >
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {logs.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <Bell className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-xs">Tidak ada notifikasi baru saat ini.</p>
          </div>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className="p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-start gap-3 text-xs"
            >
              <div className="mt-0.5">{getIcon(log.level, log.category)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {log.title}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 shrink-0">
                    {formatLogTime(log.timestamp)}
                  </span>
                </div>
                <p className="text-slate-500 dark:text-slate-400 mt-0.5">{log.detail}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </Modal>
  );
};
