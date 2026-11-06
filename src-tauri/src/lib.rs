pub mod commands;
pub mod db;
pub mod ffmpeg;
pub mod storage;

use std::path::PathBuf;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            // Set window title
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.set_title("CCTV-KU — Smart Local CCTV Monitoring System");
            }

            // Initialize SQLite database in app data directory
            let app_data_dir = app
                .path()
                .app_data_dir()
                .unwrap_or_else(|_| PathBuf::from("C:\\CCTV-KU"));

            let db_dir = app_data_dir.join("database");
            let _ = std::fs::create_dir_all(&db_dir);
            let db_path = db_dir.join("cctvku.db");

            commands::init_db_with_path(&db_path);

            // Reconcile database with filesystem on startup (Section F)
            let storage_dir = app_data_dir.clone();
            std::thread::spawn(move || {
                let _ = std::fs::create_dir_all(&storage_dir);
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::check_ffmpeg,
            commands::check_ffmpeg_status,
            commands::detect_dshow_cameras,
            commands::start_recording,
            commands::stop_recording,
            commands::get_recording_status,
            commands::get_recordings,
            commands::delete_recording,
            commands::lock_recording,
            commands::unlock_recording,
            commands::toggle_lock_recording,
            commands::get_storage_stats,
            commands::get_storage_metrics,
            commands::run_cleanup,
            commands::run_cleanup_now,
            commands::open_recording_folder
        ])
        .build(tauri::generate_context!())
        .expect("error while running CCTV-KU tauri application")
        .run(|_app_handle, event| {
            if let tauri::RunEvent::ExitRequested { .. } = event {
                // Ensure FFmpeg process is cleanly terminated on app exit
                let _ = ffmpeg::FFmpegManager::stop_recording();
            }
        });
}
