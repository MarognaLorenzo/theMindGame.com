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
}

export function GameStageRouter({
  lobbyId,
  lobby,
  myPlayerId,
  isHost,
  onStartGame,
}: GameStageRouterProps) {
  if (lobby.state === "playing") {
    return <PlayingView lobby={lobby} />;
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
