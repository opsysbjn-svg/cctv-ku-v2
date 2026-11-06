import React from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { AlertTriangle, Square } from 'lucide-react';
import { formatDuration } from '../../utils/formatters';

interface StopConfirmModalProps {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  elapsedSeconds: number;
  cameraName: string;
}

export const StopConfirmModal: React.FC<StopConfirmModalProps> = ({
  isOpen,
  onCancel,
  onConfirm,
  elapsedSeconds,
  cameraName,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title="Hentikan Sesi Perekaman?"
      subtitle={`Kamera: ${cameraName} | Durasi: ${formatDuration(elapsedSeconds)}`}
      maxWidth="md"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Lanjutkan Merekam
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={onConfirm}
            icon={<Square className="w-3.5 h-3.5 fill-current" />}
          >
            Hentikan & Simpan
          </Button>
        </>
      }
    >
      <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
        <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-300">
          <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
          <p>
            Proses perekaman akan dihentikan secara aman (*graceful stop*). Segmen file video terakhir
            akan difinalisasi dan metadata akan dicatat ke dalam database SQLite lokal.
          </p>
        </div>
        <p className="text-slate-500 dark:text-slate-400">
          File rekaman dapat langsung diputar kembali dan dikelola melalui menu <strong>Playback</strong> atau <strong>Storage Manager</strong>.
        </p>
      </div>
    </Modal>
  );
};
