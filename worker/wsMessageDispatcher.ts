import { useShuriken } from "./game/wsEvents/usedShuriken.ts";
import { LobbyServer } from "./index.ts";
import { readPlayerAttachment } from "./wsAttachmentUtils.ts";

interface JoinPayload {
  type: "JOIN";
  resumeToken?: string;
}

interface StartPayload {
  type: "START";
}

interface PlayCardPayload {
  type: "PLAY_CARD";
  card: number;
}

interface UseShurikenPayload {
  type: "USE_SHURIKEN";
}

interface ExitGamePayload {
  type: "EXIT_GAME";
}

type ClientMessage =
  | JoinPayload
  | StartPayload
  | PlayCardPayload
  | UseShurikenPayload
  | ExitGamePayload;

export async function dispatchWsMessage(ws: WebSocket, message: string, lobbyServer: LobbyServer) : Promise<void> {
    await lobbyServer.ensureLoaded();

    const playerName = readPlayerAttachment(ws)?.playerName || "Anonymous";
    const data = JSON.parse(message) as ClientMessage;
    switch (data.type) {
      case "JOIN":
        await lobbyServer.handleJoinLobby(ws, playerName, data.resumeToken);
        break;
      case "START":
        await lobbyServer.handleStartGame(ws);
        break;
      case "PLAY_CARD":
        await lobbyServer.handlePlayCard(ws, data.card);
        break;
      case "USE_SHURIKEN":
        await useShuriken(lobbyServer);
        break;
      case "EXIT_GAME":
        await lobbyServer.handleExitGame(ws);
        break;
      default:
        console.error("Unknown message type");
    }
}