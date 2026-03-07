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
  return (
    <div className="mt-6 space-y-1 text-sm">
      <p className="text-slate-300">Status: {status}</p>
      {error ? <p className="text-rose-400">Error: {error}</p> : null}
    </div>
  );
}
