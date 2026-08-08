import { isHostWs } from "../wsAuthorization.ts";
import { WsMessageHandler } from "../wsMessageHandler.ts";
import { LobbyServer } from "../../index.ts";
import { wsSendError } from "../wsUtils.ts";

export class StartGameHandler extends WsMessageHandler {
    type: "START" = "START";
    handleMessage = async (ws: WebSocket, lobbyServer: LobbyServer) => {
        const isHostResult = isHostWs(ws, lobbyServer.room);
        if (!isHostResult.isValid) {
            wsSendError(ws, isHostResult.errorMessage??"");
            return ;
        }

        if (await lobbyServer.room.startGame()) {
        lobbyServer.broadcast({
            type: "GAME_STARTED",
            players: lobbyServer.room.players.map((p) => ({ id: p.id, name: p.name })),
        });
        await lobbyServer.saveLobbyState();
        await lobbyServer.sendLobbyState();
        return;
        }
    };
}