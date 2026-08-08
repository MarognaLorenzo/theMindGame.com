import { isHostWs, isInGame, ownsCard } from "./wsAuthorization.ts";
import { LobbyServer } from "../index.ts";
import { removePlayer } from "../lobby.ts";
import { readPlayerAttachment, wsSendError } from "./wsUtils.ts";


abstract class WsMessageHandler {
    abstract type : string;
    abstract handleMessage: (ws: WebSocket, lobbyServer: LobbyServer) => Promise<void>;
}

class JoinPlayerHandler extends WsMessageHandler {
    type: "JOIN" = "JOIN";
    resumeToken?: string;
    constructor(resumeToken?: string) {
        super();
        this.resumeToken = resumeToken;
    }
    handleMessage = async (ws: WebSocket, lobbyServer: LobbyServer) => {
        await lobbyServer.handleJoinLobby(ws, this.resumeToken);
    };
}

class StartGameHandler extends WsMessageHandler {
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

class PlayCardHandler extends WsMessageHandler {
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
        lobbyServer.room.playCard(this.card);
        await lobbyServer.saveLobbyState();
        await lobbyServer.sendLobbyState();
    };
}

class UseShurikenHandler extends WsMessageHandler {
    type: "USE_SHURIKEN" = "USE_SHURIKEN";
    handleMessage = async (ws: WebSocket, lobbyServer: LobbyServer) => {
        const isPlayerInGameResult = isInGame(ws, lobbyServer.room);
        if (!isPlayerInGameResult.isValid) {
            wsSendError(ws, isPlayerInGameResult.errorMessage??"");
            return;
        }
    if (await lobbyServer.room.tryUseShuriken()) {
        await lobbyServer.saveLobbyState();
        await lobbyServer.sendLobbyState();
        await lobbyServer.broadcast({ type: "SHURIKEN_USED" });
    }
    };
}

class ExitGameHandler extends WsMessageHandler {
    type: "EXIT_GAME" = "EXIT_GAME";
    handleMessage = async (ws: WebSocket, lobbyServer: LobbyServer) => {
        const isPlayerInGameResult = isInGame(ws, lobbyServer.room);
        if (!isPlayerInGameResult.isValid) {
            wsSendError(ws, isPlayerInGameResult.errorMessage??"");
            return;
        }
        
        const playerId = readPlayerAttachment(ws)?.playerId??"VerifiedPlayerId"; // This should never happen due to the isInGame check, but TypeScript needs a fallback

        await lobbyServer.clearPendingDisconnect(playerId);
        removePlayer(lobbyServer.room, playerId);

        const resumeTokens = await lobbyServer.loadResumeTokens();
        let tokensChanged = false;
        for (const [token, tokenPlayerId] of Object.entries(resumeTokens)) {
        if (tokenPlayerId !== playerId) {
            continue;
        }
        delete resumeTokens[token];
        tokensChanged = true;
        }

        if (tokensChanged) {
        await lobbyServer.saveResumeTokens(resumeTokens);
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