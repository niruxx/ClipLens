import { imageSrc } from "../lib/api";
import { humanTime, previewLine } from "../lib/format";
import type { ClipItem } from "../types";
import { CheckIcon, DocIcon, ImageIcon, PinIcon, TrashIcon } from "./icons";

interface ClipCardProps {
  item: ClipItem;
  justCopied?: boolean;
  onCopy: (id: number) => void;
  onTogglePin: (id: number) => void;
  onDelete: (id: number) => void;
}

export default function ClipCard({
  item,
  justCopied = false,
  onCopy,
  onTogglePin,
  onDelete,
}: ClipCardProps) {
  const isImage = item.type === "image";
  const meta = isImage
    ? `${item.width}×${item.height}`
    : `${item.content?.length ?? 0} characters`;

  return (
    <div
      onClick={() => onCopy(item.id)}
      className={`group relative mb-3 inline-block w-full cursor-pointer break-inside-avoid-column rounded-2xl border border-black/6 bg-white px-4 py-3.5 shadow-sm transition-all active:scale-[0.98] hover:-translate-y-0.5 hover:border-black/10 hover:shadow-md dark:border-white/8 dark:bg-white/[0.04] dark:hover:border-white/15 ${
        justCopied ? "animate-copy-ring" : ""
      }`}
    >
      {justCopied && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-[inherit]">
          <div className="animate-copy-pop grid h-11 w-11 place-items-center rounded-full bg-[var(--color-accent)] text-white shadow-lg">
            <CheckIcon size={20} />
          </div>
        </div>
      )}

      <div className="mb-2 flex items-center gap-1.5 text-[11px] text-neutral-500 dark:text-neutral-400">
        {isImage ? <ImageIcon size={13} /> : <DocIcon size={13} />}
        <span>{meta}</span>
        <span className="flex-1" />
        <span>{humanTime(item.updated_at)}</span>
      </div>

      {isImage && item.thumb_path ? (
        <img
          src={imageSrc(item.thumb_path)}
          alt=""
          className="max-h-[280px] w-full rounded-lg object-cover"
          draggable={false}
        />
      ) : (
        <p className="line-clamp-6 whitespace-pre-wrap break-words text-[13px] leading-relaxed text-neutral-800 dark:text-neutral-100">
          {previewLine(item.content ?? "")}
        </p>
      )}

      <div className="mt-2.5 flex items-center justify-end gap-0.5">
        <button
          type="button"
          title={item.pinned ? "Unpin" : "Pin"}
          onClick={(e) => {
            e.stopPropagation();
            onTogglePin(item.id);
          }}
          className={`grid h-7 w-7 place-items-center rounded-md transition-opacity hover:bg-black/8 dark:hover:bg-white/10 ${
            item.pinned
              ? "text-[var(--color-accent)]"
              : "text-neutral-500 opacity-0 group-hover:opacity-100 dark:text-neutral-400"
          }`}
        >
          <PinIcon size={14} filled={item.pinned} />
        </button>
        <button
          type="button"
          title="Delete"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(item.id);
          }}
          className="grid h-7 w-7 place-items-center rounded-md text-neutral-500 opacity-0 transition-opacity hover:bg-black/8 group-hover:opacity-100 dark:text-neutral-400 dark:hover:bg-white/10"
        >
          <TrashIcon size={14} />
        </button>
      </div>
    </div>
  );
}
