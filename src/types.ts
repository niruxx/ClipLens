export type ClipKind = "text" | "image";
export type ClipFilter = "all" | "pinned" | "text" | "image";

export interface ClipItem {
  id: number;
  type: ClipKind;
  content: string | null;
  image_path: string | null;
  thumb_path: string | null;
  width: number | null;
  height: number | null;
  content_hash: string;
  pinned: boolean;
  created_at: number;
  updated_at: number;
}

export type ThemeMode = "system" | "light" | "dark";
export type QuickPosition = "cursor" | "bottom_right";
export type BackgroundStyle = "none" | "snow" | "stars" | "rain" | "confetti" | "custom";

export interface Settings {
  theme_mode: ThemeMode;
  seed_color: string;
  max_history_items: number;
  launch_on_boot: boolean;
  start_minimized: boolean;
  monitor_paused: boolean;
  capture_images: boolean;
  poll_interval_ms: number;
  quick_hotkey: string;
  quick_position: QuickPosition;
  background_style: BackgroundStyle;
  background_color: string;
  background_density: number;
  background_speed: number;
}

export interface SettingsPatch {
  theme_mode?: ThemeMode;
  seed_color?: string;
  max_history_items?: number;
  start_minimized?: boolean;
  capture_images?: boolean;
  quick_position?: QuickPosition;
  background_style?: BackgroundStyle;
  background_color?: string;
  background_density?: number;
  background_speed?: number;
}

export type Platform = "windows" | "macos" | "linux" | string;
