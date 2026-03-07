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

export type SocketMessage =
  | SocketJoinedMessage
  | SocketLobbyStateMessage
  | SocketErrorMessage
  | SocketGameAbortedMessage;
