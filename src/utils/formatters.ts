export function formatDigitalTime(date: Date): { time: string; seconds: string; period?: string } {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return {
    time: `${hours}:${minutes}`,
    seconds: seconds,
  };
}

export function formatFullDate(date: Date): string {
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function formatLogTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(d);
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const idx = Math.min(i, sizes.length - 1);
  return `${parseFloat((bytes / Math.pow(k, idx)).toFixed(dm))} ${sizes[idx]}`;
}

export function formatDuration(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export const RESOLUTION_PRESETS = [
  { id: 'auto', label: 'Auto (Ideal)', description: 'Resolusi default kamera terbaik' },
  { id: '480p', label: '640 × 480', width: 640, height: 480, description: 'SD (Standar 4:3)' },
  { id: '720p', label: '1280 × 720', width: 1280, height: 720, description: 'HD (High Definition)' },
  { id: '1080p', label: '1920 × 1080', width: 1920, height: 1080, description: 'FHD (Full High Definition)' },
] as const;

export const FPS_PRESETS: number[] = [10, 15, 24, 30];

export const SEGMENT_PRESETS = [
  { seconds: 60, label: '1 Menit (Mode Pengujian)' },
  { seconds: 300, label: '5 Menit (Rekomendasi)' },
  { seconds: 600, label: '10 Menit' },
  { seconds: 900, label: '15 Menit' },
  { seconds: 1800, label: '30 Menit' },
] as const;

export const RETENTION_PRESETS = [
  { days: 3, label: '3 Hari' },
  { days: 7, label: '7 Hari (1 Minggu)' },
  { days: 14, label: '14 Hari (2 Minggu)' },
  { days: 30, label: '30 Hari (1 Bulan)' },
  { days: 60, label: '60 Hari (2 Bulan)' },
  { days: 90, label: '90 Hari (3 Bulan)' },
  { days: 0, label: 'Tidak Pernah Menghapus Otomatis' },
] as const;

export const COMPRESSION_PROFILES = [
  {
    id: 'space_saver',
    name: 'Hemat Ruang',
    description: 'Ukuran file paling efisien (H.264: CRF 28 / H.265: CRF 32)',
    h264Crf: 28,
    h265Crf: 32,
  },
  {
    id: 'balanced',
    name: 'Seimbang (Rekomendasi)',
    description: 'Keseimbangan ideal antara kualitas visual dan ukuran disk (H.264: CRF 23 / H.265: CRF 28)',
    h264Crf: 23,
    h265Crf: 28,
  },
  {
    id: 'high_quality',
    name: 'Kualitas Tinggi',
    description: 'Detail visual tajam dengan bitrate lebih tinggi (H.264: CRF 18 / H.265: CRF 24)',
    h264Crf: 18,
    h265Crf: 24,
  },
  {
    id: 'custom',
    name: 'Kustom',
    description: 'Pengaturan CRF dan preset manual sesuai preferensi teknis',
    h264Crf: 23,
    h265Crf: 28,
  },
] as const;
