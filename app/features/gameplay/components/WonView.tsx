import type { SocketLobbyState } from "../../lobby/types";

interface WonViewProps {
  lobby: SocketLobbyState;
}

export function WonView({ lobby }: WonViewProps) {
  return (
    <section className="mt-8 rounded-xl border border-amber-300/30 bg-amber-950/20 p-5">
      <h2 className="text-lg font-bold text-amber-200">Victory</h2>
      <p className="mt-2 text-sm text-amber-100/90">
        Team completed level {lobby.currentLevel}. You can add recap components
        here (best moves, timeline, stats, rematch controls).
      </p>
    </section>
  );
}
