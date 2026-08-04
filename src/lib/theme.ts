import type { Settings, ThemeMode } from "../types";

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const n = parseInt(clean, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mix([r, g, b]: [number, number, number], target: number, t: number): string {
  const m = (v: number) => Math.round(v + (target - v) * t);
  return `#${[m(r), m(g), m(b)].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

function rgba([r, g, b]: [number, number, number], a: number): string {
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function readableOn([r, g, b]: [number, number, number]): string {
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  return luminance > 150 ? "#1c1c1e" : "#ffffff";
}

export function resolveMode(mode: ThemeMode): "light" | "dark" {
  if (mode === "light" || mode === "dark") return mode;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** Applies the resolved light/dark class and accent CSS variables to <html>. */
export function applyTheme(settings: Pick<Settings, "theme_mode" | "seed_color">): void {
  const dark = resolveMode(settings.theme_mode) === "dark";
  const root = document.documentElement;
  root.classList.toggle("dark", dark);

  const accentRgb = hexToRgb(settings.seed_color);
  const accent = settings.seed_color;
  const accentHover = mix(accentRgb, dark ? 255 : 0, dark ? 0.08 : 0.12);
  const accentPressed = mix(accentRgb, dark ? 255 : 0, dark ? 0.16 : 0.22);
  const accentOn = readableOn(accentRgb);
  const accentSoft = rgba(accentRgb, dark ? 0.16 : 0.12);

  root.style.setProperty("--color-accent", accent);
  root.style.setProperty("--color-accent-hover", accentHover);
  root.style.setProperty("--color-accent-pressed", accentPressed);
  root.style.setProperty("--color-accent-on", accentOn);
  root.style.setProperty("--color-accent-soft", accentSoft);
}

/** Re-applies the theme whenever the OS light/dark preference changes, but
 * only while the user has picked "system" mode. Returns an unsubscribe fn. */
export function watchSystemTheme(
  getSettings: () => Pick<Settings, "theme_mode" | "seed_color">,
): () => void {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const handler = () => {
    const settings = getSettings();
    if (settings.theme_mode === "system") applyTheme(settings);
  };
  media.addEventListener("change", handler);
  return () => media.removeEventListener("change", handler);
}
