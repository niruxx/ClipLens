import { getCurrentWindow } from "@tauri-apps/api/window";
import { CloseIcon, MinimizeIcon } from "./icons";

export default function TitleBar() {
  const win = getCurrentWindow();

  return (
    <div
      data-tauri-drag-region
      className="flex h-8 shrink-0 items-center justify-end gap-1 border-b border-black/8 bg-black/[0.015] px-2 dark:border-white/10 dark:bg-white/[0.02]"
    >
      <button
        type="button"
        aria-label="Minimize"
        onClick={() => win.minimize()}
        className="grid h-6 w-6 place-items-center rounded-md text-neutral-500 hover:bg-black/6 dark:text-neutral-400 dark:hover:bg-white/10"
      >
        <MinimizeIcon size={13} />
      </button>
      <button
        type="button"
        aria-label="Close"
        onClick={() => win.close()}
        className="grid h-6 w-6 place-items-center rounded-md text-neutral-500 hover:bg-red-500 hover:text-white dark:text-neutral-400"
      >
        <CloseIcon size={13} />
      </button>
    </div>
  );
}
