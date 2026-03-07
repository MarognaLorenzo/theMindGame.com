interface LobbyActionButtonsProps {
  onCreateLobby: () => void;
  onJoinLobby: () => void;
  onDisconnect: () => void;
}

export function LobbyActionButtons({
  onCreateLobby,
  onJoinLobby,
  onDisconnect,
}: LobbyActionButtonsProps) {
  return (
    <div className="mt-6 flex flex-col gap-3 sm:flex-row">
      <button
        onClick={onCreateLobby}
        className="rounded-lg bg-cyan-500 px-4 py-2 font-semibold text-slate-950 transition hover:bg-cyan-400"
      >
        Create Lobby
      </button>
      <button
        onClick={onJoinLobby}
        className="rounded-lg border border-cyan-400/60 px-4 py-2 font-semibold text-cyan-300 transition hover:bg-cyan-400/10"
      >
        Join Lobby
      </button>
      <button
        onClick={onDisconnect}
        className="rounded-lg border border-slate-600 px-4 py-2 font-semibold text-slate-300 transition hover:bg-slate-800"
      >
        Disconnect
      </button>
    </div>
  );
}
