import { imageSrc } from "../lib/api";
import { humanTime, previewLine } from "../lib/format";
import type { ClipItem } from "../types";
import { CheckIcon, DocIcon, PinIcon, TrashIcon } from "./icons";

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

  const hasImage = isImage && !!item.thumb_path;

  return (
    <div
      onClick={() => onCopy(item.id)}
      className={`tile-elevate group relative aspect-square cursor-pointer overflow-hidden rounded-2xl bg-neutral-100 transition-transform active:scale-[0.97] dark:bg-[#303134] ${
        justCopied ? "animate-copy-ring" : ""
      }`}
    >
      {hasImage ? (
        <img
          src={imageSrc(item.thumb_path!)}
          alt=""
          draggable={false}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full flex-col gap-2 p-4">
          <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 dark:text-neutral-400">
            <DocIcon size={13} />
            <span>{meta}</span>
          </div>
          <p className="line-clamp-[9] flex-1 whitespace-pre-wrap break-words text-[13px] leading-relaxed text-neutral-800 dark:text-neutral-100">
            {previewLine(item.content ?? "")}
          </p>
        </div>
      )}

      {hasImage && (
        <>
          <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/45 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/50 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
          <span className="absolute bottom-2.5 left-3 text-[11px] font-medium text-white opacity-0 drop-shadow transition-opacity group-hover:opacity-100">
            {meta} · {humanTime(item.updated_at)}
          </span>
        </>
      )}

      <button
        type="button"
        title={item.pinned ? "Unpin" : "Pin"}
        onClick={(e) => {
          e.stopPropagation();
          onTogglePin(item.id);
        }}
        className={`absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full transition-opacity ${
          item.pinned
            ? `opacity-100 ${hasImage ? "text-white" : "text-[var(--color-accent)]"}`
            : `opacity-0 group-hover:opacity-100 ${hasImage ? "text-white hover:bg-white/20" : "text-neutral-600 hover:bg-black/8 dark:text-neutral-300 dark:hover:bg-white/10"}`
        }`}
      >
        <PinIcon size={15} filled={item.pinned} />
      </button>

      <button
        type="button"
        title="Delete"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(item.id);
        }}
        className={`absolute bottom-2 right-2 grid h-8 w-8 place-items-center rounded-full opacity-0 transition-opacity group-hover:opacity-100 ${
          hasImage
            ? "text-white hover:bg-white/20"
            : "text-neutral-600 hover:bg-black/8 dark:text-neutral-300 dark:hover:bg-white/10"
        }`}
      >
        <TrashIcon size={15} />
      </button>

      {justCopied && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-[inherit] bg-black/10">
          <div className="animate-copy-pop grid h-12 w-12 place-items-center rounded-full bg-[var(--color-accent)] text-white shadow-lg">
            <CheckIcon size={22} />
          </div>
        </div>
      )}
    </div>
  );
}
