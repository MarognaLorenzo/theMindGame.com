import type { SocketLobbyState } from "../../lobby/types";

interface PlayingViewProps {
  lobby: SocketLobbyState;
  myPlayerId: string | null;
  onCardPlay: (card: number) => void;
  onShurikenUse: () => void;
}

export function PlayingView({ lobby, myPlayerId, onCardPlay, onShurikenUse }: PlayingViewProps) {
  return (
    <section className="mt-8 rounded-xl border border-emerald-300/30 bg-emerald-950/20 p-5">
      <h2 className="text-lg font-bold text-emerald-200">Game In Progress</h2>
      <p className="mt-2 text-sm text-emerald-100/90">
        This is the gameplay area. Add turn timeline, cards, and shared actions in
        this folder as the in-game UI evolves.
      </p>

      <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
        <div className="rounded-lg border border-emerald-400/20 bg-slate-900/80 p-3">
          <p className="text-emerald-300">Level</p>
          <p className="mt-1 text-xl font-bold text-emerald-100">
            {lobby.currentLevel}
          </p>
        </div>
        <div className="rounded-lg border border-emerald-400/20 bg-slate-900/80 p-3">
          <p className="text-emerald-300">Lives</p>
          <p className="mt-1 text-xl font-bold text-emerald-100">{lobby.lives}</p>
        </div>
        <div className="rounded-lg border border-emerald-400/20 bg-slate-900/80 p-3">
          <p className="text-emerald-300">Shurikens</p>
          <p className="mt-1 text-xl font-bold text-emerald-100">
            {lobby.shurikens}
          </p>
        </div>
      </div>
        <div className="mt-6">
            <h3 className="text-sm font-semibold text-emerald-300">Your Hand</h3>
            <div className="mt-3 flex gap-2">
                {lobby.players.filter((p) => p.id === myPlayerId)[0]?.hand.map((card) => (
                    <div key={card} className="rounded-lg border border-emerald-400/20 bg-slate-900/80 px-4 py-2 text-xl font-bold text-emerald-100">
                        {card}
                    </div>
                ))}
            </div>
        </div>
        <button
          onClick={() => {
            const myPlayer = lobby.players.find((p) => p.id === myPlayerId);
            if (myPlayer && myPlayer.hand.length > 0) {
              onCardPlay(Math.min(...myPlayer.hand)); // Example: play the first card in hand
            }
          }}
          className="mt-6 rounded border border-emerald-400 px-3 py-2 text-sm text-emerald-200 hover:bg-emerald-500/20"
        >
          Play Lowest Card
        </button>
        <button
          onClick={onShurikenUse}
          className="mt-6 rounded border border-emerald-400 px-3 py-2 text-sm text-emerald-200 hover:bg-emerald-500/20"
        >
          Use Shuriken
        </button>
    </section>
  );
}
