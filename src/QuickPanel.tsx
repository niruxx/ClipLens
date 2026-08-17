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
    return <div className="h-screen w-screen bg-white dark:bg-[#202124]" />;
  }

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-white text-neutral-900 dark:bg-[#202124] dark:text-neutral-100">
      <div className="relative shrink-0 p-3">
        <SearchIcon
          size={14}
          className="pointer-events-none absolute left-6 top-1/2 -translate-y-1/2 text-neutral-500 dark:text-neutral-400"
        />
        <input
          ref={searchRef}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search your clipboard"
          className="w-full rounded-full border border-transparent bg-[#f1f3f4] py-2 pl-9 pr-3 text-[13px] text-neutral-900 outline-none placeholder:text-neutral-500 focus:bg-white focus:shadow-[0_1px_2px_0_rgba(60,64,67,0.3),0_1px_3px_1px_rgba(60,64,67,0.15)] dark:bg-[#303134] dark:text-neutral-100 dark:placeholder:text-neutral-400 dark:focus:bg-[#28292c]"
        />
      </div>

      <div className="scroll-thin flex-1 overflow-y-auto px-2 pb-1.5">
        {items.length === 0 ? (
          <p className="px-3 py-8 text-center text-[12px] text-neutral-400">
            {search.trim() ? "No matches" : "No clipboard history yet"}
          </p>
        ) : (
          items.slice(0, 12).map((item) => <QuickItem key={item.id} item={item} onCopy={onCopy} />)
        )}
      </div>

      <div className="flex shrink-0 items-center justify-between px-4 py-2 text-[11px] text-neutral-400">
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
      className="flex w-full items-center gap-2.5 rounded-2xl px-2.5 py-2 text-left hover:bg-black/6 dark:hover:bg-white/8"
    >
      {isImage && item.thumb_path ? (
        <img
          src={imageSrc(item.thumb_path)}
          alt=""
          draggable={false}
          className="h-10 w-10 shrink-0 rounded-xl object-cover"
        />
      ) : (
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-black/5 text-neutral-500 dark:bg-white/8 dark:text-neutral-400">
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
