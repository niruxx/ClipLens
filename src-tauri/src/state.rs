use crate::settings::Settings;
use rusqlite::Connection;
use std::path::PathBuf;
use std::sync::Mutex;

pub struct AppState {
    pub conn: Mutex<Connection>,
    pub settings: Mutex<Settings>,
    pub settings_path: PathBuf,
    pub images_dir: PathBuf,
    pub last_text_hash: Mutex<Option<String>>,
    pub last_image_hash: Mutex<Option<String>>,
    /// Set once the first-run "still running in the tray" hint has been shown.
    pub tray_hint_shown: Mutex<bool>,
}

impl AppState {
    pub fn save_settings(&self) {
        let settings = self.settings.lock().unwrap();
        settings.save(&self.settings_path);
    }
}
