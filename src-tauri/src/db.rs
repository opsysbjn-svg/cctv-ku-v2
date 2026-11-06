use chrono::{DateTime, Duration, Local, Utc};
use rusqlite::{params, Connection, Result};
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct RecordingRecord {
    pub id: String,
    pub camera_id: String,
    pub camera_name: String,
    pub file_name: String,
    pub file_path: String,
    pub codec: String,
    pub resolution: String,
    pub fps: i32,
    pub bitrate: i32,
    pub duration: f64,
    pub file_size: i64,
    pub start_time: String,
    pub end_time: String,
    pub recording_status: String,
    pub is_locked: bool,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct StorageStats {
    pub total_disk_bytes: u64,
    pub used_disk_bytes: u64,
    pub available_disk_bytes: u64,
    pub cctv_recordings_bytes: i64,
    pub total_recordings_count: i64,
    pub today_recordings_count: i64,
    pub storage_path: String,
    pub max_quota_gb: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CleanupReport {
    pub checked_count: usize,
    pub deleted_count: usize,
    pub freed_bytes: u64,
    pub skipped_locked_count: usize,
    pub skipped_recording_count: usize,
    pub failed_count: usize,
    pub executed_at: String,
    pub status: String, // "success" | "empty" | "failed"
    pub message: String,
}

pub struct DatabaseManager {
    db_path: String,
}

impl DatabaseManager {
    pub fn new<P: AsRef<Path>>(path: P) -> Result<Self> {
        let db_path = path.as_ref().to_string_lossy().to_string();
        let conn = Connection::open(&db_path)?;

        // Initialize SQLite schema with all required fields from Section F
        conn.execute(
            "CREATE TABLE IF NOT EXISTS recordings (
                id TEXT PRIMARY KEY,
                camera_id TEXT NOT NULL,
                camera_name TEXT NOT NULL,
                file_name TEXT NOT NULL,
                file_path TEXT NOT NULL UNIQUE,
                codec TEXT NOT NULL,
                resolution TEXT NOT NULL,
                fps INTEGER NOT NULL,
                bitrate INTEGER NOT NULL,
                duration REAL NOT NULL DEFAULT 0.0,
                file_size INTEGER NOT NULL DEFAULT 0,
                start_time TEXT NOT NULL,
                end_time TEXT NOT NULL,
                recording_status TEXT NOT NULL,
                is_locked INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL
            )",
            [],
        )?;

        // Create indexes for efficient date and camera queries
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_recordings_start_time ON recordings(start_time)",
            [],
        )?;
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_recordings_camera_id ON recordings(camera_id)",
            [],
        )?;
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_recordings_is_locked ON recordings(is_locked)",
            [],
        )?;

        Ok(Self { db_path })
    }

    pub fn get_connection(&self) -> Result<Connection> {
        Connection::open(&self.db_path)
    }

    pub fn insert_recording(&self, r: &RecordingRecord) -> Result<()> {
        let conn = self.get_connection()?;
        conn.execute(
            "INSERT INTO recordings (
                id, camera_id, camera_name, file_name, file_path, codec,
                resolution, fps, bitrate, duration, file_size, start_time,
                end_time, recording_status, is_locked, created_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16)
            ON CONFLICT(file_path) DO UPDATE SET
                duration = excluded.duration,
                file_size = excluded.file_size,
                end_time = excluded.end_time,
                recording_status = excluded.recording_status",
            params![
                r.id,
                r.camera_id,
                r.camera_name,
                r.file_name,
                r.file_path,
                r.codec,
                r.resolution,
                r.fps,
                r.bitrate,
                r.duration,
                r.file_size,
                r.start_time,
                r.end_time,
                r.recording_status,
                if r.is_locked { 1 } else { 0 },
                r.created_at,
            ],
        )?;
        Ok(())
    }

    pub fn get_recordings(
        &self,
        camera_id: Option<String>,
        date_filter: Option<String>,
        search_query: Option<String>,
        codec_filter: Option<String>,
        sort_order: Option<String>,
    ) -> Result<Vec<RecordingRecord>> {
        let conn = self.get_connection()?;
        let mut sql = "SELECT id, camera_id, camera_name, file_name, file_path, codec,
                       resolution, fps, bitrate, duration, file_size, start_time,
                       end_time, recording_status, is_locked, created_at
                       FROM recordings WHERE 1=1".to_string();

        let mut params_vec: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

        if let Some(ref cam) = camera_id {
            if !cam.is_empty() && cam != "all" {
                sql.push_str(" AND (camera_id = ? OR camera_name = ?)");
                params_vec.push(Box::new(cam.clone()));
                params_vec.push(Box::new(cam.clone()));
            }
        }

        if let Some(ref date) = date_filter {
            if !date.is_empty() && date != "all" {
                sql.push_str(" AND start_time LIKE ?");
                params_vec.push(Box::new(format!("{}%", date)));
            }
        }

        if let Some(ref codec) = codec_filter {
            if !codec.is_empty() && codec != "all" {
                sql.push_str(" AND LOWER(codec) = ?");
                params_vec.push(Box::new(codec.to_lowercase()));
            }
        }

        if let Some(ref q) = search_query {
            let trimmed = q.trim();
            if !trimmed.is_empty() {
                sql.push_str(" AND (file_name LIKE ? OR camera_name LIKE ?)");
                let pattern = format!("%{}%", trimmed);
                params_vec.push(Box::new(pattern.clone()));
                params_vec.push(Box::new(pattern));
            }
        }

        let order = if sort_order.as_deref() == Some("asc") {
            "ASC"
        } else {
            "DESC"
        };
        sql.push_str(&format!(" ORDER BY start_time {}", order));

        let mut stmt = conn.prepare(&sql)?;
        let params_slice: Vec<&dyn rusqlite::ToSql> = params_vec.iter().map(|p| p.as_ref()).collect();

        let rows = stmt.query_map(params_slice.as_slice(), |row| {
            let is_locked_num: i32 = row.get(14)?;
            let file_path: String = row.get(4)?;
            let mut status: String = row.get(13)?;

            // Section G: Check physical existence; if file is missing, mark as missing
            if !Path::new(&file_path).exists() && status != "recording" {
                status = "missing".to_string();
            }

            Ok(RecordingRecord {
                id: row.get(0)?,
                camera_id: row.get(1)?,
                camera_name: row.get(2)?,
                file_name: row.get(3)?,
                file_path,
                codec: row.get(5)?,
                resolution: row.get(6)?,
                fps: row.get(7)?,
                bitrate: row.get(8)?,
                duration: row.get(9)?,
                file_size: row.get(10)?,
                start_time: row.get(11)?,
                end_time: row.get(12)?,
                recording_status: status,
                is_locked: is_locked_num != 0,
                created_at: row.get(15)?,
            })
        })?;

        let mut results = Vec::new();
        for r in rows {
            results.push(r?);
        }
        Ok(results)
    }

    pub fn delete_recording(&self, id: &str) -> Result<Option<String>> {
        let conn = self.get_connection()?;
        // Fetch file path before deleting (only if unlocked)
        let path: Option<String> = conn
            .query_row(
                "SELECT file_path FROM recordings WHERE id = ?1 AND is_locked = 0",
                params![id],
                |row| row.get(0),
            )
            .ok();

        if path.is_some() {
            conn.execute("DELETE FROM recordings WHERE id = ?1 AND is_locked = 0", params![id])?;
        }
        Ok(path)
    }

    pub fn set_lock(&self, id: &str, locked: bool) -> Result<bool> {
        let conn = self.get_connection()?;
        let val = if locked { 1 } else { 0 };
        conn.execute(
            "UPDATE recordings SET is_locked = ?1 WHERE id = ?2",
            params![val, id],
        )?;
        Ok(locked)
    }

    pub fn toggle_lock(&self, id: &str) -> Result<bool> {
        let conn = self.get_connection()?;
        let current_locked: i32 = conn.query_row(
            "SELECT is_locked FROM recordings WHERE id = ?1",
            params![id],
            |row| row.get(0),
        )?;
        let new_state = if current_locked == 0 { 1 } else { 0 };
        conn.execute(
            "UPDATE recordings SET is_locked = ?1 WHERE id = ?2",
            params![new_state, id],
        )?;
        Ok(new_state != 0)
    }

    pub fn get_cctv_stats(&self) -> Result<(i64, i64, i64)> {
        let conn = self.get_connection()?;
        let total_size: i64 = conn
            .query_row("SELECT COALESCE(SUM(file_size), 0) FROM recordings", [], |row| row.get(0))
            .unwrap_or(0);
        let total_count: i64 = conn
            .query_row("SELECT COUNT(*) FROM recordings", [], |row| row.get(0))
            .unwrap_or(0);

        let today_prefix = Local::now().format("%Y-%m-%d").to_string();
        let today_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM recordings WHERE start_time LIKE ?1",
                params![format!("{}%", today_prefix)],
                |row| row.get(0),
            )
            .unwrap_or(0);

        Ok((total_size, total_count, today_count))
    }

    /// Section F: Reconcile database and physical filesystem
    pub fn reconcile_with_filesystem(&self, storage_dir: &Path) -> Result<()> {
        if !storage_dir.exists() {
            return Ok(());
        }

        // Recursively walk through storage directory and index completed .mp4 / .webm files
        let mut found_files = Vec::new();
        Self::collect_video_files(storage_dir, &mut found_files);

        for file_path in found_files {
            let path_str = file_path.to_string_lossy().to_string();
            let conn = self.get_connection()?;

            let exists_in_db: bool = conn
                .query_row(
                    "SELECT 1 FROM recordings WHERE file_path = ?1",
                    params![path_str],
                    |_| Ok(true),
                )
                .unwrap_or(false);

            if !exists_in_db {
                if let Ok(metadata) = file_path.metadata() {
                    let file_size = metadata.len() as i64;
                    let file_name = file_path
                        .file_name()
                        .and_then(|n| n.to_str())
                        .unwrap_or("recording.mp4")
                        .to_string();

                    let created_time = metadata
                        .created()
                        .ok()
                        .map(|t| DateTime::<Utc>::from(t).to_rfc3339())
                        .unwrap_or_else(|| Local::now().to_rfc3339());

                    let camera_name = file_path
                        .parent()
                        .and_then(|p| p.parent())
                        .and_then(|p| p.parent())
                        .and_then(|p| p.parent())
                        .and_then(|p| p.file_name())
                        .and_then(|n| n.to_str())
                        .unwrap_or("Camera 1")
                        .to_string();

                    let id = format!("rec_{}", file_name.replace('.', "_"));
                    let record = RecordingRecord {
                        id,
                        camera_id: "cam_1".to_string(),
                        camera_name,
                        file_name,
                        file_path: path_str,
                        codec: "H264".to_string(),
                        resolution: "1280x720".to_string(),
                        fps: 30,
                        bitrate: 2500000,
                        duration: 300.0,
                        file_size,
                        start_time: created_time.clone(),
                        end_time: created_time.clone(),
                        recording_status: "completed".to_string(),
                        is_locked: false,
                        created_at: created_time,
                    };

                    let _ = self.insert_recording(&record);
                }
            }
        }

        Ok(())
    }

    fn collect_video_files(dir: &Path, acc: &mut Vec<PathBuf>) {
        if let Ok(entries) = std::fs::read_dir(dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_dir() {
                    Self::collect_video_files(&path, acc);
                } else if path.is_file() {
                    let ext = path
                        .extension()
                        .and_then(|e| e.to_str())
                        .unwrap_or("")
                        .to_lowercase();
                    if ext == "mp4" || ext == "webm" || ext == "mkv" {
                        acc.push(path);
                    }
                }
            }
        }
    }
}
