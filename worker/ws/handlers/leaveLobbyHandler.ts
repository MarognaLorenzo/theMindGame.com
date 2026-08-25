import { isInGame } from "../wsAuthorization.ts";
import { WsMessageHandler } from "../wsMessageHandler.ts";
import { LobbyServer } from "../../index.ts";
import { wsSendError } from "../wsUtils.ts";

export class LeaveLobbyHandler extends WsMessageHandler {
    type: "LEAVE_LOBBY" = "LEAVE_LOBBY";
    handleMessage = async (ws: WebSocket, lobbyServer: LobbyServer) => {
        const isPlayerInGameResult = isInGame(ws, lobbyServer.room);
        if (!isPlayerInGameResult.isValid) {
            wsSendError(ws, isPlayerInGameResult.errorMessage ?? "");
            return;
        }

        const playerId = isPlayerInGameResult.playerId!;

        lobbyServer.pendingDisconnectionsManager.clearDisconnectDeadlineForPlayer(playerId);
        lobbyServer.room.removePlayer(playerId);

        await lobbyServer.tokensManager.load();
        const deleted = lobbyServer.tokensManager.deleteTokenForPlayer(playerId);
        if (deleted) {
            await lobbyServer.tokensManager.storeMap();
        }

        await lobbyServer.saveLobbyState();
        lobbyServer.sendLobbyState();
        ws.close(1000, "Left lobby");
    }
}
