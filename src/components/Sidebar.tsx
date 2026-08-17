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
    <div className="flex w-[216px] shrink-0 flex-col bg-white px-3 py-4 dark:bg-[#202124]">
      <div className="flex items-center gap-2.5 px-3 py-2">
        <LogoIcon size={26} className="text-[var(--color-accent)]" />
        <span className="text-[19px] font-medium text-neutral-800 dark:text-neutral-100">
          ClipLens
        </span>
      </div>

      <nav className="mt-4 flex flex-col gap-0.5">
        {ITEMS.map(({ value, label, icon: Icon }) => {
          const active = filter === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => onFilterChange(value)}
              className={`flex items-center gap-4 rounded-full px-4 py-2.5 text-left text-[14px] transition-colors ${
                active
                  ? "bg-[var(--color-accent-soft)] font-medium text-[var(--color-accent)]"
                  : "text-neutral-700 hover:bg-black/5 dark:text-neutral-300 dark:hover:bg-white/8"
              }`}
            >
              <Icon size={19} />
              <span className="flex-1">{label}</span>
              <span
                className={`text-[11px] tabular-nums ${active ? "text-[var(--color-accent)]" : "text-neutral-400 dark:text-neutral-500"}`}
              >
                {counts[value]}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
