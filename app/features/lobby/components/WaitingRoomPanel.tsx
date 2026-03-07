import type { SocketLobbyState } from "../types";

interface WaitingRoomPanelProps {
  lobbyId: string;
  lobby: SocketLobbyState;
  myPlayerId: string | null;
  isHost: boolean;
  onStartGame: () => void;
}

export function WaitingRoomPanel({
  lobbyId,
  lobby,
  myPlayerId,
  isHost,
  onStartGame,
}: WaitingRoomPanelProps) {
  return (
    <section className="mt-8 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-2)] p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
            Lobby Code
          </p>
          <p className="font-mono text-2xl font-bold tracking-[0.18em] text-[var(--text-strong)] sm:text-3xl sm:tracking-[0.25em]">
            {lobbyId || "------"}
          </p>
        </div>
        <div className="w-fit rounded-full border border-[var(--border-subtle)] bg-[var(--surface-1)] px-3 py-1 text-xs text-[var(--text-muted)]">
          State: {lobby.state}
        </div>
      </div>

      <div className="mt-5">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">Players In Room</h2>
        <ul className="mt-3 space-y-2">
          {lobby.players.length === 0 ? (
            <li className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-1)] px-3 py-2 text-sm text-[var(--text-muted)]">
              Waiting for players...
            </li>
          ) : (
            lobby.players.map((player) => {
              const isPlayerHost = lobby.hostPlayerId === player.id;
              const isMe = myPlayerId === player.id;

              return (
                <li
                  key={player.id}
                  className="flex items-center justify-between rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-1)] px-3 py-2"
                >
                  <span className="pr-2 text-sm text-[var(--text-strong)]">
                    {player.name}
                    {isMe ? " (you)" : ""}
                  </span>
                  {isPlayerHost ? (
                    <span className="rounded bg-[var(--accent-soft)] px-2 py-0.5 text-xs font-semibold text-[var(--accent)]">
                      Host
                    </span>
                  ) : null}
                </li>
              );
            })
          )}
        </ul>
      </div>

      {isHost && lobby.players.length > 1 ? (
        <button
          onClick={onStartGame}
          className="mt-5 min-h-11 w-full rounded-xl bg-[var(--accent)] px-4 py-2.5 font-semibold text-[#0a1712] transition hover:brightness-110"
        >
          Start Game
        </button>
      ) : null}
    </section>
  );
}
