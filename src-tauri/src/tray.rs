//! System tray icon, replacing the previous Python app's pystray-based tray
//! with Tauri's native tray (runs on the main event loop, no extra thread).

use crate::state::AppState;
use tauri::menu::{CheckMenuItem, Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Manager, Wry};
use tauri_plugin_autostart::ManagerExt;

pub struct TrayHandles {
    pub pause_item: CheckMenuItem<Wry>,
    pub autostart_item: CheckMenuItem<Wry>,
}

pub fn autostart_label() -> &'static str {
    if cfg!(target_os = "macos") {
        "Open at Login"
    } else if cfg!(target_os = "linux") {
        "Start automatically on login"
    } else {
        "Start with Windows"
    }
}

pub fn build(app_handle: &AppHandle) -> tauri::Result<()> {
    let state = app_handle.state::<AppState>();
    let paused = state.settings.lock().unwrap().monitor_paused;
    let autostart_on = app_handle.autolaunch().is_enabled().unwrap_or(false);

    let show_item = MenuItem::with_id(app_handle, "show", "Show ClipLens", true, None::<&str>)?;
    let pause_item =
        CheckMenuItem::with_id(app_handle, "pause", "Pause monitoring", true, paused, None::<&str>)?;
    let autostart_item = CheckMenuItem::with_id(
        app_handle,
        "autostart",
        autostart_label(),
        true,
        autostart_on,
        None::<&str>,
    )?;
    let quit_item = MenuItem::with_id(app_handle, "quit", "Quit ClipLens", true, None::<&str>)?;

    let menu = Menu::with_items(
        app_handle,
        &[
            &show_item,
            &PredefinedMenuItem::separator(app_handle)?,
            &pause_item,
            &autostart_item,
            &PredefinedMenuItem::separator(app_handle)?,
            &quit_item,
        ],
    )?;

    let icon = app_handle
        .default_window_icon()
        .cloned()
        .expect("bundled app icon");

    let tray = TrayIconBuilder::with_id("main-tray")
        .icon(icon)
        .tooltip("ClipLens")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id().as_ref() {
            "show" => crate::show_and_focus_main_window(app),
            "pause" => crate::commands::toggle_pause_from_native(app),
            "autostart" => crate::commands::toggle_autostart_from_tray(app),
            "quit" => crate::request_quit(app),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                crate::show_and_focus_main_window(tray.app_handle());
            }
        })
        .build(app_handle)?;

    // Keep the TrayIcon alive for the app's lifetime (dropping it removes
    // the icon from the system tray).
    app_handle.manage(tray);
    app_handle.manage(std::sync::Mutex::new(TrayHandles {
        pause_item,
        autostart_item,
    }));
    Ok(())
}

pub fn sync(app_handle: &AppHandle) {
    let state = app_handle.state::<AppState>();
    let paused = state.settings.lock().unwrap().monitor_paused;
    let autostart_on = app_handle.autolaunch().is_enabled().unwrap_or(false);
    if let Some(handles) = app_handle.try_state::<std::sync::Mutex<TrayHandles>>() {
        let handles = handles.lock().unwrap();
        let _ = handles.pause_item.set_checked(paused);
        let _ = handles.autostart_item.set_checked(autostart_on);
    }
}

pub fn notify(app_handle: &AppHandle, body: &str) {
    use tauri_plugin_notification::NotificationExt;
    let _ = app_handle
        .notification()
        .builder()
        .title("ClipLens")
        .body(body)
        .show();
}
