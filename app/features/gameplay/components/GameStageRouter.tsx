import type { SocketLobbyState } from "../../lobby/types";
import { WaitingRoomPanel } from "../../lobby/components/WaitingRoomPanel";
import { LostView } from "./LostView";
import { PlayingView } from "./PlayingView";
import { WonView } from "./WonView";

interface GameStageRouterProps {
  lobbyId: string;
  lobby: SocketLobbyState;
  myPlayerId: string | null;
  isHost: boolean;
  onStartGame: () => void;
  onCardPlay: (card: string) => void;
}

export function GameStageRouter({
  lobbyId,
  lobby,
  myPlayerId,
  isHost,
  onStartGame,
  onCardPlay,
}: GameStageRouterProps) {
  if (lobby.state === "playing") {
    return <PlayingView lobby={lobby} myPlayerId={myPlayerId} onCardPlay={onCardPlay} />;
  }

  if (lobby.state === "won") {
    return <WonView lobby={lobby} />;
  }

  if (lobby.state === "lost") {
    return <LostView lobby={lobby} />;
  }

  return (
    <WaitingRoomPanel
      lobbyId={lobbyId}
      lobby={lobby}
      myPlayerId={myPlayerId}
      isHost={isHost}
      onStartGame={onStartGame}
    />
  );
}
