use chrono::Local;
use serde::{Deserialize, Serialize};
use std::io::{BufRead, BufReader, Write};
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::{Arc, Mutex};
use std::time::Instant;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct FFmpegInfo {
    pub is_available: bool,
    pub version: String,
    pub binary_path: String,
    pub has_libx264: bool,
    pub has_libx265: bool,
    pub has_nvenc: bool,
    pub has_qsv: bool,
    pub has_amf: bool,
    pub available_encoders: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct RecordingConfig {
    pub camera_id: String,
    pub camera_name: String,
    pub resolution: String,     // e.g. "1280x720" or "auto"
    pub fps: i32,               // e.g. 30
    pub codec: String,          // "h264" or "h265"
    pub profile: String,        // "space_saver", "balanced", "high_quality", "custom"
    pub custom_crf: Option<i32>,
    #[serde(alias = "segment_seconds")]
    pub segment_duration: i32,   // e.g. 300 for 5 min
    pub output_dir: String,
    pub hw_accel: String,       // "auto", "cpu", "nvenc", "qsv", "amf"
    pub record_audio: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct LiveRecordingStatus {
    pub status: String,          // "idle", "recording", "stopping", "error"
    pub camera_name: String,
    pub elapsed_seconds: u64,
    pub current_file_size_bytes: u64,
    pub active_codec: String,
    pub active_encoder: String,
    pub current_output_dir: String,
    pub segment_count: usize,
    pub error_message: Option<String>,
}

pub struct ActiveSession {
    pub child: Child,
    pub start_instant: Instant,
    pub config: RecordingConfig,
    pub active_encoder_name: String,
    pub session_prefix: String,
    pub manifest_path: PathBuf,
    pub active_output_dir: PathBuf,
}

static ACTIVE_SESSION: Mutex<Option<ActiveSession>> = Mutex::new(None);

pub struct FFmpegManager;

impl FFmpegManager {
    /// Locate FFmpeg executable in Windows sidecar binaries, app data dir, local dir, or system PATH
    pub fn find_ffmpeg() -> Option<PathBuf> {
        // 1. Check next to running application binary
        if let Ok(exe_path) = std::env::current_exe() {
            if let Some(parent) = exe_path.parent() {
                let candidates = [
                    parent.join("ffmpeg.exe"),
                    parent.join("binaries").join("ffmpeg.exe"),
                    parent.join("ffmpeg-x86_64-pc-windows-msvc.exe"),
                    parent.join("binaries").join("ffmpeg-x86_64-pc-windows-msvc.exe"),
                ];
                for cand in candidates {
                    if cand.is_file() {
                        return Some(cand);
                    }
                }
            }
        }

        // 2. Check dedicated CCTV-KU app data / install binaries directory
        let standard_paths = [
            PathBuf::from("C:\\CCTV-KU\\binaries\\ffmpeg.exe"),
            PathBuf::from("C:\\CCTV-KU\\ffmpeg.exe"),
            PathBuf::from("src-tauri\\binaries\\ffmpeg-x86_64-pc-windows-msvc.exe"),
            PathBuf::from("src-tauri\\binaries\\ffmpeg.exe"),
            PathBuf::from("binaries\\ffmpeg.exe"),
        ];
        for sp in standard_paths {
            if sp.is_file() {
                return Some(sp);
            }
        }

        // 3. Check system PATH
        if let Ok(output) = Command::new("ffmpeg").arg("-version").output() {
            if output.status.success() {
                return Some(PathBuf::from("ffmpeg"));
            }
        }

        None
    }

    /// Check FFmpeg version and verify actual available encoders
    pub fn get_info() -> FFmpegInfo {
        let binary_path = Self::find_ffmpeg();
        if binary_path.is_none() {
            return FFmpegInfo {
                is_available: false,
                version: "Binary FFmpeg tidak ditemukan".to_string(),
                binary_path: "".to_string(),
                has_libx264: false,
                has_libx265: false,
                has_nvenc: false,
                has_qsv: false,
                has_amf: false,
                available_encoders: Vec::new(),
            };
        }

        let bin = binary_path.unwrap();
        let bin_str = bin.to_string_lossy().to_string();

        let version = Command::new(&bin)
            .arg("-version")
            .output()
            .ok()
            .and_then(|out| String::from_utf8(out.stdout).ok())
            .map(|s| s.lines().next().unwrap_or("").to_string())
            .unwrap_or_else(|| "Unknown version".to_string());

        let encoders_output = Command::new(&bin)
            .arg("-encoders")
            .output()
            .ok()
            .and_then(|out| String::from_utf8(out.stdout).ok())
            .unwrap_or_default();

        let has_libx264 = encoders_output.contains("libx264");
        let has_libx265 = encoders_output.contains("libx265");
        let has_nvenc = encoders_output.contains("h264_nvenc") || encoders_output.contains("hevc_nvenc");
        let has_qsv = encoders_output.contains("h264_qsv") || encoders_output.contains("hevc_qsv");
        let has_amf = encoders_output.contains("h264_amf") || encoders_output.contains("hevc_amf");

        let mut available = Vec::new();
        if has_libx264 { available.push("libx264".into()); }
        if has_libx265 { available.push("libx265".into()); }
        if encoders_output.contains("h264_nvenc") { available.push("h264_nvenc".into()); }
        if encoders_output.contains("hevc_nvenc") { available.push("hevc_nvenc".into()); }
        if encoders_output.contains("h264_qsv") { available.push("h264_qsv".into()); }
        if encoders_output.contains("hevc_qsv") { available.push("hevc_qsv".into()); }
        if encoders_output.contains("h264_amf") { available.push("h264_amf".into()); }
        if encoders_output.contains("hevc_amf") { available.push("hevc_amf".into()); }

        FFmpegInfo {
            is_available: true,
            version,
            binary_path: bin_str,
            has_libx264,
            has_libx265,
            has_nvenc,
            has_qsv,
            has_amf,
            available_encoders: available,
        }
    }

    /// List DirectShow video capture devices on Windows
    pub fn list_dshow_devices() -> Vec<String> {
        let mut devices = Vec::new();
        if let Some(bin) = Self::find_ffmpeg() {
            let output = Command::new(&bin)
                .args(["-list_devices", "true", "-f", "dshow", "-i", "dummy"])
                .output();

            if let Ok(out) = output {
                let stderr = String::from_utf8_lossy(&out.stderr);
                let mut in_video_devices = false;
                for line in stderr.lines() {
                    if line.contains("DirectShow video devices") {
                        in_video_devices = true;
                        continue;
                    }
                    if line.contains("DirectShow audio devices") {
                        in_video_devices = false;
                        continue;
                    }
                    if in_video_devices && line.contains("]  \"") {
                        if let Some(start) = line.find('\"') {
                            if let Some(end) = line[start + 1..].find('\"') {
                                let dev_name = &line[start + 1..start + 1 + end];
                                if !dev_name.starts_with('@') && !devices.contains(&dev_name.to_string()) {
                                    devices.push(dev_name.to_string());
                                }
                            }
                        }
                    }
                }
            }
        }
        devices
    }

    /// List DirectShow audio capture devices (microphones) on Windows
    pub fn list_dshow_audio_devices() -> Vec<String> {
        let mut audio_devices = Vec::new();
        if let Some(bin) = Self::find_ffmpeg() {
            let output = Command::new(&bin)
                .args(["-list_devices", "true", "-f", "dshow", "-i", "dummy"])
                .output();

            if let Ok(out) = output {
                let stderr = String::from_utf8_lossy(&out.stderr);
                let mut in_audio_devices = false;
                for line in stderr.lines() {
                    if line.contains("DirectShow audio devices") {
                        in_audio_devices = true;
                        continue;
                    }
                    if line.contains("DirectShow video devices") {
                        in_audio_devices = false;
                        continue;
                    }
                    if in_audio_devices && line.contains("]  \"") {
                        if let Some(start) = line.find('\"') {
                            if let Some(end) = line[start + 1..].find('\"') {
                                let dev_name = &line[start + 1..start + 1 + end];
                                if !dev_name.starts_with('@') && !audio_devices.contains(&dev_name.to_string()) {
                                    audio_devices.push(dev_name.to_string());
                                }
                            }
                        }
                    }
                }
            }
        }
        audio_devices
    }

    /// Select optimal encoder based on hardware availability and user profile
    pub fn select_encoder(codec: &str, hw_accel: &str, info: &FFmpegInfo) -> (&'static str, i32, &'static str) {
        let is_h265 = codec == "h265";

        if hw_accel == "nvenc" && info.has_nvenc {
            if is_h265 { ("hevc_nvenc", 28, "p4") } else { ("h264_nvenc", 23, "p4") }
        } else if hw_accel == "qsv" && info.has_qsv {
            if is_h265 { ("hevc_qsv", 28, "medium") } else { ("h264_qsv", 23, "medium") }
        } else if hw_accel == "amf" && info.has_amf {
            if is_h265 { ("hevc_amf", 28, "balanced") } else { ("h264_amf", 23, "balanced") }
        } else if is_h265 && info.has_libx265 {
            ("libx265", 28, "fast")
        } else {
            ("libx264", 23, "veryfast")
        }
    }

    /// Start recording process using safe argument array and robust segment pattern
    pub fn start_recording(config: RecordingConfig) -> Result<String, String> {
        let mut session_guard = ACTIVE_SESSION.lock().unwrap();
        if session_guard.is_some() {
            return Err("Proses perekaman sedang berjalan. Hentikan rekaman sebelumnya terlebih dahulu.".into());
        }

        let info = Self::get_info();
        if !info.is_available {
            return Err("Binary FFmpeg tidak ditemukan. Pastikan executable FFmpeg tersedia di direktori binaries/ atau di system PATH.".into());
        }

        let (chosen_encoder, default_crf, chosen_preset) =
            Self::select_encoder(&config.codec, &config.hw_accel, &info);

        // Determine CRF value by profile
        let crf_val = if let Some(custom) = config.custom_crf {
            custom
        } else {
            match config.profile.as_str() {
                "space_saver" => if config.codec == "h265" { 32 } else { 28 },
                "high_quality" => if config.codec == "h265" { 24 } else { 18 },
                _ => default_crf, // "balanced"
            }
        };

        // Create output directory if not exists
        let out_dir = PathBuf::from(&config.output_dir);
        if let Err(e) = std::fs::create_dir_all(&out_dir) {
            return Err(format!("Gagal membuat folder penyimpanan rekaman: {}", e));
        }

        // Section E Fix: Form application-generated date-time prefix to prevent repetitive overwrites
        let session_prefix = Local::now().format("CCTV_%Y%m%d_%H%M%S").to_string();
        let segment_pattern = out_dir.join(format!("{}_%03d.mp4", session_prefix));
        let segment_pattern_str = segment_pattern.to_string_lossy().to_string();

        let manifest_path = out_dir.join(format!("{}_manifest.csv", session_prefix));
        let manifest_path_str = manifest_path.to_string_lossy().to_string();

        let mut args: Vec<String> = Vec::new();

        // 1. DirectShow video capture
        args.push("-f".into());
        args.push("dshow".into());

        if config.resolution != "auto" && !config.resolution.is_empty() {
            args.push("-video_size".into());
            args.push(config.resolution.clone());
        }

        if config.fps > 0 {
            args.push("-framerate".into());
            args.push(config.fps.to_string());
        }

        args.push("-i".into());
        args.push(format!("video={}", config.camera_name));

        // 2. DirectShow audio capture if microphone is available and enabled
        let should_record_audio = config.record_audio.unwrap_or(true);
        let audio_devices = if should_record_audio {
            Self::list_dshow_audio_devices()
        } else {
            Vec::new()
        };

        let has_audio_stream = if let Some(first_audio) = audio_devices.first() {
            args.push("-f".into());
            args.push("dshow".into());
            args.push("-i".into());
            args.push(format!("audio={}", first_audio));
            true
        } else {
            false
        };

        // 3. Video encoding & compression
        args.push("-c:v".into());
        args.push(chosen_encoder.into());

        if chosen_encoder.starts_with("libx") {
            args.push("-crf".into());
            args.push(crf_val.to_string());
            args.push("-preset".into());
            args.push(chosen_preset.into());
        }

        // 4. Audio encoding
        if has_audio_stream {
            args.push("-c:a".into());
            args.push("aac".into());
            args.push("-b:a".into());
            args.push("128k".into());
        }

        // 5. Segment Muxer (Section E: Unique numbered segments, NO strftime)
        let seg_time = if config.segment_duration > 0 { config.segment_duration } else { 300 };
        args.push("-f".into());
        args.push("segment".into());
        args.push("-segment_time".into());
        args.push(seg_time.to_string());
        args.push("-segment_format".into());
        args.push("mp4".into());
        args.push("-reset_timestamps".into());
        args.push("1".into());
        args.push("-segment_format_options".into());
        args.push("movflags=+faststart".into());

        // Segment manifest tracking
        args.push("-segment_list".into());
        args.push(manifest_path_str);
        args.push("-segment_list_type".into());
        args.push("csv".into());

        args.push(segment_pattern_str);

        let bin = PathBuf::from(&info.binary_path);
        let mut cmd = Command::new(&bin);
        cmd.args(&args)
            .stdin(Stdio::piped())
            .stdout(Stdio::null())
            .stderr(Stdio::piped());

        match cmd.spawn() {
            Ok(mut child) => {
                // Section M: Continuously drain stderr in background to prevent pipe buffer lockup
                if let Some(stderr) = child.stderr.take() {
                    std::thread::spawn(move || {
                        let reader = BufReader::new(stderr);
                        for line in reader.lines().map_while(Result::ok) {
                            if line.contains("Error") || line.contains("fail") {
                                eprintln!("[FFmpeg STDERR] {}", line);
                            }
                        }
                    });
                }

                *session_guard = Some(ActiveSession {
                    child,
                    start_instant: Instant::now(),
                    config: config.clone(),
                    active_encoder_name: chosen_encoder.to_string(),
                    session_prefix,
                    manifest_path,
                    active_output_dir: out_dir,
                });

                let audio_info = if has_audio_stream { " [Video + Audio AAC]" } else { " [Hanya Video]" };
                Ok(format!(
                    "Perekaman dimulai untuk {} dengan encoder {} (Segmentasi: {}s){}",
                    config.camera_name, chosen_encoder, seg_time, audio_info
                ))
            }
            Err(e) => Err(format!("Gagal mengeksekusi FFmpeg: {}", e)),
        }
    }

    /// Stop recording process gracefully via stdin 'q'
    pub fn stop_recording() -> Result<String, String> {
        let mut session_guard = ACTIVE_SESSION.lock().unwrap();
        if let Some(mut session) = session_guard.take() {
            // 1. Send graceful quit 'q' to FFmpeg
            if let Some(ref mut stdin) = session.child.stdin {
                let _ = stdin.write_all(b"q\n");
                let _ = stdin.flush();
            }

            // 2. Wait up to 3.5 seconds for FFmpeg to finalize last segment moov atom
            let start = Instant::now();
            let mut exited = false;
            while start.elapsed().as_millis() < 3500 {
                match session.child.try_wait() {
                    Ok(Some(_status)) => {
                        exited = true;
                        break;
                    }
                    Ok(None) => std::thread::sleep(std::time::Duration::from_millis(100)),
                    Err(_) => break,
                }
            }

            // 3. Fallback to kill if hung
            if !exited {
                let _ = session.child.kill();
                let _ = session.child.wait();
            }

            Ok("Perekaman berhasil dihentikan dan segmen video terakhir telah diselesaikan dengan benar.".into())
        } else {
            Ok("Tidak ada sesi perekaman aktif yang sedang berjalan.".into())
        }
    }

    /// Get live status of active recording session
    pub fn get_status() -> LiveRecordingStatus {
        let session_guard = ACTIVE_SESSION.lock().unwrap();
        if let Some(ref session) = *session_guard {
            let elapsed = session.start_instant.elapsed().as_secs();

            // Calculate total bytes & count segments
            let mut total_bytes = 0u64;
            let mut seg_count = 0usize;

            if let Ok(entries) = std::fs::read_dir(&session.active_output_dir) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    let fname = path.file_name().and_then(|n| n.to_str()).unwrap_or("");
                    if fname.starts_with(&session.session_prefix) && fname.ends_with(".mp4") {
                        seg_count += 1;
                        if let Ok(meta) = entry.metadata() {
                            total_bytes += meta.len();
                        }
                    }
                }
            }

            LiveRecordingStatus {
                status: "recording".to_string(),
                camera_name: session.config.camera_name.clone(),
                elapsed_seconds: elapsed,
                current_file_size_bytes: total_bytes,
                active_codec: session.config.codec.clone(),
                active_encoder: session.active_encoder_name.clone(),
                current_output_dir: session.active_output_dir.to_string_lossy().to_string(),
                segment_count: seg_count.max(1),
                error_message: None,
            }
        } else {
            LiveRecordingStatus {
                status: "idle".to_string(),
                camera_name: "".to_string(),
                elapsed_seconds: 0,
                current_file_size_bytes: 0,
                active_codec: "".to_string(),
                active_encoder: "".to_string(),
                current_output_dir: "".to_string(),
                segment_count: 0,
                error_message: None,
            }
        }
    }

    /// Check if a particular file is currently being written by the active recording session
    pub fn is_file_actively_recording(file_path: &Path) -> bool {
        let session_guard = ACTIVE_SESSION.lock().unwrap();
        if let Some(ref session) = *session_guard {
            if let Some(parent) = file_path.parent() {
                if parent == session.active_output_dir {
                    if let Some(name) = file_path.file_name().and_then(|n| n.to_str()) {
                        return name.starts_with(&session.session_prefix);
                    }
                }
            }
        }
        false
    }
}
