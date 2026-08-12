import { useCallback, useEffect, useRef, useState } from "react";
import { DocIcon, ImageIcon, PinIcon, SearchIcon } from "./components/icons";
import { api, events, imageSrc, warmImagesDir } from "./lib/api";
import { humanTime, previewLine } from "./lib/format";
import { applyTheme } from "./lib/theme";
import type { ClipItem, Settings } from "./types";

/** The compact popup toggled by the global quick-access hotkey - list only,
 * click an item to copy it and dismiss. Full management (pin/delete/search
 * filters) stays in the main window. */
export default function QuickPanel() {
  const [items, setItems] = useState<ClipItem[]>([]);
  const [search, setSearch] = useState("");
  const [ready, setReady] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const refreshItems = useCallback((query: string) => {
    api.listItems(query).then(setItems).catch(() => {});
  }, []);

  const applySettings = useCallback((s: Settings) => {
    applyTheme(s);
  }, []);

  const reset = useCallback(() => {
    setSearch("");
    refreshItems("");
    api.getSettings().then(applySettings);
    requestAnimationFrame(() => searchRef.current?.focus());
  }, [refreshItems, applySettings]);

  useEffect(() => {
    (async () => {
      await warmImagesDir();
      const s = await api.getSettings();
      applySettings(s);
      refreshItems("");
      setReady(true);
      requestAnimationFrame(() => searchRef.current?.focus());
    })();
  }, [refreshItems, applySettings]);

  useEffect(() => {
    const unlistens = [
      events.onQuickShown(reset),
      events.onHistoryChanged(() => refreshItems(search)),
      events.onSettingsChanged(() => api.getSettings().then(applySettings)),
    ];
    return () => {
      unlistens.forEach((p) => p.then((un) => un()));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshItems, applySettings, search]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") api.hideQuickWindow();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const onSearchChange = (value: string) => {
    setSearch(value);
    refreshItems(value);
  };

  const onCopy = (id: number) => {
    api
      .copyItem(id)
      .then(() => api.hideQuickWindow())
      .catch(() => {});
  };

  if (!ready) {
    return <div className="h-screen w-screen bg-white dark:bg-[#1c1c1f]" />;
  }

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-white text-neutral-900 dark:bg-[#1c1c1f] dark:text-neutral-100">
      <div className="relative shrink-0 border-b border-black/6 p-2.5 dark:border-white/8">
        <SearchIcon
          size={14}
          className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-neutral-400"
        />
        <input
          ref={searchRef}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search history"
          className="w-full rounded-lg border border-transparent bg-black/5 py-1.5 pl-8 pr-2.5 text-[13px] text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-[var(--color-accent)] focus:bg-white dark:bg-white/8 dark:text-neutral-100 dark:focus:bg-neutral-900"
        />
      </div>

      <div className="scroll-thin flex-1 overflow-y-auto p-1.5">
        {items.length === 0 ? (
          <p className="px-3 py-8 text-center text-[12px] text-neutral-400">
            {search.trim() ? "No matches" : "No clipboard history yet"}
          </p>
        ) : (
          items.slice(0, 12).map((item) => <QuickItem key={item.id} item={item} onCopy={onCopy} />)
        )}
      </div>

      <div className="flex shrink-0 items-center justify-between border-t border-black/6 px-3 py-1.5 text-[11px] text-neutral-400 dark:border-white/8">
        <span>{items.length} item{items.length === 1 ? "" : "s"}</span>
        <span>Esc to close</span>
      </div>
    </div>
  );
}

function QuickItem({ item, onCopy }: { item: ClipItem; onCopy: (id: number) => void }) {
  const isImage = item.type === "image";
  return (
    <button
      type="button"
      onClick={() => onCopy(item.id)}
      className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left hover:bg-black/6 dark:hover:bg-white/8"
    >
      {isImage && item.thumb_path ? (
        <img
          src={imageSrc(item.thumb_path)}
          alt=""
          draggable={false}
          className="h-9 w-9 shrink-0 rounded-md object-cover"
        />
      ) : (
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-black/5 text-neutral-500 dark:bg-white/8 dark:text-neutral-400">
          {isImage ? <ImageIcon size={15} /> : <DocIcon size={15} />}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12.5px] text-neutral-800 dark:text-neutral-100">
          {isImage ? `${item.width}×${item.height} image` : previewLine(item.content ?? "", 90)}
        </p>
        <p className="text-[10.5px] text-neutral-400">{humanTime(item.updated_at)}</p>
      </div>
      {item.pinned && (
        <PinIcon size={12} filled className="shrink-0 text-[var(--color-accent)]" />
      )}
    </button>
  );
}
