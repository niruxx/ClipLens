import { useEffect, useRef, useState } from "react";
import { MenuIcon, PauseIcon, PlayIcon, SearchIcon } from "./icons";

interface HeaderProps {
  search: string;
  onSearchChange: (value: string) => void;
  paused: boolean;
  onTogglePause: () => void;
  onOpenSettings: () => void;
  autostartLabel: string;
  autostartEnabled: boolean;
  onToggleAutostart: (enabled: boolean) => void;
  onClearUnpinned: () => void;
  onClearAll: () => void;
  onQuit: () => void;
}

export default function Header({
  search,
  onSearchChange,
  paused,
  onTogglePause,
  onOpenSettings,
  autostartLabel,
  autostartEnabled,
  onToggleAutostart,
  onClearUnpinned,
  onClearAll,
  onQuit,
}: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const runAndClose = (fn: () => void) => () => {
    setMenuOpen(false);
    fn();
  };

  return (
    <div className="flex shrink-0 items-center gap-2 border-b border-black/6 px-5 py-3 dark:border-white/8">
      <div className="relative flex-1 max-w-md">
        <SearchIcon
          size={15}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
        />
        <input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search history"
          className="w-full rounded-xl border border-transparent bg-black/5 py-2 pl-9 pr-3 text-[13px] text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-[var(--color-accent)] focus:bg-white dark:bg-white/8 dark:text-neutral-100 dark:focus:bg-neutral-900"
        />
      </div>

      <span className="flex-1" />

      <button
        type="button"
        title={paused ? "Resume monitoring" : "Pause monitoring"}
        onClick={onTogglePause}
        className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-neutral-600 hover:bg-black/6 dark:text-neutral-300 dark:hover:bg-white/10"
      >
        {paused ? <PlayIcon size={16} /> : <PauseIcon size={16} />}
      </button>

      <div className="relative" ref={menuRef}>
        <button
          type="button"
          title="Menu"
          onClick={() => setMenuOpen((v) => !v)}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-neutral-600 hover:bg-black/6 dark:text-neutral-300 dark:hover:bg-white/10"
        >
          <MenuIcon size={16} />
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-[calc(100%+6px)] z-20 w-56 rounded-xl border border-black/8 bg-white p-1.5 shadow-lg dark:border-white/10 dark:bg-[#232327]">
            <MenuButton onClick={runAndClose(onOpenSettings)}>Settings…</MenuButton>
            <MenuSeparator />
            <MenuButton
              onClick={runAndClose(() => onToggleAutostart(!autostartEnabled))}
              checked={autostartEnabled}
            >
              {autostartLabel}
            </MenuButton>
            <MenuSeparator />
            <MenuButton onClick={runAndClose(onClearUnpinned)}>Clear unpinned</MenuButton>
            <MenuButton onClick={runAndClose(onClearAll)}>Clear everything</MenuButton>
            <MenuSeparator />
            <MenuButton onClick={runAndClose(onQuit)} destructive>
              Quit CrossClip
            </MenuButton>
          </div>
        )}
      </div>
    </div>
  );
}

function MenuButton({
  children,
  onClick,
  checked,
  destructive,
}: {
  children: React.ReactNode;
  onClick: () => void;
  checked?: boolean;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-[13px] hover:bg-black/6 dark:hover:bg-white/10 ${
        destructive ? "text-red-500" : "text-neutral-800 dark:text-neutral-100"
      }`}
    >
      <span>{children}</span>
      {checked !== undefined && (
        <span
          className={`h-1.5 w-1.5 rounded-full ${checked ? "bg-[var(--color-accent)]" : "bg-transparent"}`}
        />
      )}
    </button>
  );
}

function MenuSeparator() {
  return <div className="my-1 h-px bg-black/8 dark:bg-white/10" />;
}
