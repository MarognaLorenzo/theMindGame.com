import { isInGame } from "../wsAuthorization.ts";
import { WsMessageHandler } from "../wsMessageDispatcher.ts";
import { LobbyServer } from "../../index.ts";
import { wsSendError } from "../wsUtils.ts";

export class UseShurikenHandler extends WsMessageHandler {
    type: "USE_SHURIKEN" = "USE_SHURIKEN";
    handleMessage = async (ws: WebSocket, lobbyServer: LobbyServer) => {
        const isPlayerInGameResult = isInGame(ws, lobbyServer.room);
        if (!isPlayerInGameResult.isValid) {
            wsSendError(ws, isPlayerInGameResult.errorMessage??"");
            return;
        }
    if (await lobbyServer.room.tryUseShuriken()) {
        await lobbyServer.saveLobbyState();
        lobbyServer.sendLobbyState();
        await lobbyServer.broadcast({ type: "SHURIKEN_USED" });
    }
    };
}