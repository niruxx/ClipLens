export default function Toast({ message }: { message: string | null }) {
  return (
    <div
      className={`pointer-events-none absolute bottom-5 left-1/2 z-50 rounded-full bg-[#141416]/92 px-4 py-2.5 text-[12px] font-medium text-white shadow-lg ${
        message ? "toast-visible" : "toast-hidden"
      }`}
    >
      {message}
    </div>
  );
}
