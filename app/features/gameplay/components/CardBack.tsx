interface CardBackProps {
  mini?: boolean;
  className?: string;
}

// The face-down counterpart to CardFace - used for opponents' hands, where the
// value is hidden. `mini` is the size used in the little fans above the table.
export function CardBack({ mini = false, className = "" }: CardBackProps) {
  const size = mini ? "h-11 w-8 rounded-md" : "h-32 w-[5.5rem] rounded-2xl";
  const motif = mini ? "h-4 w-4 rounded-[3px]" : "h-10 w-10 rounded-md";

  return (
    <div
      className={`${size} border border-[#2a3f5c] bg-gradient-to-b from-[#16324a] to-[#0e2136] shadow-[0_4px_12px_rgba(0,0,0,0.4)] ${className}`}
    >
      <div className="flex h-full items-center justify-center">
        <div className={`${motif} rotate-45 border border-[var(--accent)]/40 bg-[var(--accent)]/10`} />
      </div>
    </div>
  );
}
