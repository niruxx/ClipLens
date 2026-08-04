//! Persisted user preferences, mirroring the previous Python app's `Settings`.

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

pub const DEFAULT_SEED_COLOR: &str = "#6750A4";

pub const SEED_COLOR_CHOICES: &[(&str, &str)] = &[
    ("Purple", "#6750A4"),
    ("Indigo", "#4F5B93"),
    ("Teal", "#00696D"),
    ("Green", "#3C6939"),
    ("Amber", "#7C5800"),
    ("Rose", "#984061"),
    ("Blue", "#2E5FA3"),
];

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct Settings {
    pub theme_mode: String, // "system" | "light" | "dark"
    pub seed_color: String,
    pub max_history_items: u32,
    pub launch_on_boot: bool,
    pub start_minimized: bool,
    pub monitor_paused: bool,
    pub capture_images: bool,
    pub poll_interval_ms: u64,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            theme_mode: "system".into(),
            seed_color: DEFAULT_SEED_COLOR.into(),
            max_history_items: 300,
            launch_on_boot: false,
            start_minimized: false,
            monitor_paused: false,
            capture_images: true,
            poll_interval_ms: 400,
        }
    }
}

impl Settings {
    pub fn load(path: &Path) -> Self {
        match fs::read_to_string(path) {
            Ok(raw) => serde_json::from_str(&raw).unwrap_or_default(),
            Err(_) => {
                let settings = Self::default();
                settings.save(path);
                settings
            }
        }
    }

    pub fn save(&self, path: &Path) {
        if let Some(parent) = path.parent() {
            let _ = fs::create_dir_all(parent);
        }
        if let Ok(json) = serde_json::to_string_pretty(self) {
            let _ = fs::write(path, json);
        }
    }
}
