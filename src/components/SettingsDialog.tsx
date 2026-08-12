import { useEffect, useState } from "react";
import type { BackgroundStyle, QuickPosition, Settings, SettingsPatch, ThemeMode } from "../types";
import { CloseIcon, TrashIcon } from "./icons";

const TRANSITION_MS = 180;

interface SettingsDialogProps {
  settings: Settings;
  seedColorChoices: [string, string][];
  autostartLabel: string;
  autostartEnabled: boolean;
  onClose: () => void;
  onPatch: (patch: SettingsPatch) => void;
  onToggleAutostart: (enabled: boolean) => void;
  onSetQuickHotkey: (hotkey: string) => Promise<void>;
  onClearUnpinned: () => void;
  onClearAll: () => void;
}

const QUICK_POSITIONS: { value: QuickPosition; label: string }[] = [
  { value: "cursor", label: "Near cursor" },
  { value: "bottom_right", label: "Bottom right" },
];

const BACKGROUND_STYLES: { value: BackgroundStyle; label: string }[] = [
  { value: "none", label: "None" },
  { value: "snow", label: "Snow" },
  { value: "stars", label: "Stars" },
  { value: "rain", label: "Rain" },
  { value: "confetti", label: "Confetti" },
  { value: "custom", label: "Custom" },
];

const THEME_MODES: { value: ThemeMode; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

export default function SettingsDialog({
  settings,
  seedColorChoices,
  autostartLabel,
  autostartEnabled,
  onClose,
  onPatch,
  onToggleAutostart,
  onSetQuickHotkey,
  onClearUnpinned,
  onClearAll,
}: SettingsDialogProps) {
  const [maxItems, setMaxItems] = useState(settings.max_history_items);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const requestClose = () => {
    setVisible(false);
    window.setTimeout(onClose, TRANSITION_MS);
  };

  return (
    <div
      className={`absolute inset-0 z-40 flex items-center justify-center bg-black/25 p-4 transition-opacity duration-[180ms] ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) requestClose();
      }}
    >
      <div
        className={`flex max-h-full w-full max-w-[380px] flex-col overflow-hidden rounded-2xl border border-black/8 bg-white shadow-2xl transition-all duration-[180ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] dark:border-white/10 dark:bg-[#232327] ${
          visible ? "translate-y-0 scale-100 opacity-100" : "translate-y-2 scale-95 opacity-0"
        }`}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-black/8 px-4 py-3 dark:border-white/10">
          <h2 className="text-[15px] font-semibold text-neutral-900 dark:text-neutral-100">
            Settings
          </h2>
          <button
            type="button"
            onClick={requestClose}
            className="grid h-6 w-6 place-items-center rounded-md text-neutral-500 hover:bg-black/6 dark:text-neutral-400 dark:hover:bg-white/10"
          >
            <CloseIcon size={13} />
          </button>
        </div>

        <div className="scroll-thin flex-1 space-y-3 overflow-y-auto px-4 py-3.5">
          <SectionLabel>Appearance</SectionLabel>
          <div className="flex gap-4">
            {THEME_MODES.map(({ value, label }) => (
              <label
                key={value}
                className="flex cursor-pointer items-center gap-1.5 text-[13px] text-neutral-800 dark:text-neutral-100"
              >
                <input
                  type="radio"
                  name="theme_mode"
                  checked={settings.theme_mode === value}
                  onChange={() => onPatch({ theme_mode: value })}
                  className="accent-[var(--color-accent)]"
                />
                {label}
              </label>
            ))}
          </div>

          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">Accent color</p>
          <div className="flex flex-wrap gap-2.5">
            {seedColorChoices.map(([name, hex]) => (
              <button
                key={hex}
                type="button"
                title={name}
                onClick={() => onPatch({ seed_color: hex })}
                style={{ background: hex }}
                className={`h-7 w-7 rounded-full border-2 ${
                  settings.seed_color.toLowerCase() === hex.toLowerCase()
                    ? "border-neutral-900 dark:border-white"
                    : "border-transparent"
                }`}
              />
            ))}
          </div>

          <Divider />

          <SectionLabel>Background</SectionLabel>
          <div className="grid grid-cols-3 gap-2">
            {BACKGROUND_STYLES.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => onPatch({ background_style: value })}
                className={`rounded-lg border px-2 py-1.5 text-[12.5px] transition-colors ${
                  settings.background_style === value
                    ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
                    : "border-black/10 text-neutral-700 hover:bg-black/5 dark:border-white/15 dark:text-neutral-300 dark:hover:bg-white/8"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {settings.background_style === "custom" && (
            <div className="space-y-2.5 rounded-lg border border-black/8 p-2.5 dark:border-white/10">
              <div className="flex items-center justify-between">
                <p className="text-[12.5px] text-neutral-800 dark:text-neutral-100">
                  Particle color
                </p>
                <input
                  type="color"
                  value={settings.background_color}
                  onChange={(e) => onPatch({ background_color: e.target.value })}
                  className="h-7 w-10 cursor-pointer rounded border border-black/10 bg-transparent dark:border-white/15"
                />
              </div>
              <div>
                <p className="mb-1 text-[12.5px] text-neutral-800 dark:text-neutral-100">
                  Density: {settings.background_density}
                </p>
                <input
                  type="range"
                  min={10}
                  max={150}
                  step={5}
                  value={settings.background_density}
                  onChange={(e) => onPatch({ background_density: Number(e.target.value) })}
                  className="w-full accent-[var(--color-accent)]"
                />
              </div>
              <div>
                <p className="mb-1 text-[12.5px] text-neutral-800 dark:text-neutral-100">
                  Speed: {settings.background_speed.toFixed(1)}x
                </p>
                <input
                  type="range"
                  min={0.3}
                  max={3}
                  step={0.1}
                  value={settings.background_speed}
                  onChange={(e) => onPatch({ background_speed: Number(e.target.value) })}
                  className="w-full accent-[var(--color-accent)]"
                />
              </div>
            </div>
          )}

          <Divider />

          <SectionLabel>History</SectionLabel>
          <p className="text-[13px] text-neutral-800 dark:text-neutral-100">
            Keep up to {maxItems} items
          </p>
          <input
            type="range"
            min={50}
            max={1000}
            step={50}
            value={maxItems}
            onChange={(e) => setMaxItems(Number(e.target.value))}
            onMouseUp={() => onPatch({ max_history_items: maxItems })}
            onTouchEnd={() => onPatch({ max_history_items: maxItems })}
            className="w-full accent-[var(--color-accent)]"
          />

          <label className="flex cursor-pointer items-center gap-2 text-[13px] text-neutral-800 dark:text-neutral-100">
            <input
              type="checkbox"
              checked={settings.capture_images}
              onChange={(e) => onPatch({ capture_images: e.target.checked })}
              className="accent-[var(--color-accent)]"
            />
            Capture images
          </label>

          <div className="flex gap-2 pt-0.5">
            <button
              type="button"
              onClick={onClearUnpinned}
              className="flex items-center gap-1.5 rounded-lg border border-black/10 px-3 py-1.5 text-[12.5px] text-neutral-800 hover:bg-black/5 dark:border-white/15 dark:text-neutral-100 dark:hover:bg-white/8"
            >
              <TrashIcon size={13} />
              Clear unpinned
            </button>
            <button
              type="button"
              onClick={onClearAll}
              className="rounded-lg px-3 py-1.5 text-[12.5px] font-medium text-[var(--color-accent)] hover:bg-black/5 dark:hover:bg-white/8"
            >
              Clear everything
            </button>
          </div>

          <Divider />

          <SectionLabel>Quick Access</SectionLabel>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
            Global shortcut to pop up a mini clipboard picker from anywhere.
          </p>
          <HotkeyRecorder value={settings.quick_hotkey} onChange={onSetQuickHotkey} />
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">Popup position</p>
          <div className="flex gap-2">
            {QUICK_POSITIONS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => onPatch({ quick_position: value })}
                className={`flex-1 rounded-lg border px-3 py-1.5 text-[12.5px] transition-colors ${
                  settings.quick_position === value
                    ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
                    : "border-black/10 text-neutral-700 hover:bg-black/5 dark:border-white/15 dark:text-neutral-300 dark:hover:bg-white/8"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <Divider />

          <SectionLabel>Startup</SectionLabel>
          <label className="flex cursor-pointer items-center gap-2 text-[13px] text-neutral-800 dark:text-neutral-100">
            <input
              type="checkbox"
              checked={autostartEnabled}
              onChange={(e) => onToggleAutostart(e.target.checked)}
              className="accent-[var(--color-accent)]"
            />
            {autostartLabel}
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-[13px] text-neutral-800 dark:text-neutral-100">
            <input
              type="checkbox"
              checked={settings.start_minimized}
              onChange={(e) => onPatch({ start_minimized: e.target.checked })}
              className="accent-[var(--color-accent)]"
            />
            Start minimized to tray
          </label>
        </div>

        <div className="flex shrink-0 items-center justify-between border-t border-black/8 px-4 py-2.5 dark:border-white/10">
          <p className="text-[11px] text-neutral-400 dark:text-neutral-500">- niruxxdaboi -</p>
          <button
            type="button"
            onClick={requestClose}
            className="rounded-lg px-3 py-1.5 text-[13px] font-semibold text-[var(--color-accent)] hover:bg-black/5 dark:hover:bg-white/8"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
      {children}
    </p>
  );
}

function Divider() {
  return <div className="h-px bg-black/8 dark:bg-white/10" />;
}

/** Captures the next key combo pressed while "recording" and hands it up as
 * a hotkey string like "Ctrl+Shift+KeyV" (matches the Rust-side parser's
 * format, which mirrors the web KeyboardEvent.code naming). */
function HotkeyRecorder({
  value,
  onChange,
}: {
  value: string;
  onChange: (hotkey: string) => Promise<void>;
}) {
  const [recording, setRecording] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!recording) return;
    const onKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === "Escape") {
        setRecording(false);
        return;
      }
      const combo = formatKeyCombo(e);
      if (!combo) return;
      setRecording(false);
      setPending(true);
      setError(null);
      onChange(combo)
        .catch((err) => setError(typeof err === "string" ? err : "Couldn't set that shortcut."))
        .finally(() => setPending(false));
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [recording, onChange]);

  return (
    <div className="space-y-1.5">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setError(null);
          setRecording(true);
        }}
        className={`w-full rounded-lg border px-3 py-1.5 text-left text-[13px] transition-colors ${
          recording
            ? "border-[var(--color-accent)] text-[var(--color-accent)]"
            : "border-black/10 text-neutral-800 hover:bg-black/5 dark:border-white/15 dark:text-neutral-100 dark:hover:bg-white/8"
        }`}
      >
        {recording ? "Press a key combination… (Esc to cancel)" : formatHotkeyDisplay(value)}
      </button>
      {recording && (
        <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
          Must include Ctrl or Win.
        </p>
      )}
      {error && <p className="text-[11px] text-red-500">{error}</p>}
    </div>
  );
}

function formatKeyCombo(e: KeyboardEvent): string | null {
  if (["Control", "Shift", "Alt", "Meta"].includes(e.key)) return null;
  // Some synthetic/IME input can leave `code` empty; without it we can't
  // build a valid combo, so just ignore the keystroke rather than send a
  // malformed shortcut to the backend.
  if (!e.code) return null;
  // Require Ctrl or Win/Cmd as the anchor modifier - Alt-only combos are
  // reserved by Windows as menu-mnemonic "system keys" (WM_SYSKEYDOWN),
  // which can misbehave when captured from inside a hosted webview, and
  // Shift-only would swallow a shifted character everywhere.
  if (!e.ctrlKey && !e.metaKey) return null;
  const mods: string[] = [];
  if (e.ctrlKey) mods.push("Ctrl");
  if (e.metaKey) mods.push("Super");
  if (e.altKey) mods.push("Alt");
  if (e.shiftKey) mods.push("Shift");
  return [...mods, e.code].join("+");
}

function formatHotkeyDisplay(combo: string): string {
  return combo
    .split("+")
    .map((token) => {
      if (token === "CmdOrCtrl") return "Ctrl";
      if (token === "Super") return "Win";
      if (token.startsWith("Key")) return token.slice(3);
      if (token.startsWith("Digit")) return token.slice(5);
      return token;
    })
    .join(" + ");
}
