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

export interface Settings {
  theme_mode: ThemeMode;
  seed_color: string;
  max_history_items: number;
  launch_on_boot: boolean;
  start_minimized: boolean;
  monitor_paused: boolean;
  capture_images: boolean;
  poll_interval_ms: number;
}

export interface SettingsPatch {
  theme_mode?: ThemeMode;
  seed_color?: string;
  max_history_items?: number;
  start_minimized?: boolean;
  capture_images?: boolean;
}

export type Platform = "windows" | "macos" | "linux" | string;
