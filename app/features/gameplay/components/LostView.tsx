import type { SocketLobbyState } from "../../lobby/types";

interface LostViewProps {
  lobby: SocketLobbyState;
  onStartGame: () => void;
  isHost: boolean;
}

export function LostView({ lobby, onStartGame, isHost }: LostViewProps) {
  return (
    <section className="mt-8 rounded-xl border border-rose-300/30 bg-rose-950/20 p-5">
      <h2 className="text-lg font-bold text-rose-200">Defeat</h2>
      <p className="mt-2 text-sm text-rose-100/90">
        Run ended on level {lobby.currentLevel}. Add post-game analysis and retry
        flows in this view as gameplay UX expands.
      </p>
      {isHost && onStartGame && (
        <button
          className="mt-4 rounded bg-rose-300/20 px-4 py-2 text-sm text-rose-200 hover:bg-rose-300/30"
          onClick={onStartGame}
        >
          Start New Game
        </button>
      )}
    </section>
  );
}
