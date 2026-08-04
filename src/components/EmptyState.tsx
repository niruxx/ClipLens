import { EmptyIcon } from "./icons";

export default function EmptyState({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-1.5 py-16 text-center text-neutral-400 dark:text-neutral-500">
      <EmptyIcon size={38} />
      <p className="text-[14px] font-medium text-neutral-600 dark:text-neutral-300">{title}</p>
      <p className="text-[12px]">{hint}</p>
    </div>
  );
}
