use crate::db::{self, ClipItem};
use crate::settings::Settings;
use crate::state::AppState;
use crate::{clipboard, tray};
use arboard::Clipboard;
use serde::Deserialize;
use tauri::{AppHandle, Emitter, Manager, State};
use tauri_plugin_autostart::ManagerExt;

#[tauri::command]
pub fn list_items(state: State<AppState>, search: String) -> Result<Vec<ClipItem>, String> {
    let conn = state.conn.lock().unwrap();
    db::list_items(&conn, &search).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn toggle_pin(state: State<AppState>, id: i64) -> Result<(), String> {
    let conn = state.conn.lock().unwrap();
    db::toggle_pin(&conn, id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_item(state: State<AppState>, id: i64) -> Result<(), String> {
    let conn = state.conn.lock().unwrap();
    if let Some(item) = db::delete_item(&conn, id).map_err(|e| e.to_string())? {
        db::delete_item_files(&state.images_dir, &item);
    }
    Ok(())
}

#[tauri::command]
pub fn copy_item(state: State<AppState>, id: i64) -> Result<(), String> {
    let item = {
        let conn = state.conn.lock().unwrap();
        db::get_item(&conn, id)
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "Item not found".to_string())?
    };

    let mut cb = Clipboard::new().map_err(|e| e.to_string())?;
    if item.kind == "text" {
        clipboard::write_text(&mut cb, item.content.as_deref().unwrap_or(""))
            .map_err(|e| e.to_string())?;
    } else {
        let path = state
            .images_dir
            .join(item.image_path.as_deref().unwrap_or(""));
        let img = image::open(&path)
            .map_err(|e| e.to_string())?
            .to_rgba8();
        clipboard::write_image(&mut cb, &img).map_err(|e| e.to_string())?;
    }

    let conn = state.conn.lock().unwrap();
    db::add_or_bump(
        &conn,
        &item.kind,
        &item.content_hash,
        item.content.as_deref(),
        item.image_path.as_deref(),
        item.thumb_path.as_deref(),
        item.width,
        item.height,
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn clear_history(state: State<AppState>, keep_pinned: bool) -> Result<(), String> {
    let removed = {
        let conn = state.conn.lock().unwrap();
        db::clear_history(&conn, keep_pinned).map_err(|e| e.to_string())?
    };
    for item in &removed {
        db::delete_item_files(&state.images_dir, item);
    }
    Ok(())
}

#[tauri::command]
pub fn get_settings(state: State<AppState>) -> Settings {
    state.settings.lock().unwrap().clone()
}

#[derive(Debug, Deserialize, Default)]
pub struct SettingsPatch {
    pub theme_mode: Option<String>,
    pub seed_color: Option<String>,
    pub max_history_items: Option<u32>,
    pub start_minimized: Option<bool>,
    pub capture_images: Option<bool>,
}

#[tauri::command]
pub fn update_settings(
    app: AppHandle,
    state: State<AppState>,
    patch: SettingsPatch,
) -> Result<Settings, String> {
    let max_items_changed = {
        let mut settings = state.settings.lock().unwrap();
        if let Some(v) = patch.theme_mode {
            settings.theme_mode = v;
        }
        if let Some(v) = patch.seed_color {
            settings.seed_color = v;
        }
        if let Some(v) = patch.capture_images {
            settings.capture_images = v;
        }
        if let Some(v) = patch.start_minimized {
            settings.start_minimized = v;
        }
        let mut changed = None;
        if let Some(v) = patch.max_history_items {
            if v != settings.max_history_items {
                settings.max_history_items = v;
                changed = Some(v);
            }
        }
        changed
    };
    state.save_settings();

    if let Some(max_items) = max_items_changed {
        let removed = {
            let conn = state.conn.lock().unwrap();
            db::purge_excess(&conn, max_items).map_err(|e| e.to_string())?
        };
        for item in &removed {
            db::delete_item_files(&state.images_dir, item);
        }
        let _ = app.emit("history-changed", ());
    }

    Ok(state.settings.lock().unwrap().clone())
}

#[tauri::command]
pub fn toggle_pause(app: AppHandle) {
    toggle_pause_from_native(&app);
}

pub fn toggle_pause_from_native(app: &AppHandle) {
    let state = app.state::<AppState>();
    {
        let mut settings = state.settings.lock().unwrap();
        settings.monitor_paused = !settings.monitor_paused;
    }
    state.save_settings();
    tray::sync(app);
    let _ = app.emit("settings-changed", ());
}

#[tauri::command]
pub fn toggle_autostart(app: AppHandle, enabled: bool) -> bool {
    let ok = if enabled {
        app.autolaunch().enable()
    } else {
        app.autolaunch().disable()
    }
    .is_ok();

    if ok {
        let state = app.state::<AppState>();
        {
            state.settings.lock().unwrap().launch_on_boot = enabled;
        }
        state.save_settings();
        tray::sync(&app);
    }
    ok
}

pub fn toggle_autostart_from_tray(app: &AppHandle) {
    let desired = !app.autolaunch().is_enabled().unwrap_or(false);
    let ok = if desired {
        app.autolaunch().enable()
    } else {
        app.autolaunch().disable()
    }
    .is_ok();
    if ok {
        let state = app.state::<AppState>();
        {
            state.settings.lock().unwrap().launch_on_boot = desired;
        }
        state.save_settings();
    }
    tray::sync(app);
    let _ = app.emit("settings-changed", ());
}

#[tauri::command]
pub fn is_autostart_enabled(app: AppHandle) -> bool {
    app.autolaunch().is_enabled().unwrap_or(false)
}

#[tauri::command]
pub fn get_platform() -> &'static str {
    std::env::consts::OS
}

#[tauri::command]
pub fn get_images_dir(state: State<AppState>) -> String {
    state.images_dir.to_string_lossy().to_string()
}

#[tauri::command]
pub fn get_seed_color_choices() -> Vec<(&'static str, &'static str)> {
    crate::settings::SEED_COLOR_CHOICES.to_vec()
}

#[tauri::command]
pub fn get_autostart_label() -> &'static str {
    tray::autostart_label()
}

#[tauri::command]
pub fn hide_to_tray(app: AppHandle) {
    crate::hide_main_window(&app);
}

#[tauri::command]
pub fn quit_app(app: AppHandle) {
    app.exit(0);
}
