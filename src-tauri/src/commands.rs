use crate::db::{CleanupReport, DatabaseManager, RecordingRecord, StorageStats};
use crate::ffmpeg::{FFmpegInfo, FFmpegManager, LiveRecordingStatus, RecordingConfig};
use crate::storage::StorageManager;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tauri::{AppHandle, Manager};

static DB_INSTANCE: Mutex<Option<DatabaseManager>> = Mutex::new(None);

pub fn init_db_with_path(path: &Path) {
    if let Ok(db) = DatabaseManager::new(path) {
        let mut guard = DB_INSTANCE.lock().unwrap();
        *guard = Some(db);
    }
}

pub fn get_default_storage_dir(app: &AppHandle) -> PathBuf {
    app.path()
        .app_data_dir()
        .unwrap_or_else(|_| PathBuf::from("C:\\CCTV-KU"))
}

// --- Section B: Commands with exact requested names and aliases ---

#[tauri::command]
pub fn check_ffmpeg() -> FFmpegInfo {
    FFmpegManager::get_info()
}

#[tauri::command]
pub fn check_ffmpeg_status() -> FFmpegInfo {
    FFmpegManager::get_info()
}

#[tauri::command]
pub fn detect_dshow_cameras() -> Vec<String> {
    FFmpegManager::list_dshow_devices()
}

#[tauri::command]
pub fn start_recording(app: AppHandle, mut config: RecordingConfig) -> Result<String, String> {
    let base_dir = if !config.output_dir.is_empty() {
        PathBuf::from(&config.output_dir)
    } else {
        get_default_storage_dir(&app)
    };

    // Form organized storage directory: {base_dir}/{camera_name}/{year}/{month}/{day}/
    let organized = StorageManager::get_organized_recording_dir(&base_dir, &config.camera_name);
    config.output_dir = organized.to_string_lossy().to_string();

    FFmpegManager::start_recording(config)
}

#[tauri::command]
pub fn stop_recording() -> Result<String, String> {
    FFmpegManager::stop_recording()
}

#[tauri::command]
pub fn get_recording_status() -> LiveRecordingStatus {
    FFmpegManager::get_status()
}

#[tauri::command]
pub fn get_recordings(
    camera_id: Option<String>,
    date_filter: Option<String>,
    search_query: Option<String>,
    codec_filter: Option<String>,
    sort_order: Option<String>,
) -> Result<Vec<RecordingRecord>, String> {
    let guard = DB_INSTANCE.lock().unwrap();
    if let Some(ref db) = *guard {
        db.get_recordings(camera_id, date_filter, search_query, codec_filter, sort_order)
            .map_err(|e| e.to_string())
    } else {
        Err("Database belum diinisialisasi".into())
    }
}

#[tauri::command]
pub fn delete_recording(id: String) -> Result<bool, String> {
    let guard = DB_INSTANCE.lock().unwrap();
    if let Some(ref db) = *guard {
        match db.delete_recording(&id) {
            Ok(Some(path_str)) => {
                let p = Path::new(&path_str);
                if p.exists() {
                    let _ = std::fs::remove_file(p);
                }
                Ok(true)
            }
            Ok(None) => Ok(false),
            Err(e) => Err(e.to_string()),
        }
    } else {
        Err("Database belum diinisialisasi".into())
    }
}

#[tauri::command]
pub fn lock_recording(id: String) -> Result<bool, String> {
    let guard = DB_INSTANCE.lock().unwrap();
    if let Some(ref db) = *guard {
        db.set_lock(&id, true).map_err(|e| e.to_string())
    } else {
        Err("Database belum diinisialisasi".into())
    }
}

#[tauri::command]
pub fn unlock_recording(id: String) -> Result<bool, String> {
    let guard = DB_INSTANCE.lock().unwrap();
    if let Some(ref db) = *guard {
        db.set_lock(&id, false).map_err(|e| e.to_string())
    } else {
        Err("Database belum diinisialisasi".into())
    }
}

#[tauri::command]
pub fn toggle_lock_recording(id: String) -> Result<bool, String> {
    let guard = DB_INSTANCE.lock().unwrap();
    if let Some(ref db) = *guard {
        db.toggle_lock(&id).map_err(|e| e.to_string())
    } else {
        Err("Database belum diinisialisasi".into())
    }
}

#[tauri::command]
pub fn get_storage_stats(app: AppHandle, custom_path: Option<String>) -> Result<StorageStats, String> {
    get_storage_metrics(app, custom_path)
}

#[tauri::command]
pub fn get_storage_metrics(app: AppHandle, custom_path: Option<String>) -> Result<StorageStats, String> {
    let base_path = if let Some(ref p) = custom_path {
        if !p.trim().is_empty() {
            PathBuf::from(p)
        } else {
            get_default_storage_dir(&app)
        }
    } else {
        get_default_storage_dir(&app)
    };

    let (total_disk, used_disk, avail_disk) = StorageManager::get_disk_capacity(&base_path);

    let guard = DB_INSTANCE.lock().unwrap();
    let (cctv_bytes, total_count, today_count) = if let Some(ref db) = *guard {
        // Reconcile filesystem files to ensure accurate stats
        let _ = db.reconcile_with_filesystem(&base_path);
        db.get_cctv_stats().unwrap_or((0, 0, 0))
    } else {
        (0, 0, 0)
    };

    Ok(StorageStats {
        total_disk_bytes: total_disk,
        used_disk_bytes: used_disk,
        available_disk_bytes: avail_disk,
        cctv_recordings_bytes: cctv_bytes,
        total_recordings_count: total_count,
        today_recordings_count: today_count,
        storage_path: base_path.to_string_lossy().to_string(),
        max_quota_gb: 100.0,
    })
}

/// Section I: Native Windows File Explorer folder opening
#[tauri::command]
pub fn open_recording_folder(app: AppHandle, path: Option<String>) -> Result<String, String> {
    let target = if let Some(p) = path {
        let trimmed = p.trim();
        if !trimmed.is_empty() {
            PathBuf::from(trimmed)
        } else {
            get_default_storage_dir(&app)
        }
    } else {
        get_default_storage_dir(&app)
    };

    if !target.exists() {
        if let Err(e) = std::fs::create_dir_all(&target) {
            return Err(format!("Gagal membuat direktori '{}': {}", target.display(), e));
        }
    }

    #[cfg(target_os = "windows")]
    {
        // Safe argument array, preventing shell string injection
        match std::process::Command::new("explorer.exe").arg(&target).spawn() {
            Ok(_) => Ok(format!("Folder '{}' berhasil dibuka di Windows Explorer.", target.display())),
            Err(e) => Err(format!("Gagal membuka Windows Explorer: {}", e)),
        }
    }
    #[cfg(target_os = "linux")]
    {
        match std::process::Command::new("xdg-open").arg(&target).spawn() {
            Ok(_) => Ok(format!("Folder '{}' dibuka.", target.display())),
            Err(e) => Err(format!("Gagal membuka file manager: {}", e)),
        }
    }
    #[cfg(target_os = "macos")]
    {
        match std::process::Command::new("open").arg(&target).spawn() {
            Ok(_) => Ok(format!("Folder '{}' dibuka.", target.display())),
            Err(e) => Err(format!("Gagal membuka Finder: {}", e)),
        }
    }
    #[cfg(not(any(target_os = "windows", target_os = "linux", target_os = "macos")))]
    {
        Ok(format!("Folder penyimpanan: {}", target.display()))
    }
}

/// Section J: Native safe auto-cleanup command
#[tauri::command]
pub fn run_cleanup_now(
    app: AppHandle,
    retention_days: i64,
    max_quota_gb: Option<f64>,
    storage_path: Option<String>,
    is_enabled: Option<bool>,
) -> Result<CleanupReport, String> {
    let base_path = if let Some(ref p) = storage_path {
        if !p.trim().is_empty() {
            PathBuf::from(p)
        } else {
            get_default_storage_dir(&app)
        }
    } else {
        get_default_storage_dir(&app)
    };

    let guard = DB_INSTANCE.lock().unwrap();
    if let Some(ref db) = *guard {
        StorageManager::execute_cleanup(
            db,
            &base_path,
            retention_days,
            max_quota_gb,
            is_enabled.unwrap_or(true),
        )
    } else {
        Err("Database belum diinisialisasi".into())
    }
}

#[tauri::command]
pub fn run_cleanup(
    app: AppHandle,
    days: i64,
    storage_path: Option<String>,
) -> Result<CleanupReport, String> {
    run_cleanup_now(app, days, None, storage_path, Some(true))
}
