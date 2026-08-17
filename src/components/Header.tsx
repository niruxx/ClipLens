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
    <div className="flex shrink-0 items-center gap-3 px-6 py-3.5">
      <div className="relative max-w-xl flex-1">
        <SearchIcon
          size={16}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 dark:text-neutral-400"
        />
        <input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search your clipboard history"
          className="w-full rounded-full border border-transparent bg-[#f1f3f4] py-2.5 pl-11 pr-4 text-[14px] text-neutral-900 outline-none placeholder:text-neutral-500 focus:border-transparent focus:bg-white focus:shadow-[0_1px_2px_0_rgba(60,64,67,0.3),0_1px_3px_1px_rgba(60,64,67,0.15)] dark:bg-[#303134] dark:text-neutral-100 dark:placeholder:text-neutral-400 dark:focus:bg-[#28292c]"
        />
      </div>

      <span className="flex-1" />

      <button
        type="button"
        title={paused ? "Resume monitoring" : "Pause monitoring"}
        onClick={onTogglePause}
        className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-neutral-600 hover:bg-black/6 dark:text-neutral-300 dark:hover:bg-white/10"
      >
        {paused ? <PlayIcon size={17} /> : <PauseIcon size={17} />}
      </button>

      <div className="relative" ref={menuRef}>
        <button
          type="button"
          title="Menu"
          onClick={() => setMenuOpen((v) => !v)}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-neutral-600 hover:bg-black/6 dark:text-neutral-300 dark:hover:bg-white/10"
        >
          <MenuIcon size={17} />
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-[calc(100%+8px)] z-20 w-60 rounded-2xl border border-black/6 bg-white p-2 shadow-[0_2px_6px_2px_rgba(60,64,67,0.15),0_1px_2px_0_rgba(60,64,67,0.3)] dark:border-white/8 dark:bg-[#2d2e30]">
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
              Quit ClipLens
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
      className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[13.5px] hover:bg-black/6 dark:hover:bg-white/10 ${
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
