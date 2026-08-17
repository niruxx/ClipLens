//! The "quick access" popup: a small always-on-top window toggled by a
//! global hotkey, positioned either next to the cursor or at the bottom-right
//! of the screen (see `Settings::quick_position`), for grabbing a clipboard
//! item without opening the main window.

use crate::state::AppState;
use tauri::{
    AppHandle, Emitter, Manager, PhysicalPosition, Position, WebviewUrl, WebviewWindow,
    WebviewWindowBuilder, WindowEvent,
};

pub const LABEL: &str = "quick";
const WIDTH: f64 = 340.0;
const HEIGHT: f64 = 440.0;
const MARGIN: i32 = 14;

pub fn create(app: &AppHandle) -> tauri::Result<WebviewWindow> {
    let window = WebviewWindowBuilder::new(app, LABEL, WebviewUrl::App("index.html".into()))
        .title("ClipLens Quick Access")
        .inner_size(WIDTH, HEIGHT)
        .resizable(false)
        .decorations(false)
        .transparent(false)
        .shadow(true)
        .always_on_top(true)
        .skip_taskbar(true)
        .visible(false)
        .focused(false)
        .build()?;

    crate::webview_tweaks::disable_browser_accelerator_keys(&window);

    // Dismiss on click-away, same as a native popup/menu would.
    let blur_window = window.clone();
    window.on_window_event(move |event| {
        if let WindowEvent::Focused(false) = event {
            let _ = blur_window.hide();
        }
    });

    Ok(window)
}

/// Toggled by the global hotkey.
pub fn toggle(app: &AppHandle) {
    let Some(window) = app.get_webview_window(LABEL) else {
        return;
    };
    if window.is_visible().unwrap_or(false) {
        let _ = window.hide();
        return;
    }
    position_window(app, &window);
    let _ = window.show();
    let _ = window.set_focus();
    let _ = window.emit_to(LABEL, "quick-shown", ());
}

/// Called from the panel itself once an item is copied or Escape is pressed.
pub fn hide(app: &AppHandle) {
    if let Some(window) = app.get_webview_window(LABEL) {
        let _ = window.hide();
    }
}

fn position_window(app: &AppHandle, window: &WebviewWindow) {
    let pref = {
        let state = app.state::<AppState>();
        let position = state.settings.lock().unwrap().quick_position.clone();
        position
    };

    let scale = window.scale_factor().unwrap_or(1.0);
    let phys_w = (WIDTH * scale).round() as i32;
    let phys_h = (HEIGHT * scale).round() as i32;

    let target = if pref == "bottom_right" {
        window.primary_monitor().ok().flatten().map(|m| {
            let wa = m.work_area();
            PhysicalPosition {
                x: wa.position.x + wa.size.width as i32 - phys_w - MARGIN,
                y: wa.position.y + wa.size.height as i32 - phys_h - MARGIN,
            }
        })
    } else {
        cursor_position().and_then(|(cx, cy)| {
            let monitor = window
                .monitor_from_point(cx as f64, cy as f64)
                .ok()
                .flatten()
                .or_else(|| window.primary_monitor().ok().flatten())?;
            let wa = monitor.work_area();
            let min_x = wa.position.x;
            let min_y = wa.position.y;
            let max_x = (wa.position.x + wa.size.width as i32 - phys_w).max(min_x);
            let max_y = (wa.position.y + wa.size.height as i32 - phys_h).max(min_y);
            Some(PhysicalPosition {
                x: (cx + 12).clamp(min_x, max_x),
                y: (cy + 12).clamp(min_y, max_y),
            })
        })
    };

    if let Some(pos) = target {
        let _ = window.set_position(Position::Physical(pos));
    }
}

#[cfg(target_os = "windows")]
fn cursor_position() -> Option<(i32, i32)> {
    use windows_sys::Win32::Foundation::POINT;
    use windows_sys::Win32::UI::WindowsAndMessaging::GetCursorPos;
    unsafe {
        let mut point: POINT = std::mem::zeroed();
        if GetCursorPos(&mut point) != 0 {
            Some((point.x, point.y))
        } else {
            None
        }
    }
}

#[cfg(not(target_os = "windows"))]
fn cursor_position() -> Option<(i32, i32)> {
    use mouse_position::mouse_position::Mouse;
    match Mouse::get_mouse_position() {
        Mouse::Position { x, y } => Some((x, y)),
        Mouse::Error => None,
    }
}
