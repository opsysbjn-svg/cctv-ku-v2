# CCTV-KU — Smart Local CCTV Monitoring System
## Implementasi Tahap 2: FFmpeg Recording Engine, Video Compression & Local Storage

CCTV-KU adalah aplikasi monitoring CCTV desktop profesional, mandiri (*local-first*), dan hemat sumber daya untuk **Windows 10 dan Windows 11**. Dibangun menggunakan arsitektur **Tauri 2 (Rust Core)**, **React 19 (TypeScript + Vite + Tailwind CSS v4)**, **FFmpeg (DirectShow Capture Engine)**, dan basis data metadata **SQLite 3**.

---

## 1. PEMBARUAN UTAMA TAHAP 2

1. **Mesin Perekam FFmpeg & DirectShow Capture**:
   - Menangkap video webcam secara langsung menggunakan driver native Windows DirectShow: `-f dshow -i video="Nama Webcam"`.
   - Menggunakan array argumen aman (tanpa concatenasi shell string).
   - Penghentian proses perekaman secara santun (*graceful stop*) via stdin `q` sebelum sinyal pemutusan paksa untuk mencegah file video rusak (*corrupt*).
   - Pencegahan proses FFmpeg ganda dan pembersihan otomatis saat aplikasi ditutup.

2. **Sistem Kompresi Video Dual-Codec (H.264 & H.265)**:
   - Dukungan encoder perangkat lunak: `libx264` (H.264) dan `libx265` (H.265/HEVC).
   - Dukungan akselerasi perangkat keras GPU: NVIDIA NVENC (`h264_nvenc` / `hevc_nvenc`), Intel Quick Sync (`h264_qsv` / `hevc_qsv`), dan AMD AMF (`h264_amf`).
   - Empat profil kompresi:
     - **Hemat Ruang**: H.264 CRF 28 / H.265 CRF 32
     - **Seimbang (Rekomendasi)**: H.264 CRF 23 / H.265 CRF 28
     - **Kualitas Tinggi**: H.264 CRF 18 / H.265 CRF 24
     - **Kustom**: Bebas mengatur nilai CRF (18 - 35) dan preset encoder.

3. **Segmentasi Video Otomatis**:
   - Memecah video secara otomatis menggunakan FFmpeg segment muxer (`-f segment -segment_time <detik> -reset_timestamps 1 -strftime 1`).
   - Pilihan interval: 1 Menit (Mode Uji), 5 Menit, 10 Menit, 15 Menit, 30 Menit.
   - Format MP4 dengan `-movflags +faststart` agar file dapat langsung diputar tanpa harus menunggu sesi perekaman selesai.

4. **Hierarki Penyimpanan Lokal Dinamis**:
   ```text
   CCTV-KU/
   ├── recordings/
   │   └── YYYY/
   │       └── MM/
   │           └── DD/
   │               └── Nama_Webcam/
   │                   ├── CCTV_20261105_100000_001.mp4
   │                   └── CCTV_20261105_100500_002.mp4
   ├── database/
   │   └── cctvku.db       # Basis data SQLite metadata rekaman
   └── snapshots/          # Arsip tangkapan layar beresolusi penuh
   ```

5. **Basis Data SQLite (`cctvku.db`)**:
   - Tabel `recordings` dengan indeks pencarian:
     - `id`, `camera_id`, `camera_name`, `file_name`, `file_path`, `codec`, `resolution`, `fps`, `bitrate`, `duration`, `file_size`, `start_time`, `end_time`, `recording_status`, `is_locked`, `created_at`.
   - File fisik video tersimpan di folder disk, bukan dalam basis data.

6. **Playback & Recording History Lengkap**:
   - Pemutar video in-app responsif dengan bilah penggeser waktu (*timeline scrubber*), kontrol putar/jeda, pengatur volume, dan detail metadata lengkap.
   - Tabel riwayat dengan filter kamera, filter codec, pencarian nama file, dan penguncian rekaman (*Lock/Unlock*).
   - Tombol ekspor dan unduh video ke komputer.

7. **Storage Manager & Kebijakan Retensi Otomatis (Auto-Cleanup)**:
   - Pemantauan kapasitas hard disk nyata: Total Kapasitas, Kapasitas Terpakai, Kapasitas Bebas, dan Ukuran Khusus Rekaman CCTV.
   - Batas retensi: 3, 7, 14, 30, 60, 90 hari, atau Tidak Pernah Menghapus Otomatis.
   - Proteksi berkas: File dengan status terkunci (🔒) tidak akan pernah dihapus oleh proses auto-cleanup.

---

## 2. PANDUAN SIDECAR FFMPEG UNTUK TAURI 2 (WINDOWS)

Pada arsitektur Tauri 2 desktop, FFmpeg dikonfigurasi sebagai *bundled sidecar external binary*:

1. **Unduh Biner FFmpeg Windows**:
   - Unduh rilis build statis FFmpeg 64-bit (misalnya dari [gyan.dev/ffmpeg/builds](https://www.gyan.dev/ffmpeg/builds/) versi release-essentials).
2. **Penempatan Biner Sidecar**:
   - Buat folder `src-tauri/binaries/` jika belum ada.
   - Salin file `ffmpeg.exe` ke lokasi:
     ```text
     src-tauri/binaries/ffmpeg-x86_64-pc-windows-msvc.exe
     ```
   *(Penamaan dengan akhiran triple target `x86_64-pc-windows-msvc` adalah aturan resmi Tauri 2 agar sidecar dapat dibundel secara otomatis ke dalam installer).*
3. **Deteksi Otomatis**:
   - Jika file sidecar belum ditempatkan, CCTV-KU secara cerdas akan mendeteksi `ffmpeg` yang terpasang di *system environment PATH* Windows.
   - Pada mode browser preview AI Studio, aplikasi secara otomatis menggunakan mesin Web MediaRecorder cerdas untuk mensimulasikan pemecahan segmen file dan database SQLite secara real-time.

---

## 3. CARA MENJALANKAN (DEVELOPMENT MODE)

### A. Menjalankan Preview Web / AI Studio
```bash
npm run dev
```
Buka browser pada: `http://localhost:3000`

### B. Menjalankan Aplikasi Desktop Windows Native (Tauri 2)
```bash
# Menjalankan core desktop Windows dengan backend Rust, DirectShow, & SQLite
npm run tauri:dev
```

---

## 4. CARA MEMBANGUN INSTALLER WINDOWS STANDALONE

Untuk membuat file installer `.msi` dan `.exe` (NSIS) untuk distribusi:

```bash
npm run tauri:build
```

Hasil paket installer akan tersedia di:
```text
src-tauri/target/release/bundle/msi/CCTV-KU_1.0.0_x64_en-US.msi
src-tauri/target/release/bundle/nsis/CCTV-KU_1.0.0_x64-setup.exe
```

---

## 5. CARA PENGUJIAN FITUR TAHAP 2

1. **Pengujian Perekaman Webcam**:
   - Buka menu **Live Monitoring** atau **Dashboard**.
   - Klik **Mulai Preview** untuk menyalakan sensor webcam.
   - Klik tombol merah **Mulai Merekam** pada panel kontrol perekaman.
   - Perhatikan indikator `REC`, durasi waktu nyata `HH:MM:SS`, dan pertumbuhan ukuran file `KB / MB`.
2. **Pengujian Segmentasi**:
   - Di menu **Settings > Recording & Kompresi**, atur *Durasi Pemecahan Segmen File* ke `1 Menit (Mode Pengujian)`.
   - Jalankan rekaman selama 2 menit.
   - Buka menu **Playback**: akan muncul 2 segmen file `CCTV_YYYYMMDD_HHMMSS_001.mp4` dan `_002.mp4` yang terpisah dan dapat diputar secara independen.
3. **Pengujian Pemutaran (Playback)**:
   - Di menu **Playback**, klik nama file atau ikon tombol *Play* pada salah satu rekaman.
   - Gunakan bilah penggeser waktu (*timeline scrubber*) untuk melompat ke detik tertentu.
4. **Pengujian Proteksi Kunci & Hapus**:
   - Klik ikon gembok pada rekaman untuk menguncinya (🔒). Coba tekan tombol hapus; sistem akan menolak menghapus file yang dilindungi.
   - Buka kunci (🔓), lalu tekan tombol hapus untuk menghapus rekaman dan membersihkan indeksnya dari SQLite.
5. **Pengujian Storage Manager & Auto Cleanup**:
   - Buka menu **Storage Manager** untuk memeriksa grafik alokasi kapasitas hard disk.
   - Klik tombol **Jalankan Pembersihan Sekarang** untuk menguji pembersihan file yang lebih tua dari batas retensi.
