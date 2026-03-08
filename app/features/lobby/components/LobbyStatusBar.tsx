interface LobbyStatusBarProps {
  status: string;
  error: string;
  workerBaseUrl: string;
}

export function LobbyStatusBar({
  status,
  error,
  workerBaseUrl,
}: LobbyStatusBarProps) {
    // return (
    // <div className="mt-6 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-2)] p-3 text-sm">
    //   <p className="text-[var(--text-muted)]">Status: {status}</p>
    //   <p className="mt-1 break-all text-xs text-[var(--text-muted)]/80">Endpoint: {workerBaseUrl}</p>
    //   {error ? <p className="mt-1 text-sm text-[#ff8f8f]">Error: {error}</p> : null}
    // </div>
    // );
    return null;
}
