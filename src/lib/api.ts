import { invoke, convertFileSrc } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type { ClipItem, Platform, Settings, SettingsPatch } from "../types";

export const api = {
  listItems: (search: string) => invoke<ClipItem[]>("list_items", { search }),
  togglePin: (id: number) => invoke<void>("toggle_pin", { id }),
  deleteItem: (id: number) => invoke<void>("delete_item", { id }),
  copyItem: (id: number) => invoke<void>("copy_item", { id }),
  clearHistory: (keepPinned: boolean) =>
    invoke<void>("clear_history", { keepPinned }),

  getSettings: () => invoke<Settings>("get_settings"),
  updateSettings: (patch: SettingsPatch) =>
    invoke<Settings>("update_settings", { patch }),

  togglePause: () => invoke<void>("toggle_pause"),
  toggleAutostart: (enabled: boolean) =>
    invoke<boolean>("toggle_autostart", { enabled }),
  isAutostartEnabled: () => invoke<boolean>("is_autostart_enabled"),

  getPlatform: () => invoke<Platform>("get_platform"),
  getImagesDir: () => invoke<string>("get_images_dir"),
  getSeedColorChoices: () => invoke<[string, string][]>("get_seed_color_choices"),
  getAutostartLabel: () => invoke<string>("get_autostart_label"),

  hideToTray: () => invoke<void>("hide_to_tray"),
  quit: () => invoke<void>("quit_app"),
};

let cachedImagesDir: string | null = null;

/** Call once at startup, before rendering any image cards. */
export async function warmImagesDir(): Promise<void> {
  cachedImagesDir ??= await api.getImagesDir();
}

/** Builds an `asset://` URL for a relative image/thumb filename via the
 * scoped asset protocol configured in tauri.conf.json. Requires
 * `warmImagesDir()` to have resolved first. */
export function imageSrc(relativeFilename: string): string {
  if (cachedImagesDir === null) return "";
  return convertFileSrc(`${cachedImagesDir}/${relativeFilename}`, "asset");
}

export const events = {
  onHistoryChanged: (cb: () => void): Promise<UnlistenFn> =>
    listen("history-changed", cb),
  onSettingsChanged: (cb: () => void): Promise<UnlistenFn> =>
    listen("settings-changed", cb),
  onRequestHide: (cb: () => void): Promise<UnlistenFn> =>
    listen("request-hide", cb),
  onRequestQuit: (cb: () => void): Promise<UnlistenFn> =>
    listen("request-quit", cb),
  onWindowShown: (cb: () => void): Promise<UnlistenFn> =>
    listen("window-shown", cb),
};
