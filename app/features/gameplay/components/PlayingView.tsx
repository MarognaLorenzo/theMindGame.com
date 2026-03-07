import type { SocketLobbyState } from "../../lobby/types";

interface PlayingViewProps {
  lobby: SocketLobbyState;
}

export function PlayingView({ lobby }: PlayingViewProps) {
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
    </section>
  );
}
