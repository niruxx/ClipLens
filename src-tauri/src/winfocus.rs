//! Windows-only: force our window to the real OS foreground.
//!
//! Windows blocks background processes from stealing focus outright (the
//! "foreground lock timeout"). Tapping Alt resets that lock for the calling
//! process - a standard workaround - after which SetForegroundWindow works.

#[cfg(target_os = "windows")]
pub fn force_foreground(hwnd: isize) {
    use windows_sys::Win32::Foundation::HWND;
    use windows_sys::Win32::UI::Input::KeyboardAndMouse::{keybd_event, KEYEVENTF_KEYUP, VK_MENU};
    use windows_sys::Win32::UI::WindowsAndMessaging::{
        IsIconic, SetForegroundWindow, ShowWindow, SW_RESTORE,
    };

    unsafe {
        let hwnd = hwnd as HWND;
        keybd_event(VK_MENU as u8, 0, 0, 0);
        keybd_event(VK_MENU as u8, 0, KEYEVENTF_KEYUP, 0);
        if IsIconic(hwnd) != 0 {
            ShowWindow(hwnd, SW_RESTORE);
        }
        SetForegroundWindow(hwnd);
    }
}

#[cfg(not(target_os = "windows"))]
pub fn force_foreground(_hwnd: isize) {}

/// WebView2 occasionally comes up (or comes back from hidden) fully
/// un-painted - the frame is there but nothing inside it is drawn until an
/// actual input event reaches the webview control. A real click reliably
/// fixes it, so this synthesizes one over the window's center: it nudges the
/// cursor there, clicks, and puts the cursor back, all fast enough to be
/// unnoticeable.
#[cfg(target_os = "windows")]
pub fn nudge_repaint_via_click(hwnd: isize) {
    use windows_sys::Win32::Foundation::{HWND, POINT, RECT};
    use windows_sys::Win32::Graphics::Gdi::ClientToScreen;
    use windows_sys::Win32::UI::Input::KeyboardAndMouse::{
        SendInput, INPUT, INPUT_MOUSE, MOUSEEVENTF_LEFTDOWN, MOUSEEVENTF_LEFTUP, MOUSEINPUT,
    };
    use windows_sys::Win32::UI::WindowsAndMessaging::{GetClientRect, GetCursorPos, SetCursorPos};

    unsafe {
        let hwnd = hwnd as HWND;
        let mut rect: RECT = std::mem::zeroed();
        if GetClientRect(hwnd, &mut rect) == 0 {
            return;
        }
        let mut point = POINT {
            x: (rect.right - rect.left) / 2,
            y: (rect.bottom - rect.top) / 2,
        };
        if ClientToScreen(hwnd, &mut point) == 0 {
            return;
        }

        let mut original: POINT = std::mem::zeroed();
        let had_original = GetCursorPos(&mut original) != 0;

        SetCursorPos(point.x, point.y);

        let mut inputs: [INPUT; 2] = std::mem::zeroed();
        for (i, flags) in [MOUSEEVENTF_LEFTDOWN, MOUSEEVENTF_LEFTUP].into_iter().enumerate() {
            inputs[i].r#type = INPUT_MOUSE;
            inputs[i].Anonymous.mi = MOUSEINPUT {
                dx: 0,
                dy: 0,
                mouseData: 0,
                dwFlags: flags,
                time: 0,
                dwExtraInfo: 0,
            };
        }
        SendInput(
            inputs.len() as u32,
            inputs.as_ptr(),
            std::mem::size_of::<INPUT>() as i32,
        );

        if had_original {
            SetCursorPos(original.x, original.y);
        }
    }
}

#[cfg(not(target_os = "windows"))]
pub fn nudge_repaint_via_click(_hwnd: isize) {}
