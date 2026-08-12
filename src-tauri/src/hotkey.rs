//! Registers/unregisters the global "quick access" hotkey.

use crate::quickpanel;
use tauri::AppHandle;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

pub fn register(app: &AppHandle, hotkey: &str) -> Result<(), String> {
    app.global_shortcut()
        .on_shortcut(hotkey, |app, _shortcut, event| {
            if event.state() == ShortcutState::Pressed {
                quickpanel::toggle(app);
            }
        })
        .map_err(|e| e.to_string())
}

pub fn unregister(app: &AppHandle, hotkey: &str) {
    let _ = app.global_shortcut().unregister(hotkey);
}
