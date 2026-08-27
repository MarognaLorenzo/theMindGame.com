export interface LobbyPlayer {
  id: string;
  name: string;
  hand: number[];
  handSize: number;
}

export interface SocketLobbyState {
  players: LobbyPlayer[];
  hostPlayerId: string | null;
  state: "waiting" | "playing" | "won" | "lost";
  discardPile: number[];
  lives: number;
  shurikens: number;
  currentLevel: number;
  winningLevel: number;
}

export interface SocketJoinedMessage {
  type: "JOINED";
  playerId: string;
  playerName: string;
  resumeToken?: string | null;
}

export interface SocketLobbyStateMessage {
  type: "LOBBY_STATE";
  lobby: SocketLobbyState;
}

export interface SocketErrorMessage {
  type: "ERROR";
  message: string;
}

export interface SocketGameAbortedMessage {
  type: "GAME_ABORTED";
  message: string;
}

// Stats behind the win, mirroring worker/game/room.ts's WinStats.
export interface LeaderboardEligibility {
  token: string;
  expiresAt: number;
  finalSeconds: number;
  livesLostCount: number;
  shurikensUsedCount: number;
  playerCount: number;
}

// Sent once, to every player, the moment the room transitions to "won". Carries
// the single-use token needed to submit this win to the leaderboard.
export interface SocketLeaderboardEligibleMessage extends LeaderboardEligibility {
  type: "LEADERBOARD_ELIGIBLE";
}

export type SocketMessage =
  | SocketJoinedMessage
  | SocketLobbyStateMessage
  | SocketErrorMessage
  | SocketGameAbortedMessage
  | SocketLeaderboardEligibleMessage;

export type ClientMessage =
  | { type: "JOIN" }
  | { type: "START" }
  | { type: "PLAY_CARD"; card: number }
  | { type: "USE_SHURIKEN" }
  | { type: "EXIT_GAME" }
  | { type: "LEAVE_LOBBY" };
