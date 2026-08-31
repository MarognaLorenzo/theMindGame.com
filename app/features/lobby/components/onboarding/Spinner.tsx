interface SpinnerProps {
  className?: string;
}

// Small inline "working on it" spinner, sized by the caller (defaults to 1em so it tracks
// the surrounding text). Purely decorative — the visible label carries the meaning.
export function Spinner({ className = "h-[1em] w-[1em]" }: SpinnerProps) {
  return (
    <svg
      className={`animate-spin ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="3"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
