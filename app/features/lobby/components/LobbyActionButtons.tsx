interface LobbyActionButtonsProps {
  onCreateLobby: () => void;
  onJoinLobby: () => void;
}

export function LobbyActionButtons({
  onCreateLobby,
  onJoinLobby,
}: LobbyActionButtonsProps) {
  return (
    <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
      <button
        onClick={onCreateLobby}
        className="min-h-11 w-full rounded-xl bg-[var(--accent)] px-4 py-2.5 font-semibold text-[#0a1712] transition hover:brightness-110 sm:w-auto"
      >
        Create Lobby
      </button>
      <button
        onClick={onJoinLobby}
        className="min-h-11 w-full rounded-xl border border-[var(--accent)] px-4 py-2.5 font-semibold text-[var(--accent)] transition hover:bg-[var(--accent-soft)] sm:w-auto"
      >
        Join Lobby
      </button>
    </div>
  );
}
