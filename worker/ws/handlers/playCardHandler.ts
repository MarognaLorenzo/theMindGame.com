import { ownsCard } from "../wsAuthorization.ts";
import { WsMessageHandler } from "../wsMessageHandler.ts";
import { LobbyServer } from "../../index.ts";
import { wsSendError } from "../wsUtils.ts";

export class PlayCardHandler extends WsMessageHandler {
    type: "PLAY_CARD" = "PLAY_CARD";
    card: number;
    constructor(card: number) {
        super();
        this.card = card;
    }
    handleMessage = async (ws: WebSocket, lobbyServer: LobbyServer) => {
        const ownsCardResult = ownsCard(ws, lobbyServer.room, this.card);
        if (!ownsCardResult.isValid) {
            wsSendError(ws, ownsCardResult.errorMessage??"");
            return;
        }
        const wasWon = lobbyServer.room.state === "won";
        const wasLost = lobbyServer.room.state === "lost";
        lobbyServer.room.playCard(this.card);
        await lobbyServer.saveLobbyState();
        await lobbyServer.sendLobbyState();

        if (!wasWon && lobbyServer.room.state === "won") {
            await lobbyServer.onGameWon();
        }

        if (!wasLost && lobbyServer.room.state === "lost") {
            lobbyServer.trackEvent("game_lost", {
                playerCount: lobbyServer.room.players.length,
                level: lobbyServer.room.currentLevel,
                livesLostCount: lobbyServer.room.livesLostCount,
            });
        }
    };
}