import type { SocketLobbyState } from "../../lobby/types";

interface LostViewProps {
  lobby: SocketLobbyState;
  onStartGame: () => void;
  isHost: boolean;
}

export function LostView({ lobby, onStartGame, isHost }: LostViewProps) {
  return (
    <section className="mt-8 rounded-2xl border border-[#f08f8f55] bg-[#3f171d22] p-5 sm:p-6">
      <h2 className="text-lg font-semibold text-[#ffc4ca] sm:text-xl">Defeat</h2>
      <p className="mt-2 text-sm text-[#ffb2bc]">
        Run ended on level {lobby.currentLevel}. Regroup and try again.
      </p>
      {isHost && onStartGame && (
        <button
          className="mt-4 min-h-11 w-full rounded-xl border border-[#f08f8f88] bg-[#f08f8f22] px-4 py-2.5 text-sm font-medium text-[#ffd2d8] transition hover:bg-[#f08f8f33] sm:w-auto"
          onClick={onStartGame}
        >
          Start New Game
        </button>
      )}
    </section>
  );
}
