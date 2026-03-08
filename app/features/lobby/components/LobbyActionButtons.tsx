interface LobbyActionButtonsProps {
  flow: "create" | "join";
  onFlowChange: (flow: "create" | "join") => void;
  onCreateLobby: () => void;
  onJoinLobby: () => void;
}

export function LobbyActionButtons({
  flow,
  onFlowChange,
  onCreateLobby,
  onJoinLobby,
}: LobbyActionButtonsProps) {
  return (
    <div className="mt-6 space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          onClick={() => onFlowChange("create")}
          className={`min-h-11 w-full rounded-xl border px-4 py-2.5 font-semibold transition sm:w-auto ${
            flow === "create"
              ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
              : "border-[var(--border-subtle)] text-[var(--text-muted)] hover:border-[var(--accent)]"
          }`}
        >
          Create A Lobby
        </button>
        <button
          onClick={() => onFlowChange("join")}
          className={`min-h-11 w-full rounded-xl border px-4 py-2.5 font-semibold transition sm:w-auto ${
            flow === "join"
              ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
              : "border-[var(--border-subtle)] text-[var(--text-muted)] hover:border-[var(--accent)]"
          }`}
        >
          Join Existing Lobby
        </button>
        <button
          onClick={flow === "create" ? onCreateLobby : onJoinLobby}
          className="min-h-11 w-full rounded-xl bg-[var(--accent)] px-4 py-2.5 font-semibold text-[#0a1712] transition hover:brightness-110 sm:w-auto"
        >
          Continue
        </button>
      </div>

    </div>
  );
}
