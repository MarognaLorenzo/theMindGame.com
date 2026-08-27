export function HeartIcon({ className = "h-5 w-5" }: { className?: string } = {}) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="currentColor">
      <path d="M12 21c-.3 0-.6-.1-.8-.3C7 16.9 4 14.2 4 10.7 4 8.1 6.1 6 8.7 6c1.3 0 2.6.6 3.3 1.6C12.7 6.6 14 6 15.3 6 17.9 6 20 8.1 20 10.7c0 3.5-3 6.2-7.2 10-.2.2-.5.3-.8.3z" />
    </svg>
  );
}

export function ShurikenIcon({ className = "h-5 w-5" }: { className?: string } = {}) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3l2.5 4.5L20 10l-4.5 2L13 21l-2-4.5L4 14l4.5-2L11 3z" />
      <circle cx="12" cy="12" r="1.8" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5.5 19c.7-3 3.2-5 6.5-5s5.8 2 6.5 5" />
    </svg>
  );
}
