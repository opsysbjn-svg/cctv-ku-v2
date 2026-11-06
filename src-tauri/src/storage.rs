use crate::db::{CleanupReport, DatabaseManager};
use crate::ffmpeg::FFmpegManager;
use chrono::{Duration, Local};
use std::path::{Path, PathBuf};
use sysinfo::Disks;

pub struct StorageManager;

impl StorageManager {
    /// Section H Requirement:
    /// Folder structure:
    /// {base_path}/{sanitized_camera_name}/{year}/{month}/{day}/
    pub fn get_organized_recording_dir<P: AsRef<Path>>(base_path: P, camera_name: &str) -> PathBuf {
        let now = Local::now();
        let year = now.format("%Y").to_string();
        let month = now.format("%m").to_string();
        let day = now.format("%d").to_string();

        let sanitized_camera: String = camera_name
            .chars()
            .map(|c| if c.is_alphanumeric() || c == '_' || c == '-' { c } else { '_' })
            .collect();

        base_path
            .as_ref()
            .join(sanitized_camera)
            .join(year)
            .join(month)
            .join(day)
    }

    /// Retrieve disk capacity statistics for the drive where the storage path is located
    pub fn get_disk_capacity<P: AsRef<Path>>(target_path: P) -> (u64, u64, u64) {
        let disks = Disks::new_with_refreshed_list();
        let target = target_path.as_ref();

        for disk in &disks {
            let mount_point = disk.mount_point();
            if target.starts_with(mount_point) {
                let total = disk.total_space();
                let available = disk.available_space();
                let used = total.saturating_sub(available);
                return (total, used, available);
            }
        }

        // Fallback to first available disk or 500GB reasonable defaults
        if let Some(first) = disks.first() {
            let total = first.total_space();
            let available = first.available_space();
            let used = total.saturating_sub(available);
            (total, used, available)
        } else {
            (500 * 1024 * 1024 * 1024, 250 * 1024 * 1024 * 1024, 250 * 1024 * 1024 * 1024)
        }
    }

    /// Section J & K: Safe FIFO Auto-Cleanup Engine
    pub fn execute_cleanup(
        db: &DatabaseManager,
        storage_root: &Path,
        retention_days: i64,
        max_quota_gb: Option<f64>,
        is_enabled: bool,
    ) -> Result<CleanupReport, String> {
        let executed_at = Local::now().to_rfc3339();

        if !is_enabled || retention_days <= 0 {
            return Ok(CleanupReport {
                checked_count: 0,
                deleted_count: 0,
                freed_bytes: 0,
                skipped_locked_count: 0,
                skipped_recording_count: 0,
                failed_count: 0,
                executed_at,
                status: "empty".into(),
                message: "Auto-cleanup sedang dinonaktifkan atau kebijakan retensi diatur ke 'Tidak Pernah Menghapus'.".into(),
            });
        }

        let canonical_root = storage_root
            .canonicalize()
            .unwrap_or_else(|_| storage_root.to_path_buf());

        // Fetch all recordings sorted oldest first for FIFO deletion
        let all_records = db
            .get_recordings(None, None, None, None, Some("asc".into()))
            .map_err(|e| format!("Gagal membaca data rekaman dari database: {}", e))?;

        let now = Local::now();
        let cutoff_date = now - Duration::days(retention_days);

        let mut checked_count = 0usize;
        let mut deleted_count = 0usize;
        let mut freed_bytes = 0u64;
        let mut skipped_locked_count = 0usize;
        let mut skipped_recording_count = 0usize;
        let mut failed_count = 0usize;

        for record in all_records {
            checked_count += 1;

            // 1. Never delete locked files
            if record.is_locked {
                skipped_locked_count += 1;
                continue;
            }

            // 2. Never delete active recording files
            let file_path = PathBuf::from(&record.file_path);
            if record.recording_status == "recording" || FFmpegManager::is_file_actively_recording(&file_path) {
                skipped_recording_count += 1;
                continue;
            }

            // 3. Determine if file meets cleanup policy
            let is_older_than_retention = if let Ok(created_dt) = chrono::DateTime::parse_from_rfc3339(&record.start_time) {
                created_dt.with_timezone(&Local) < cutoff_date
            } else {
                false
            };

            // If not older than retention, skip
            if !is_older_than_retention {
                continue;
            }

            // 4. Canonical path traversal prevention: ensure target is strictly inside CCTV-KU folder
            if let Ok(canon_file) = file_path.canonicalize() {
                if !canon_file.starts_with(&canonical_root) {
                    eprintln!("[Security] File {} berada di luar folder CCTV-KU, dilewati.", canon_file.display());
                    continue;
                }
            }

            // 5. Delete physical file first
            let file_size = if file_path.exists() {
                file_path.metadata().map(|m| m.len()).unwrap_or(record.file_size as u64)
            } else {
                record.file_size as u64
            };

            let physical_removed = if file_path.exists() {
                match std::fs::remove_file(&file_path) {
                    Ok(_) => true,
                    Err(e) => {
                        eprintln!("[Cleanup] Gagal menghapus file fisik {}: {}", file_path.display(), e);
                        failed_count += 1;
                        false
                    }
                }
            } else {
                // File was already removed from disk
                true
            };

            // 6. Delete metadata only after physical removal succeeds or confirmed not on disk
            if physical_removed {
                if let Ok(_) = db.delete_recording(&record.id) {
                    deleted_count += 1;
                    freed_bytes += file_size;
                }
            }
        }

        let status = if deleted_count > 0 {
            "success"
        } else if failed_count > 0 {
            "failed"
        } else {
            "empty"
        };

        let message = if deleted_count > 0 {
            format!(
                "Pembersihan selesai: {} file rekaman berhasil dihapus ({:.2} MB ruang disk dibebaskan).",
                deleted_count,
                freed_bytes as f64 / (1024.0 * 1024.0)
            )
        } else if skipped_locked_count > 0 && checked_count == skipped_locked_count {
            "Tidak ada rekaman yang dihapus karena seluruh file lama terkunci (locked).".into()
        } else {
            "Tidak ada rekaman yang memenuhi kriteria pembersihan saat ini.".into()
        };

        Ok(CleanupReport {
            checked_count,
            deleted_count,
            freed_bytes,
            skipped_locked_count,
            skipped_recording_count,
            failed_count,
            executed_at,
            status: status.into(),
            message,
        })
    }
}
