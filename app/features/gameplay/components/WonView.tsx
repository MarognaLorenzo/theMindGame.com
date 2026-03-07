import type { SocketLobbyState } from "../../lobby/types";

interface WonViewProps {
  lobby: SocketLobbyState;
  isHost: boolean;
  onStartGame?: () => void;
}

export function WonView({ lobby, isHost, onStartGame }: WonViewProps) {
  return (
    <section className="mt-8 rounded-xl border border-amber-300/30 bg-amber-950/20 p-5">
      <h2 className="text-lg font-bold text-amber-200">Victory</h2>
      <p className="mt-2 text-sm text-amber-100/90">
        Team completed level {lobby.currentLevel}. You can add recap components
        here (best moves, timeline, stats, rematch controls).
      </p>
      {isHost && onStartGame && (
        <button
          className="mt-4 rounded bg-amber-300/20 px-4 py-2 text-sm text-amber-200 hover:bg-amber-300/30"
          onClick={onStartGame}
        >
          Start New Game
        </button>
      )}
    </section>
  );
}
