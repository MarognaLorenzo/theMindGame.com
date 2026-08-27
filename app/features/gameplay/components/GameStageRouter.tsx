import type { LeaderboardSubmitStatus } from "../../lobby/hooks/useLobbyClient";
import type { LeaderboardEligibility, SocketLobbyState } from "../../lobby/types";
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
  onExitGame: () => void;
  onCardPlay: (card: number) => void;
  onShurikenUse: () => void;
  leaderboardEligibility: LeaderboardEligibility | null;
  leaderboardSubmitStatus: LeaderboardSubmitStatus;
  leaderboardSubmitError: string;
  onSubmitLeaderboardEntry: (teamName: string, countryCode: string) => void;
}

export function GameStageRouter({
  lobbyId,
  lobby,
  myPlayerId,
  isHost,
  onStartGame,
  onExitGame,
  onCardPlay,
  onShurikenUse,
  leaderboardEligibility,
  leaderboardSubmitStatus,
  leaderboardSubmitError,
  onSubmitLeaderboardEntry,
}: GameStageRouterProps) {
  if (lobby.state === "playing") {
    return (
      <PlayingView
        lobby={lobby}
        myPlayerId={myPlayerId}
        onExitGame={onExitGame}
        onCardPlay={onCardPlay}
        onShurikenUse={onShurikenUse}
      />
    );
  }

  if (lobby.state === "won") {
    return (
      <WonView
        lobby={lobby}
        isHost={isHost}
        onStartGame={onStartGame}
        leaderboardEligibility={leaderboardEligibility}
        leaderboardSubmitStatus={leaderboardSubmitStatus}
        leaderboardSubmitError={leaderboardSubmitError}
        onSubmitLeaderboardEntry={onSubmitLeaderboardEntry}
      />
    );
  }

  if (lobby.state === "lost") {
    return <LostView lobby={lobby} isHost={isHost} onStartGame={onStartGame}/>;
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
