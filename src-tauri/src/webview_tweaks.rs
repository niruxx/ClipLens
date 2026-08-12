//! Windows-only WebView2 behavior tweaks.

/// WebView2 reserves a set of Chromium "browser accelerator" shortcuts
/// (devtools combos like Ctrl+Shift+I/J/C, Ctrl+F, F12, etc.) and swallows
/// them before page JS ever sees the keydown event, even with
/// `preventDefault()`/`stopPropagation()`. That breaks the in-app hotkey
/// recorder for any combo that happens to collide, so turn the feature off
/// entirely - this app has no devtools/browser chrome to preserve anyway.
#[cfg(target_os = "windows")]
pub fn disable_browser_accelerator_keys(window: &tauri::WebviewWindow) {
    use webview2_com::Microsoft::Web::WebView2::Win32::ICoreWebView2Settings3;
    use windows_core::Interface;

    let label = window.label().to_string();
    let result = window.with_webview(move |webview| {
        let outcome: windows_core::Result<()> = (|| unsafe {
            let core = webview.controller().CoreWebView2()?;
            let settings3: ICoreWebView2Settings3 = core.Settings()?.cast()?;
            settings3.SetAreBrowserAcceleratorKeysEnabled(false)
        })();
        if let Err(e) = outcome {
            eprintln!("Failed to disable WebView2 accelerator keys for {label:?}: {e}");
        }
    });
    if let Err(e) = result {
        eprintln!("with_webview failed while disabling accelerator keys: {e}");
    }
}

#[cfg(not(target_os = "windows"))]
pub fn disable_browser_accelerator_keys(_window: &tauri::WebviewWindow) {}
