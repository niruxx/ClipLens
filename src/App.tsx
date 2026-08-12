import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ClipCard from "./components/ClipCard";
import EmptyState from "./components/EmptyState";
import Header from "./components/Header";
import ResizeHandles from "./components/ResizeHandles";
import Sidebar from "./components/Sidebar";
import SettingsDialog from "./components/SettingsDialog";
import TitleBar from "./components/TitleBar";
import Toast from "./components/Toast";
import { api, events, warmImagesDir } from "./lib/api";
import { applyTheme, watchSystemTheme } from "./lib/theme";
import type { ClipFilter, ClipItem, Settings, SettingsPatch } from "./types";

const HIDE_FADE_MS = 190;
const QUIT_FADE_MS = 150;

export default function App() {
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(false);
  const [items, setItems] = useState<ClipItem[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ClipFilter>("all");
  const [settings, setSettings] = useState<Settings | null>(null);
  const [seedColorChoices, setSeedColorChoices] = useState<[string, string][]>([]);
  const [autostartLabel, setAutostartLabel] = useState("Start automatically");
  const [autostartEnabled, setAutostartEnabled] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [justCopiedId, setJustCopiedId] = useState<number | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);
  const copyFlashTimer = useRef<number | undefined>(undefined);
  const searchRef = useRef("");
  const settingsRef = useRef<Settings | null>(null);

  const showToast = useCallback((message: string) => {
    window.clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = window.setTimeout(() => setToast(null), 1600);
  }, []);

  const refreshItems = useCallback((query?: string) => {
    const q = query ?? searchRef.current;
    api.listItems(q).then(setItems).catch(() => {});
  }, []);

  const refreshAutostart = useCallback(() => {
    api.isAutostartEnabled().then(setAutostartEnabled).catch(() => {});
  }, []);

  const refreshSettings = useCallback(() => {
    api.getSettings().then((s) => {
      setSettings(s);
      settingsRef.current = s;
      applyTheme(s);
    });
  }, []);

  // -- initial load ------------------------------------------------------------
  useEffect(() => {
    (async () => {
      await warmImagesDir();
      const [s, colors, label] = await Promise.all([
        api.getSettings(),
        api.getSeedColorChoices(),
        api.getAutostartLabel(),
      ]);
      setSettings(s);
      settingsRef.current = s;
      applyTheme(s);
      setSeedColorChoices(colors);
      setAutostartLabel(label);
      refreshAutostart();
      refreshItems("");
      setReady(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
    })();

    return watchSystemTheme(() => settingsRef.current!);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -- event listeners -----------------------------------------------------------
  useEffect(() => {
    const unlistens = [
      events.onHistoryChanged(() => refreshItems()),
      events.onSettingsChanged(() => {
        refreshSettings();
        refreshAutostart();
      }),
      events.onWindowShown(() => setVisible(true)),
      events.onRequestHide(() => {
        setVisible(false);
        window.setTimeout(() => {
          api.hideToTray();
        }, HIDE_FADE_MS);
      }),
      events.onRequestQuit(() => {
        setVisible(false);
        window.setTimeout(() => {
          api.quit();
        }, QUIT_FADE_MS);
      }),
    ];
    return () => {
      unlistens.forEach((p) => p.then((un) => un()));
    };
  }, [refreshItems, refreshSettings, refreshAutostart]);

  const onSearchChange = useCallback(
    (value: string) => {
      setSearch(value);
      searchRef.current = value;
      refreshItems(value);
    },
    [refreshItems],
  );

  const onCopy = useCallback(
    (id: number) => {
      api
        .copyItem(id)
        .then(() => {
          refreshItems();
          showToast("Copied to clipboard");
          window.clearTimeout(copyFlashTimer.current);
          setJustCopiedId(id);
          copyFlashTimer.current = window.setTimeout(
            () => setJustCopiedId((cur) => (cur === id ? null : cur)),
            650,
          );
        })
        .catch(() => showToast("Couldn't copy that item."));
    },
    [refreshItems, showToast],
  );

  const onTogglePin = useCallback(
    (id: number) => {
      api.togglePin(id).then(() => refreshItems());
    },
    [refreshItems],
  );

  const onDelete = useCallback(
    (id: number) => {
      api.deleteItem(id).then(() => refreshItems());
    },
    [refreshItems],
  );

  const onTogglePause = useCallback(() => {
    api.togglePause().then(() => refreshSettings());
  }, [refreshSettings]);

  const onPatchSettings = useCallback(
    (patch: SettingsPatch) => {
      api.updateSettings(patch).then((s) => {
        setSettings(s);
        settingsRef.current = s;
        applyTheme(s);
        if (patch.max_history_items !== undefined) refreshItems();
      });
    },
    [refreshItems],
  );

  const onToggleAutostart = useCallback(
    (enabled: boolean) => {
      api.toggleAutostart(enabled).then((ok) => {
        if (ok) {
          setAutostartEnabled(enabled);
        } else {
          showToast("Couldn't update the startup setting.");
        }
      });
    },
    [showToast],
  );

  const onSetQuickHotkey = useCallback(
    (hotkey: string) =>
      api.setQuickHotkey(hotkey).then(() => {
        refreshSettings();
      }),
    [refreshSettings],
  );

  const onClearUnpinned = useCallback(() => {
    api.clearHistory(true).then(() => {
      refreshItems();
      showToast("Cleared clipboard history");
    });
  }, [refreshItems, showToast]);

  const onClearAll = useCallback(() => {
    api.clearHistory(false).then(() => {
      refreshItems();
      showToast("Cleared everything");
    });
  }, [refreshItems, showToast]);

  const onQuit = useCallback(() => {
    setVisible(false);
    window.setTimeout(() => api.quit(), QUIT_FADE_MS);
  }, []);

  const counts = useMemo(
    () => ({
      all: items.length,
      pinned: items.filter((i) => i.pinned).length,
      text: items.filter((i) => i.type === "text").length,
      image: items.filter((i) => i.type === "image").length,
    }),
    [items],
  );

  const filteredItems = useMemo(() => {
    switch (filter) {
      case "pinned":
        return items.filter((i) => i.pinned);
      case "text":
        return items.filter((i) => i.type === "text");
      case "image":
        return items.filter((i) => i.type === "image");
      default:
        return items;
    }
  }, [items, filter]);

  const emptyCopy = useMemo(() => {
    if (search.trim()) return { title: "No matches", hint: "Try a different search." };
    switch (filter) {
      case "pinned":
        return { title: "No pinned items", hint: "Pin items to keep them handy up here." };
      case "text":
        return { title: "No text clips yet", hint: "Copy some text to get started." };
      case "image":
        return { title: "No image clips yet", hint: "Copy an image to get started." };
      default:
        return { title: "No clipboard history yet", hint: "Copy some text or an image to get started." };
    }
  }, [filter, search]);

  if (!ready || !settings) {
    return <div className="h-screen w-screen bg-white dark:bg-[#1c1c1f]" />;
  }

  return (
    <div
      className={`window-fade flex h-screen w-screen flex-col overflow-hidden bg-white text-neutral-900 dark:bg-[#1c1c1f] dark:text-neutral-100 ${visible ? "opacity-100" : "opacity-0"}`}
    >
      <TitleBar />
      <div className="relative flex flex-1 overflow-hidden">
        <Sidebar filter={filter} onFilterChange={setFilter} counts={counts} />

        <div className="flex flex-1 flex-col overflow-hidden border-l border-black/6 dark:border-white/8">
          <Header
            search={search}
            onSearchChange={onSearchChange}
            paused={settings.monitor_paused}
            onTogglePause={onTogglePause}
            onOpenSettings={() => setSettingsOpen(true)}
            autostartLabel={autostartLabel}
            autostartEnabled={autostartEnabled}
            onToggleAutostart={onToggleAutostart}
            onClearUnpinned={onClearUnpinned}
            onClearAll={onClearAll}
            onQuit={onQuit}
          />

          <div className="scroll-thin flex-1 overflow-y-auto p-5">
            {filteredItems.length === 0 ? (
              <EmptyState title={emptyCopy.title} hint={emptyCopy.hint} />
            ) : (
              <div className="columns-1 gap-4 min-[700px]:columns-2 min-[960px]:columns-3">
                {filteredItems.map((item) => (
                  <ClipCard
                    key={item.id}
                    item={item}
                    justCopied={item.id === justCopiedId}
                    onCopy={onCopy}
                    onTogglePin={onTogglePin}
                    onDelete={onDelete}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {settingsOpen && (
          <SettingsDialog
            settings={settings}
            seedColorChoices={seedColorChoices}
            autostartLabel={autostartLabel}
            autostartEnabled={autostartEnabled}
            onClose={() => setSettingsOpen(false)}
            onPatch={onPatchSettings}
            onToggleAutostart={onToggleAutostart}
            onSetQuickHotkey={onSetQuickHotkey}
            onClearUnpinned={onClearUnpinned}
            onClearAll={onClearAll}
          />
        )}

        <Toast message={toast} />
      </div>
      <ResizeHandles />
    </div>
  );
}
