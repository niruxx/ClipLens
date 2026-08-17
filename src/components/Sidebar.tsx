import type { ReactElement } from "react";
import type { ClipFilter } from "../types";
import { DocIcon, GridIcon, ImageIcon, LogoIcon, PinIcon } from "./icons";

interface SidebarProps {
  filter: ClipFilter;
  onFilterChange: (filter: ClipFilter) => void;
  counts: Record<ClipFilter, number>;
}

const ITEMS: {
  value: ClipFilter;
  label: string;
  icon: (props: { size?: number }) => ReactElement;
}[] = [
  { value: "all", label: "All", icon: GridIcon },
  { value: "pinned", label: "Pinned", icon: (p) => <PinIcon {...p} filled /> },
  { value: "text", label: "Text", icon: DocIcon },
  { value: "image", label: "Images", icon: ImageIcon },
];

export default function Sidebar({ filter, onFilterChange, counts }: SidebarProps) {
  return (
    <div className="flex w-[192px] shrink-0 flex-col bg-black/[0.025] px-3 py-3 dark:bg-white/[0.025]">
      <div className="flex items-center gap-2 px-2 py-2">
        <LogoIcon size={20} className="text-[var(--color-accent)]" />
        <span className="text-[14px] font-semibold text-neutral-900 dark:text-neutral-100">
          ClipLens
        </span>
      </div>

      <nav className="mt-3 flex flex-col gap-0.5">
        {ITEMS.map(({ value, label, icon: Icon }) => {
          const active = filter === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => onFilterChange(value)}
              className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors ${
                active
                  ? "bg-[var(--color-accent-soft)] font-medium text-[var(--color-accent)]"
                  : "text-neutral-600 hover:bg-black/5 dark:text-neutral-300 dark:hover:bg-white/8"
              }`}
            >
              <Icon size={15} />
              <span className="flex-1">{label}</span>
              <span className="text-[11px] text-neutral-400 dark:text-neutral-500">
                {counts[value]}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
