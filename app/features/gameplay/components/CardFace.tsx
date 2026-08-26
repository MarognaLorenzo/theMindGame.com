export const CARD_SURFACE_CLASSES =
  "h-32 w-[5.5rem] rounded-2xl border border-[#d8d2bf] bg-gradient-to-b from-[#fffef8] to-[#efe8d7] text-slate-900 shadow-[0_8px_22px_rgba(0,0,0,0.35)]";

export function CardFace({ value }: { value: number }) {
  return (
    <div className="flex h-full flex-col items-center justify-between p-3">
      <span className="self-start text-xs font-semibold text-slate-500">TM</span>
      <span className="text-3xl font-semibold">{value}</span>
      <span className="self-end text-xs font-semibold text-slate-500">TM</span>
    </div>
  );
}
