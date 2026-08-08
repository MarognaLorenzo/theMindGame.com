import { DurableObject } from "cloudflare:workers";
import { addMissingPlayersFromSockets, filterPlayersWithoutSockets, readPlayerAttachment } from "./ws/wsUtils.ts";
import { Responder } from "./api/utils/responder.ts";
import { dispatchWsMessage } from "./ws/wsMessageDispatcher.ts";
import { createEmptyRoom, Room } from "./game/room.ts";
import { ResumeTokenManager } from "./connections/resumeTokens.ts";
import {PendingDisconnectionsManager} from "./connections/pendingDisconnections.ts";

export class LobbyServer extends DurableObject {
  private initialized = false;

  public room: Room = createEmptyRoom();

  public tokensManager = new ResumeTokenManager(this.ctx.storage);
  public pendingDisconnectionsManager = new PendingDisconnectionsManager(this.ctx.storage);

  // As a durable object, this class runtime Lobby might be frozen.
  // To ensure that the lobby state is loaded before any operations, we check if it's initialized.
  // If not, we load the state from storage and reconcile the players with the connected WebSockets.
  // Then we set initialize to true and save the lobby state back to storage.

  public async ensureLoaded() {
    if (this.initialized) {
      return;
    }

    const storedLobby = await this.ctx.storage.get<Room>("lobby-state");
    if (storedLobby) {
      this.room = storedLobby;
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

  async playerFirstTimeAccess(playerName: string, responder: Responder): Promise<Response> {
    await this.ensureLoaded();

    if (this.room.isPlayerNameInUse(playerName)) {
      return responder.respondWithError( "Name already taken.", 400);
    }

    const [clientWs, serverWs] = Object.values(new WebSocketPair());
    this.ctx.acceptWebSocket(serverWs, [playerName]);

    return responder.respondWithWebSocket(clientWs);
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