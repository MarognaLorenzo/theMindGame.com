import { WsMessageHandler } from "../wsMessageHandler.ts";
import { LobbyServer } from "../../index.ts";
import { analyzeAttachment } from "../wsAuthorization.ts";
import { wsSendError, wsSendJoined } from "../wsUtils.ts";

// Player identity (create vs. resume, name-in-use checks) is fully resolved during the HTTP
// upgrade in LobbyServer.fetch()/playerFirstTimeAccess, which attaches the player to the socket
// before it is handed back as a WebSocket response. By the time this JOIN message arrives, the
// attachment should always be present - this handler just issues a fresh resume token and
// confirms the join.
export class JoinPlayerHandler extends WsMessageHandler {
    type: "JOIN" = "JOIN";
    handleMessage = async (ws: WebSocket, lobbyServer: LobbyServer) => {
        await lobbyServer.tokensManager.load();
        const wsAttachment = analyzeAttachment(ws);

        if (!wsAttachment.isValid) {
            wsSendError(ws, "This connection is not associated with a player. Please rejoin the lobby.");
            return;
        }

        lobbyServer.pendingDisconnectionsManager.clearDisconnectDeadlineForPlayer(wsAttachment.playerId!);

        const newUserToken = lobbyServer.tokensManager.assignNewTokenToPlayer(wsAttachment.playerId!);
        await lobbyServer.tokensManager.storeMap();

        wsSendJoined(ws, wsAttachment.playerId!, wsAttachment.playerName!, newUserToken);
        await lobbyServer.saveLobbyState();
        lobbyServer.sendLobbyState();
    };
}
