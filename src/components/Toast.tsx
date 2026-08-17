export default function Toast({ message }: { message: string | null }) {
  return (
    <div
      className={`pointer-events-none absolute bottom-6 left-6 z-50 rounded-lg bg-[#323232] px-4 py-3 text-[13px] font-medium text-white shadow-[0_3px_5px_-1px_rgba(0,0,0,0.2),0_6px_10px_0_rgba(0,0,0,0.14)] ${
        message ? "toast-visible" : "toast-hidden"
      }`}
    >
      {message}
    </div>
  );
}
