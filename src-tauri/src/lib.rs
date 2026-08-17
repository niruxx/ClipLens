mod clipboard;
mod commands;
mod db;
mod hotkey;
mod monitor;
mod quickpanel;
mod settings;
mod state;
mod tray;
mod webview_tweaks;
mod winfocus;

use settings::Settings;
use state::AppState;
use std::sync::Mutex;
use tauri::{Emitter, Manager, WindowEvent};
use tauri_plugin_autostart::MacosLauncher;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let start_minimized_flag = std::env::args().any(|a| a == "--minimized");

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            Some(vec!["--minimized"]),
        ))
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            commands::list_items,
            commands::toggle_pin,
            commands::delete_item,
            commands::copy_item,
            commands::clear_history,
            commands::get_settings,
            commands::update_settings,
            commands::toggle_pause,
            commands::toggle_autostart,
            commands::is_autostart_enabled,
            commands::get_platform,
            commands::get_images_dir,
            commands::get_seed_color_choices,
            commands::get_autostart_label,
            commands::hide_to_tray,
            commands::quit_app,
            commands::hide_quick_window,
            commands::set_quick_hotkey,
        ])
        .setup(move |app| {
            let data_dir = app
                .path()
                .app_data_dir()
                .expect("resolve app data dir");
            std::fs::create_dir_all(&data_dir).ok();
            let images_dir = data_dir.join("images");
            std::fs::create_dir_all(&images_dir).ok();
            let settings_path = data_dir.join("settings.json");
            let db_path = data_dir.join("history.db");

            let settings = Settings::load(&settings_path);
            let conn = db::open(&db_path).expect("open database");
            let effective_start_minimized = start_minimized_flag || settings.start_minimized;
            let initial_hotkey = settings.quick_hotkey.clone();

            app.manage(AppState {
                conn: Mutex::new(conn),
                settings: Mutex::new(settings),
                settings_path,
                images_dir,
                last_text_hash: Mutex::new(None),
                last_image_hash: Mutex::new(None),
                tray_hint_shown: Mutex::new(false),
            });

            tray::build(&app.handle())?;
            monitor::spawn(app.handle().clone());

            quickpanel::create(&app.handle())?;
            if let Err(e) = hotkey::register(&app.handle(), &initial_hotkey) {
                eprintln!("Failed to register quick-access hotkey {initial_hotkey:?}: {e}");
            }

            let window = app.get_webview_window("main").expect("main window");
            webview_tweaks::disable_browser_accelerator_keys(&window);
            if effective_start_minimized {
                // The window is created visible (see tauri.conf.json) because
                // WebView2 can get stuck un-painted if a window is created
                // hidden and shown later programmatically - so for the
                // minimized case we let it paint once, then hide it.
                let _ = window.hide();
                let _ = window.set_skip_taskbar(true);
            } else {
                let _ = window.set_focus();
                nudge_repaint(&window);
                #[cfg(target_os = "windows")]
                {
                    if let Ok(hwnd) = window.hwnd() {
                        winfocus::force_foreground(hwnd.0 as isize);
                    }
                }
            }

            let handle_for_close = app.handle().clone();
            window.on_window_event(move |event| {
                if let WindowEvent::CloseRequested { api, .. } = event {
                    api.prevent_close();
                    let _ = handle_for_close.emit("request-hide", ());
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

/// Shows, focuses, and (on Windows) forces the main window to the real OS
/// foreground - used from the tray "Show" action and from a tray icon click.
pub fn show_and_focus_main_window(app: &tauri::AppHandle) {
    let Some(window) = app.get_webview_window("main") else {
        return;
    };
    let _ = window.set_skip_taskbar(false);
    let _ = window.show();
    let _ = window.set_focus();
    nudge_repaint(&window);

    #[cfg(target_os = "windows")]
    {
        if let Ok(hwnd) = window.hwnd() {
            winfocus::force_foreground(hwnd.0 as isize);
        }
    }

    let _ = window.emit("window-shown", ());
}

/// WebView2 can come back from hidden (or even right after initial creation)
/// fully un-painted - it stays blank until some input event forces a
/// repaint. Given a moment for the page to finish its initial layout, this
/// synthesizes a click to force that redraw immediately instead of waiting
/// on the user to click first (see `winfocus::nudge_repaint_via_click`).
#[allow(unused_variables)]
fn nudge_repaint(window: &tauri::WebviewWindow) {
    #[cfg(target_os = "windows")]
    {
        let window = window.clone();
        std::thread::spawn(move || {
            std::thread::sleep(std::time::Duration::from_millis(150));
            if let Ok(hwnd) = window.hwnd() {
                winfocus::nudge_repaint_via_click(hwnd.0 as isize);
            }
        });
    }
}

/// Actually hides the window to the tray - called once the frontend has
/// finished its fade-out transition.
pub fn hide_main_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.hide();
        let _ = window.set_skip_taskbar(true);
    }
    let state = app.state::<AppState>();
    let mut shown = state.tray_hint_shown.lock().unwrap();
    if !*shown {
        *shown = true;
        tray::notify(
            app,
            "ClipLens is still running in the tray. Click the icon to reopen it.",
        );
    }
}

/// Asks the frontend to fade out before actually exiting (triggered from the
/// tray's Quit item; the hamburger menu's Quit does the same fade in JS then
/// calls the `quit_app` command directly).
pub fn request_quit(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.emit("request-quit", ());
    } else {
        app.exit(0);
    }
}
