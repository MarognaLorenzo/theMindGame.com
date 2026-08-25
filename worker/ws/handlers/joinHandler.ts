import { WsMessageHandler } from "../wsMessageHandler.ts";
import { LobbyServer } from "../../index.ts";
import { analyzeAttachment } from "../wsAuthorization.ts";
import { writePlayerAttachment, wsSendError, wsSendJoined } from "../wsUtils.ts";
import { Player } from "@/worker/game/player.ts";

export class JoinPlayerHandler extends WsMessageHandler {
    type: "JOIN" = "JOIN";
    resumeToken?: string;
    playerName?: string;
    constructor(resumeToken?: string, playerName?: string) {
        super();
        this.resumeToken = resumeToken;
        this.playerName = playerName;
    }
    handleMessage = async (ws: WebSocket, lobbyServer: LobbyServer) => {
        await lobbyServer.tokensManager.load();
        const wsAttachment = analyzeAttachment(ws);

        // If the joining player already has a valid attachment, it means they are reconnecting and we can send them the JOINED message directly.
        if (wsAttachment.isValid) {
        const newUserToken = lobbyServer.tokensManager.assignNewTokenToPlayer(wsAttachment.playerId??"");
        await lobbyServer.tokensManager.storeMap();
        console.log(`socket + attachment\n`);
        wsSendJoined(ws, wsAttachment.playerId!, wsAttachment.playerName!, newUserToken);
        await lobbyServer.saveLobbyState();
        lobbyServer.sendLobbyState();
        return;
        }

        // Attachment is not valid, so we proceed with the join process.

        // We have a resume token coming with the ws message, so we try to restore the player from the token.
        if (this.resumeToken) {

        // Use resume token to reconstruct the player
        const maybePlayerId: string | null = lobbyServer.tokensManager.tryGetPlayerIdFromToken(this.resumeToken);
        const maybePlayer: Player | undefined = lobbyServer.room.tryGetPlayerById(maybePlayerId);

        if (maybePlayer) {
            // A player was retrieved, if it has another connected socket, we should not allow this new connection to join.
            // If it doesn't have another connected socket, we can restore the player - socket connection with the current socket.

            const playerHasConnectedSocket = lobbyServer.hasConnectedSocketForPlayer(maybePlayer.id, ws);
            if (!playerHasConnectedSocket) {
            // we need to restore the player - socket connection with the current socket
            writePlayerAttachment(ws, {
                playerId: maybePlayer.id,
                playerName: maybePlayer.name,
            });

            lobbyServer.pendingDisconnectionsManager.clearDisconnectDeadlineForPlayer(maybePlayer.id);

            // Initialize the resume token for this player with a new one
            const newUserToken = lobbyServer.tokensManager.assignNewTokenToPlayer(maybePlayer.id);
            await lobbyServer.tokensManager.storeMap();

            wsSendJoined(ws, maybePlayer.id, maybePlayer.name, newUserToken);
            await lobbyServer.saveLobbyState();
            lobbyServer.sendLobbyState();
            return;
            }
            wsSendError(ws, "A player with this resume token is already connected. Reconnect from that session instead.");
            return;
        } else {
            wsSendError(ws, "Invalid resume token. Please join the lobby again.");
            return;
        }
        }
        // no resume token and no attachment, playerName should be passed so that we can create a new player and assign it to the socket.
        if (!this.playerName) {
            wsSendError(ws, "No player name provided. Please join the lobby again.");
            return;
        }

        const createdPlayer = lobbyServer.room.createAddPlayer(this.playerName);
        writePlayerAttachment(ws, {
            playerId: createdPlayer.id,
            playerName: createdPlayer.name,
        });

        const newUserToken = lobbyServer.tokensManager.assignNewTokenToPlayer(createdPlayer.id);
        await lobbyServer.tokensManager.storeMap();
        console.log(`socket + new player: storing token ${newUserToken} for playerId ${createdPlayer.id}\n`);

        wsSendJoined(ws, createdPlayer.id, createdPlayer.name, newUserToken);
        await lobbyServer.saveLobbyState();
        lobbyServer.sendLobbyState();
        return;
    }
};