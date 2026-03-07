import type { SocketLobbyState } from "../../lobby/types";

interface WonViewProps {
  lobby: SocketLobbyState;
  isHost: boolean;
  onStartGame?: () => void;
}

export function WonView({ lobby, isHost, onStartGame }: WonViewProps) {
  return (
    <section className="mt-8 rounded-2xl border border-[#f1ba6a55] bg-[#3e2b1422] p-5 sm:p-6">
      <h2 className="text-lg font-semibold text-[#f8d7a3] sm:text-xl">Victory</h2>
      <p className="mt-2 text-sm text-[#f2c98f]">
        Team completed level {lobby.currentLevel}. Clean run.
      </p>
      {isHost && onStartGame && (
        <button
          className="mt-4 min-h-11 w-full rounded-xl border border-[#f1ba6a88] bg-[#f1ba6a22] px-4 py-2.5 text-sm font-medium text-[#ffdcae] transition hover:bg-[#f1ba6a33] sm:w-auto"
          onClick={onStartGame}
        >
          Start New Game
        </button>
      )}
    </section>
  );
}
