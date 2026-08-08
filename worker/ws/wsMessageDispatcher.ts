import { LobbyServer } from "../index.ts";
import { JoinPlayerHandler } from "./handlers/joinHandler.ts";
import { StartGameHandler } from "./handlers/startGameHandler.ts";
import { PlayCardHandler } from "./handlers/playCardHandler.ts";
import { UseShurikenHandler } from "./handlers/useShurikenHandler.ts";
import { ExitGameHandler } from "./handlers/exitGameHandler.ts";

export async function dispatchWsMessage(ws: WebSocket, message: string, lobbyServer: LobbyServer) : Promise<void> {
    await lobbyServer.ensureLoaded();

    const data = JSON.parse(message);
    switch (data.type) {
      case "JOIN":
        const joinPlayerHandler = new JoinPlayerHandler(data.resumeToken);
        await joinPlayerHandler.handleMessage(ws, lobbyServer);
        break;
      case "START":
        const startGameHandler = new StartGameHandler();
        await startGameHandler.handleMessage(ws, lobbyServer);
        break;
      case "PLAY_CARD":
        const playCardHandler = new PlayCardHandler(data.card);
        await playCardHandler.handleMessage(ws, lobbyServer);
        break;
      case "USE_SHURIKEN":
        const useShurikenHandler = new UseShurikenHandler();
        await useShurikenHandler.handleMessage(ws, lobbyServer);
        break;
      case "EXIT_GAME":
        const exitGameHandler = new ExitGameHandler();
        await exitGameHandler.handleMessage(ws, lobbyServer);
        break;
      default:
        console.error("Unknown message type");
    }
}