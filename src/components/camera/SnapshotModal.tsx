import React from 'react';
import { SnapshotData } from '../../types/camera';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Download, Calendar, Camera, Maximize } from 'lucide-react';
import { formatFullDate, formatLogTime } from '../../utils/formatters';

interface SnapshotModalProps {
  snapshot: SnapshotData | null;
  onClose: () => void;
}

export const SnapshotModal: React.FC<SnapshotModalProps> = ({ snapshot, onClose }) => {
  if (!snapshot) return null;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = snapshot.dataUrl;
    const dateFormatted = new Date(snapshot.timestamp).toISOString().replace(/[:.]/g, '-');
    link.download = `cctv-ku-snapshot-${dateFormatted}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const timestamp = new Date(snapshot.timestamp);

  return (
    <Modal
      isOpen={!!snapshot}
      onClose={onClose}
      title="Hasil Snapshot Kamera"
      subtitle="Foto tangkapan layar beresolusi penuh dari stream webcam"
      maxWidth="2xl"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Tutup
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleDownload}
            icon={<Download className="w-4 h-4" />}
          >
            Download Gambar (.JPG)
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Image Preview */}
        <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-950 flex items-center justify-center">
          <img
            src={snapshot.dataUrl}
            alt="Snapshot CCTV-KU"
            className="w-full h-auto max-h-[50vh] object-contain"
          />
        </div>

        {/* Snapshot Metadata info */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center gap-2">
            <Camera className="w-4 h-4 text-cyan-500 shrink-0" />
            <div className="min-w-0">
              <span className="text-slate-400 block text-[10px]">SUMBER KAMERA</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
                {snapshot.deviceName}
              </span>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center gap-2">
            <Maximize className="w-4 h-4 text-blue-500 shrink-0" />
            <div className="min-w-0">
              <span className="text-slate-400 block text-[10px]">RESOLUSI TANGKAPAN</span>
              <span className="font-semibold font-mono text-slate-800 dark:text-slate-200 truncate block">
                {snapshot.width} × {snapshot.height} px
              </span>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-500 shrink-0" />
            <div className="min-w-0">
              <span className="text-slate-400 block text-[10px]">WAKTU PENGAMBILAN</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
                {formatLogTime(timestamp)} ({formatFullDate(timestamp)})
              </span>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
