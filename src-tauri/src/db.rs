//! SQLite-backed clipboard history storage, mirroring the previous Python
//! app's `database.py` schema and query set.

use rusqlite::{params, Connection, OptionalExtension, Row};
use serde::Serialize;
use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};
use uuid::Uuid;

const SCHEMA: &str = "
CREATE TABLE IF NOT EXISTS clip_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL CHECK(type IN ('text', 'image')),
    content TEXT,
    image_path TEXT,
    thumb_path TEXT,
    width INTEGER,
    height INTEGER,
    content_hash TEXT NOT NULL UNIQUE,
    pinned INTEGER NOT NULL DEFAULT 0,
    created_at REAL NOT NULL,
    updated_at REAL NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_clip_items_updated ON clip_items(pinned DESC, updated_at DESC);
";

#[derive(Debug, Clone, Serialize)]
pub struct ClipItem {
    pub id: i64,
    #[serde(rename = "type")]
    pub kind: String,
    pub content: Option<String>,
    pub image_path: Option<String>,
    pub thumb_path: Option<String>,
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub content_hash: String,
    pub pinned: bool,
    pub created_at: f64,
    pub updated_at: f64,
}

impl ClipItem {
    fn from_row(row: &Row) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get("id")?,
            kind: row.get("type")?,
            content: row.get("content")?,
            image_path: row.get("image_path")?,
            thumb_path: row.get("thumb_path")?,
            width: row.get("width")?,
            height: row.get("height")?,
            content_hash: row.get("content_hash")?,
            pinned: row.get::<_, i64>("pinned")? != 0,
            created_at: row.get("created_at")?,
            updated_at: row.get("updated_at")?,
        })
    }
}

pub fn now() -> f64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs_f64())
        .unwrap_or(0.0)
}

pub fn new_image_filename(suffix: &str) -> String {
    format!("{}{}", Uuid::new_v4().simple(), suffix)
}

pub fn open(db_path: &Path) -> rusqlite::Result<Connection> {
    if let Some(parent) = db_path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    let conn = Connection::open(db_path)?;
    conn.pragma_update(None, "journal_mode", "WAL")?;
    conn.pragma_update(None, "foreign_keys", "ON")?;
    conn.execute_batch(SCHEMA)?;
    Ok(conn)
}

/// Insert a new item, or bump an existing one (by hash) to the top.
/// Returns (item_id, is_new).
#[allow(clippy::too_many_arguments)]
pub fn add_or_bump(
    conn: &Connection,
    kind: &str,
    content_hash: &str,
    content: Option<&str>,
    image_path: Option<&str>,
    thumb_path: Option<&str>,
    width: Option<u32>,
    height: Option<u32>,
) -> rusqlite::Result<(i64, bool)> {
    let ts = now();
    let existing: Option<i64> = conn
        .query_row(
            "SELECT id FROM clip_items WHERE content_hash = ?1",
            params![content_hash],
            |row| row.get(0),
        )
        .optional()?;

    if let Some(id) = existing {
        conn.execute(
            "UPDATE clip_items SET updated_at = ?1 WHERE id = ?2",
            params![ts, id],
        )?;
        return Ok((id, false));
    }

    conn.execute(
        "INSERT INTO clip_items
            (type, content, image_path, thumb_path, width, height,
             content_hash, pinned, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 0, ?8, ?8)",
        params![
            kind,
            content,
            image_path,
            thumb_path,
            width,
            height,
            content_hash,
            ts
        ],
    )?;
    Ok((conn.last_insert_rowid(), true))
}

pub fn toggle_pin(conn: &Connection, id: i64) -> rusqlite::Result<()> {
    conn.execute(
        "UPDATE clip_items SET pinned = 1 - pinned WHERE id = ?1",
        params![id],
    )?;
    Ok(())
}

pub fn delete_item(conn: &Connection, id: i64) -> rusqlite::Result<Option<ClipItem>> {
    let item = get_item(conn, id)?;
    if item.is_some() {
        conn.execute("DELETE FROM clip_items WHERE id = ?1", params![id])?;
    }
    Ok(item)
}

pub fn clear_history(conn: &Connection, keep_pinned: bool) -> rusqlite::Result<Vec<ClipItem>> {
    let query = if keep_pinned {
        "SELECT * FROM clip_items WHERE pinned = 0"
    } else {
        "SELECT * FROM clip_items"
    };
    let mut stmt = conn.prepare(query)?;
    let rows = stmt
        .query_map([], ClipItem::from_row)?
        .collect::<Result<Vec<_>, _>>()?;

    if keep_pinned {
        conn.execute("DELETE FROM clip_items WHERE pinned = 0", [])?;
    } else {
        conn.execute("DELETE FROM clip_items", [])?;
    }
    Ok(rows)
}

/// Delete oldest, unpinned rows beyond `max_items`. Returns deleted rows.
pub fn purge_excess(conn: &Connection, max_items: u32) -> rusqlite::Result<Vec<ClipItem>> {
    let mut stmt = conn.prepare(
        "SELECT * FROM clip_items WHERE pinned = 0
         ORDER BY updated_at DESC
         LIMIT -1 OFFSET ?1",
    )?;
    let rows = stmt
        .query_map(params![max_items], ClipItem::from_row)?
        .collect::<Result<Vec<_>, _>>()?;

    if !rows.is_empty() {
        let ids: Vec<String> = rows.iter().map(|r| r.id.to_string()).collect();
        let sql = format!(
            "DELETE FROM clip_items WHERE id IN ({})",
            ids.join(",")
        );
        conn.execute(&sql, [])?;
    }
    Ok(rows)
}

pub fn list_items(conn: &Connection, search: &str) -> rusqlite::Result<Vec<ClipItem>> {
    let mut stmt = if search.is_empty() {
        conn.prepare("SELECT * FROM clip_items ORDER BY pinned DESC, updated_at DESC")?
    } else {
        conn.prepare(
            "SELECT * FROM clip_items
             WHERE type = 'image' OR content LIKE ?1
             ORDER BY pinned DESC, updated_at DESC",
        )?
    };

    let rows = if search.is_empty() {
        stmt.query_map([], ClipItem::from_row)?
            .collect::<Result<Vec<_>, _>>()?
    } else {
        let pattern = format!("%{}%", search);
        stmt.query_map(params![pattern], ClipItem::from_row)?
            .collect::<Result<Vec<_>, _>>()?
    };
    Ok(rows)
}

pub fn get_item(conn: &Connection, id: i64) -> rusqlite::Result<Option<ClipItem>> {
    conn.query_row(
        "SELECT * FROM clip_items WHERE id = ?1",
        params![id],
        ClipItem::from_row,
    )
    .optional()
}

/// Remove the image/thumbnail files backing a clip item, if any.
pub fn delete_item_files(images_dir: &Path, item: &ClipItem) {
    for rel in [&item.image_path, &item.thumb_path].into_iter().flatten() {
        let _ = std::fs::remove_file(images_dir.join(rel));
    }
}
