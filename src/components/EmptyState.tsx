import { EmptyIcon } from "./icons";

export default function EmptyState({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2.5 py-16 text-center text-neutral-400 dark:text-neutral-500">
      <div className="grid h-16 w-16 place-items-center rounded-full bg-black/5 dark:bg-white/8">
        <EmptyIcon size={30} />
      </div>
      <p className="text-[15px] font-medium text-neutral-700 dark:text-neutral-200">{title}</p>
      <p className="text-[13px]">{hint}</p>
    </div>
  );
}
