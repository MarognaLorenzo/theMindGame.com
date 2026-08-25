import { DurableObject } from "cloudflare:workers";
import { addMissingPlayersFromSockets, filterPlayersWithoutSockets, readPlayerAttachment, writePlayerAttachment } from "./ws/wsUtils.ts";
import { dispatchWsMessage } from "./ws/wsMessageDispatcher.ts";
import { createEmptyRoom, hydrateRoom, Room } from "./game/room.ts";
import { ResumeTokenManager } from "./connections/resumeTokens.ts";
import {PendingDisconnectionsManager} from "./connections/pendingDisconnections.ts";
import { Player } from "./game/player.ts";

export class LobbyServer extends DurableObject {
  private initialized = false;

  public room: Room = createEmptyRoom();

  public tokensManager = new ResumeTokenManager(this.ctx.storage);
  public pendingDisconnectionsManager = new PendingDisconnectionsManager(this.ctx.storage);

  // As a durable object, this class runtime Lobby might be frozen.
  // To ensure that the lobby state is loaded before any operations, we check if it's initialized.
  // If not, we load the state from storage and reconcile the players with the connected WebSockets.
  // Then we set initialize to true and save the lobby state back to storage.

  public async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
     if(url.pathname !== "/api/join") {
      return new Response("Invalid path for LobbyServer fetch", { status: 404 });
    }
    // Fetch is only used for the first time a player joins the lobby, to get the WebSocket connection.
    // Using RPC connection is not possible because web sockets are not serializable and cannot be passed through RPC.
    const playerName = url.searchParams.get("name");
    const resumeToken = url.searchParams.get("resumeToken");
    return this.playerFirstTimeAccess(playerName!, resumeToken);
  }

  public async ensureLoaded() {
    if (this.initialized) {
      return;
    }

    const storedLobby = await this.ctx.storage.get<Room>("lobby-state");
    if (storedLobby) {
      this.room = hydrateRoom(storedLobby);
    }

    this.reconcilePlayersFromSockets();
    this.initialized = true;
    await this.saveLobbyState();
  }

  public async saveLobbyState() {
    await this.ctx.storage.put("lobby-state", this.room);
  }

  // Check if there is a connected WebSocket for the given player ID,
  // excluding the provided WebSocket (if any).
  public hasConnectedSocketForPlayer(
    playerId: string,
    except?: globalThis.WebSocket,
  ): boolean {
    return this.ctx.getWebSockets().some((socket) => {
      if (except && socket === except) {
        return false;
      }

      const attachment = readPlayerAttachment(socket);
      return attachment?.playerId === playerId;
    });
  }

  private reconcilePlayersFromSockets() {
      addMissingPlayersFromSockets(this.room, this.ctx.getWebSockets());
      filterPlayersWithoutSockets(this.room, this.ctx.getWebSockets());
      this.room.restoreHostPlayerId();
  }

  async playerFirstTimeAccess(playerName: string, resumeToken: string | null): Promise<Response> {
    await this.ensureLoaded();
    console.log(`\n\n\nPlayer ${playerName} is trying to join the lobby.\n\n\n`);
    if (!resumeToken && this.room.isPlayerNameInUse(playerName)) {
      console.log(`\n\n\nPlayer name ${playerName} is already taken.\n\n\n`);
      return new Response(JSON.stringify({ error: "Name already taken." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    let thePlayer: Player;

    if (resumeToken) {
      const playerId = this.tokensManager.tryGetPlayerIdFromToken(resumeToken);
      if (!playerId) {
        console.log(`\n\n\nInvalid resume token provided by player ${playerName} - token ${resumeToken} not found.\n\n\n`);
        return new Response(JSON.stringify({ error: "Invalid resume token." }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      const existingPlayer = this.room.tryGetPlayerById(playerId);
      if (!existingPlayer) {
        console.log(`\n\n\nInvalid resume token provided by player ${playerName} - player not found.\n\n\n`);
        return new Response(JSON.stringify({ error: "Invalid resume token." }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Check if the player already has a connected socket
      if (this.hasConnectedSocketForPlayer(existingPlayer.id)) {
        console.log(`\n\n\nPlayer ${playerName} with ID ${existingPlayer.id} is already connected.\n\n\n`);
        this.ctx.getWebSockets().forEach((ws) => {
          if (readPlayerAttachment(ws)?.playerId === existingPlayer.id) {
            ws.close();
          }
        });
      }
      thePlayer = existingPlayer;
    } else {
      thePlayer = this.room.createAddPlayer(playerName);
    }

    const [clientWs, serverWs] = Object.values(new WebSocketPair());
    this.ctx.acceptWebSocket(serverWs, [playerName]);

    console.log(`\n\n\nPlayer ${playerName} is joining the lobby with websocket>: ${clientWs.url}.\n\n\n`);

    writePlayerAttachment(clientWs, {
      playerId: thePlayer.id,
      playerName: thePlayer.name
    });

    const response = new Response(null, { status: 101, webSocket: clientWs });

    this.saveLobbyState();
    return response;
  }

  async webSocketMessage(ws: WebSocket, message: string) {
    await dispatchWsMessage(ws, message, this);
  }

  broadcast(data: object) {
    for (const ws of this.ctx.getWebSockets()) {
      ws.send(JSON.stringify(data));
    }
  }

  sendLobbyState() {
    this.reconcilePlayersFromSockets();
    this.broadcast({
      type: "LOBBY_STATE",
      lobby: this.room.getPayload(),
    });
  }

  async webSocketClose(
    ws: globalThis.WebSocket,
    code: number,
    reason: string,
    wasClean: boolean,
  ) {
    await this.ensureLoaded();

    const leavingPlayerId = readPlayerAttachment(ws)?.playerId;
    if (leavingPlayerId && !this.hasConnectedSocketForPlayer(leavingPlayerId, ws)) {
      await this.pendingDisconnectionsManager.setDisconnectDeadlineForPlayer(leavingPlayerId);
      this.sendLobbyState();
    }
  }

  async alarm() {
    await this.ensureLoaded();

    let didRemovePlayer = false;
    const playersToDisconnect = this.pendingDisconnectionsManager.playersToDisconnect();
    for (const playerId of playersToDisconnect) {
      if (!this.hasConnectedSocketForPlayer(playerId)) {
        this.room.removePlayer(playerId);
        didRemovePlayer = true;
      }
    }

    if (didRemovePlayer) {
      await this.tokensManager.load();
      const isSomeoneRemoved: boolean = this.tokensManager.filterOutEntriesOfPlayersNotInRoom(this.room);

      if (isSomeoneRemoved) {
        await this.tokensManager.storeMap();
      }

      await this.saveLobbyState();
      this.sendLobbyState();
    }
  }
}