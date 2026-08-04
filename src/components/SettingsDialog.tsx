import { useEffect, useState } from "react";
import type { Settings, SettingsPatch, ThemeMode } from "../types";
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
  onClearUnpinned: () => void;
  onClearAll: () => void;
}

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

        <div className="flex shrink-0 justify-end border-t border-black/8 px-4 py-2.5 dark:border-white/10">
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
