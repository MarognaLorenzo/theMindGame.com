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
    <section className="mt-8 rounded-xl border border-cyan-300/20 bg-slate-950/70 p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-400/80">
            Lobby Code
          </p>
          <p className="text-3xl font-black tracking-[0.25em] text-cyan-200">
            {lobbyId || "------"}
          </p>
        </div>
        <div className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">
          State: {lobby.state}
        </div>
      </div>

      <div className="mt-5">
        <h2 className="text-sm font-semibold text-cyan-300">Players In Room</h2>
        <ul className="mt-3 space-y-2">
          {lobby.players.length === 0 ? (
            <li className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-500">
              Waiting for players...
            </li>
          ) : (
            lobby.players.map((player) => {
              const isPlayerHost = lobby.hostPlayerId === player.id;
              const isMe = myPlayerId === player.id;

              return (
                <li
                  key={player.id}
                  className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900 px-3 py-2"
                >
                  <span className="text-sm text-slate-200">
                    {player.name}
                    {isMe ? " (you)" : ""}
                  </span>
                  {isPlayerHost ? (
                    <span className="rounded bg-cyan-500/20 px-2 py-0.5 text-xs font-semibold text-cyan-200">
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
          className="mt-5 w-full rounded-lg bg-emerald-400 px-4 py-2 font-bold text-emerald-950 transition hover:bg-emerald-300"
        >
          Start Game
        </button>
      ) : null}
    </section>
  );
}
