import { isInGame } from "../wsAuthorization.ts";
import { WsMessageHandler } from "../wsMessageDispatcher.ts";
import { LobbyServer } from "../../index.ts";
import { removePlayer } from "../../lobby.ts";
import { readPlayerAttachment, wsSendError } from "../wsUtils.ts";

export class ExitGameHandler extends WsMessageHandler {
    type: "EXIT_GAME" = "EXIT_GAME";
    handleMessage = async (ws: WebSocket, lobbyServer: LobbyServer) => {
        const isPlayerInGameResult = isInGame(ws, lobbyServer.room);
        if (!isPlayerInGameResult.isValid) {
            wsSendError(ws, isPlayerInGameResult.errorMessage??"");
            return;
        }
        
        const playerId = isPlayerInGameResult.playerId!;

        await lobbyServer.clearPendingDisconnect(playerId);
        lobbyServer.room.removePlayer(playerId);

        lobbyServer.tokensManager.load()
        const deleted = lobbyServer.tokensManager.deleteTokenForPlayer(playerId);

        if (deleted) {
            lobbyServer.tokensManager.storeMap();
        }

        if (lobbyServer.room.state === "playing") {
        lobbyServer.room.setRoomForNewGame();

        lobbyServer.broadcast({
            type: "GAME_ABORTED",
            message: "A player exited the game. Returning everyone to home.",
        });
        }

        await lobbyServer.saveLobbyState();
        lobbyServer.sendLobbyState();
    }
}