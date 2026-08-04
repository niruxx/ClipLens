//! Background thread that watches the OS clipboard and records history,
//! mirroring the previous Python app's `monitor.py`.

use crate::{clipboard, db, state::AppState};
use arboard::Clipboard;
use image::{imageops::FilterType, ImageFormat, RgbaImage};
use std::io::Cursor;
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager};

const MAX_TEXT_CHARS: usize = 500_000;
const THUMB_MAX_DIM: u32 = 320;

pub fn spawn(app_handle: AppHandle) {
    std::thread::spawn(move || {
        let mut clipboard = match Clipboard::new() {
            Ok(c) => c,
            Err(_) => return,
        };
        loop {
            let (interval_ms, paused) = {
                let state = app_handle.state::<AppState>();
                let settings = state.settings.lock().unwrap();
                (settings.poll_interval_ms.max(150), settings.monitor_paused)
            };
            std::thread::sleep(Duration::from_millis(interval_ms));
            if paused {
                continue;
            }
            poll_once(&app_handle, &mut clipboard);
        }
    });
}

fn poll_once(app_handle: &AppHandle, clipboard: &mut Clipboard) {
    let state = app_handle.state::<AppState>();
    let capture_images = state.settings.lock().unwrap().capture_images;

    if capture_images {
        if let Some(image) = clipboard::read_image(clipboard) {
            handle_image(app_handle, image);
            return;
        }
    }

    if let Some(text) = clipboard::read_text(clipboard) {
        handle_text(app_handle, text);
    }
}

fn handle_text(app_handle: &AppHandle, mut text: String) {
    if text.trim().is_empty() {
        return;
    }
    if text.len() > MAX_TEXT_CHARS {
        text.truncate(MAX_TEXT_CHARS);
    }
    let hash = clipboard::hash_text(&text);

    let state = app_handle.state::<AppState>();
    {
        let mut last = state.last_text_hash.lock().unwrap();
        if last.as_deref() == Some(hash.as_str()) {
            return;
        }
        *last = Some(hash.clone());
    }

    let is_new = {
        let conn = state.conn.lock().unwrap();
        match db::add_or_bump(&conn, "text", &hash, Some(&text), None, None, None, None) {
            Ok((_, is_new)) => is_new,
            Err(_) => return,
        }
    };
    after_write(app_handle, is_new);
}

fn handle_image(app_handle: &AppHandle, image: RgbaImage) {
    let mut png_bytes = Vec::new();
    if image
        .write_to(&mut Cursor::new(&mut png_bytes), ImageFormat::Png)
        .is_err()
    {
        return;
    }
    let hash = clipboard::hash_bytes(&png_bytes);

    let state = app_handle.state::<AppState>();
    {
        let mut last = state.last_image_hash.lock().unwrap();
        if last.as_deref() == Some(hash.as_str()) {
            return;
        }
        *last = Some(hash.clone());
    }

    let filename = db::new_image_filename(".png");
    let thumb_filename = db::new_image_filename(".thumb.png");
    let (width, height) = image.dimensions();

    let is_new = {
        let conn = state.conn.lock().unwrap();
        match db::add_or_bump(
            &conn,
            "image",
            &hash,
            None,
            Some(&filename),
            Some(&thumb_filename),
            Some(width),
            Some(height),
        ) {
            Ok((_, is_new)) => is_new,
            Err(_) => return,
        }
    };

    if is_new {
        let _ = std::fs::create_dir_all(&state.images_dir);
        let _ = std::fs::write(state.images_dir.join(&filename), &png_bytes);

        let max_dim = THUMB_MAX_DIM.min(width.max(height));
        let scale = max_dim as f32 / width.max(height) as f32;
        let (tw, th) = (
            ((width as f32 * scale).round() as u32).max(1),
            ((height as f32 * scale).round() as u32).max(1),
        );
        let thumb = image::imageops::resize(&image, tw, th, FilterType::Lanczos3);
        let _ = thumb.save_with_format(state.images_dir.join(&thumb_filename), ImageFormat::Png);
    }

    after_write(app_handle, is_new);
}

fn after_write(app_handle: &AppHandle, is_new: bool) {
    if is_new {
        let state = app_handle.state::<AppState>();
        let max_items = state.settings.lock().unwrap().max_history_items;
        let removed = {
            let conn = state.conn.lock().unwrap();
            db::purge_excess(&conn, max_items).unwrap_or_default()
        };
        for item in &removed {
            db::delete_item_files(&state.images_dir, item);
        }
    }
    let _ = app_handle.emit("history-changed", ());
}
