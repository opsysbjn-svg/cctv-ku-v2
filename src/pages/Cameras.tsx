import React, { useState } from 'react';
import { CameraDevice, CameraErrorState, CameraStatus, CameraStreamMetrics } from '../types/camera';
import { Camera, RefreshCw, Plus, Video, CheckCircle2, AlertCircle, Info, ExternalLink } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { CameraPreview } from '../components/camera/CameraPreview';

interface CamerasProps {
  devices: CameraDevice[];
  selectedDeviceId: string;
  onSelectDevice: (id: string) => void;
  status: CameraStatus;
  stream: MediaStream | null;
  error: CameraErrorState | null;
  metrics: CameraStreamMetrics | null;
  onStart: () => void;
  onStop: () => void;
  onRefreshDevices: () => void;
  onVideoElementReady?: (video: HTMLVideoElement) => void;
  isDetecting?: boolean;
}

export const Cameras: React.FC<CamerasProps> = ({
  devices,
  selectedDeviceId,
  onSelectDevice,
  status,
  stream,
  error,
  metrics,
  onStart,
  onStop,
  onRefreshDevices,
  onVideoElementReady,
  isDetecting,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const isStreaming = status === 'streaming';
  const selectedDevice = devices.find((d) => d.deviceId === selectedDeviceId);

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Manajemen Perangkat Kamera
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Mendeteksi sensor webcam lokal dan kamera USB yang terhubung ke PC
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={onRefreshDevices}
            disabled={isDetecting}
            icon={<RefreshCw className={`w-3.5 h-3.5 ${isDetecting ? 'animate-spin' : ''}`} />}
          >
            Refresh Perangkat
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowAddModal(true)}
            icon={<Plus className="w-3.5 h-3.5" />}
          >
            Tambah Kamera IP / RTSP
          </Button>
        </div>
      </div>

      {/* Main Grid: Device List Table & Active Test Monitor */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Device Table (2 cols) */}
        <div className="lg:col-span-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Sensor Video Terdeteksi ({devices.length})
            </h3>
            <span className="text-xs text-slate-400">MediaDevices API</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3 font-semibold">Nama Perangkat</th>
                  <th className="px-4 py-3 font-semibold">Tipe Sensor</th>
                  <th className="px-4 py-3 font-semibold font-mono">Device ID</th>
                  <th className="px-4 py-3 font-semibold text-center">Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-800 dark:text-slate-200">
                {devices.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400">
                      Tidak ada webcam yang terdeteksi. Hubungkan kamera USB lalu klik "Refresh Perangkat".
                    </td>
                  </tr>
                ) : (
                  devices.map((device, index) => {
                    const isSelected = device.deviceId === selectedDeviceId;
                    const isCurrentlyActive = isSelected && isStreaming;

                    return (
                      <tr
                        key={device.deviceId || index}
                        className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors ${
                          isSelected ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''
                        }`}
                      >
                        <td className="px-4 py-3 font-medium">
                          <div className="flex items-center gap-2">
                            <Camera className="w-4 h-4 text-cyan-500 shrink-0" />
                            <span className="truncate max-w-[220px]">{device.label}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                          USB / Built-in
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] text-slate-400">
                          {device.deviceId ? device.deviceId.slice(0, 14) + '...' : 'Default'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isCurrentlyActive ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-500 font-semibold">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Streaming
                            </span>
                          ) : isSelected ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-cyan-500 font-medium">
                              Dipilih
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400">Standby</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant={isSelected ? 'secondary' : 'ghost'}
                            size="sm"
                            onClick={() => onSelectDevice(device.deviceId)}
                          >
                            {isSelected ? 'Terpilih' : 'Pilih'}
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live Test Monitor (1 col) */}
        <div className="space-y-3">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">
              Uji Coba Sensor
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              Periksa kualitas feed video dari {selectedDevice?.label || 'Kamera terpilih'}
            </p>

            <CameraPreview
              stream={stream}
              status={status}
              error={error}
              metrics={metrics}
              selectedDeviceName={selectedDevice?.label}
              onStart={onStart}
              onRefreshDevices={onRefreshDevices}
              onVideoElementReady={onVideoElementReady}
              aspectRatio="4/3"
            />

            <div className="mt-3 flex items-center justify-between">
              {!isStreaming ? (
                <Button variant="primary" size="sm" onClick={onStart} disabled={devices.length === 0}>
                  Mulai Uji Coba
                </Button>
              ) : (
                <Button variant="danger" size="sm" onClick={onStop}>
                  Hentikan Uji Coba
                </Button>
              )}
              <span className="text-[11px] text-slate-400 font-mono">
                {metrics?.width ? `${metrics.width}×${metrics.height}` : 'Idle'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Tambah Kamera IP / RTSP (Tahap 2 Information) */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Dukungan Kamera IP & RTSP"
        subtitle="Rencana Integrasi Protokol Jaringan (Tahap 2)"
        footer={
          <Button variant="primary" size="sm" onClick={() => setShowAddModal(false)}>
            Mengerti
          </Button>
        }
      >
        <div className="space-y-4 text-xs text-slate-600 dark:text-slate-300">
          <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-blue-800 dark:text-blue-300">
            <strong>Informasi Tahap 1:</strong> Pada tahap fondasi ini, CCTV-KU fokus pada
            kestabilan akses webcam lokal dan USB melalui browser MediaDevices API standar.
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold text-slate-900 dark:text-slate-100">
              Fitur yang akan hadir pada Tahap 2:
            </h4>
            <ul className="list-disc pl-5 space-y-1 text-slate-500 dark:text-slate-400">
              <li>Penerimaan URL stream RTSP (contoh: <code>rtsp://admin:pass@192.168.1.50:554/live</code>)</li>
              <li>ONVIF Device Discovery otomatis pada jaringan lokal WiFi/LAN</li>
              <li>Transcoding hardware-accelerated melalui FFmpeg engine native</li>
              <li>Penyimpanan multi-stream ke SQLite database lokal</li>
            </ul>
          </div>
        </div>
      </Modal>
    </div>
  );
};
