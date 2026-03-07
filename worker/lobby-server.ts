import { DurableObject } from "cloudflare:workers";
import { readPlayerAttachment, writePlayerAttachment } from "./lobby-attachments";
import { reconcilePlayersFromSockets, toLobbyStatePayload } from "./lobby-state";
import {
  addPlayer,
  createInitialLobby,
  playCard,
  removePlayer,
  startGame,
  useShuriken,
} from "./lobby.ts";
import type { Lobby, Player } from "./lobby.ts";

export class LobbyServer extends DurableObject {
  private initialized = false;

  private lobby: Lobby = createInitialLobby();

  private async ensureLoaded() {
    if (this.initialized) {
      return;
    }

    const storedLobby = await this.ctx.storage.get<Lobby>("lobby-state");
    if (storedLobby) {
      this.lobby = storedLobby;
    }

    this.reconcilePlayersFromSockets();
    this.initialized = true;
    await this.saveLobbyState();
  }

  private async saveLobbyState() {
    await this.ctx.storage.put("lobby-state", this.lobby);
  }

  private reconcilePlayersFromSockets() {
    reconcilePlayersFromSockets(this.lobby, this.ctx.getWebSockets());
  }

  async fetch(request: Request): Promise<Response> {
    await this.ensureLoaded();

    const webSocketPair = new WebSocketPair();
    const [client, server] = Object.values(webSocketPair);

    const url = new URL(request.url);
    const playerName = url.searchParams.get("name") || "Anonymous";

    this.ctx.acceptWebSocket(server, [playerName]);

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: string) {
    await this.ensureLoaded();

    const playerName = this.ctx.getTags(ws)?.[0] || "Unknown";
    const data = JSON.parse(message);
    switch (data.type) {
      case "JOIN":
        await this.handleJoinLobby(ws, playerName);
        break;
      case "START":
        this.handleStartGame(ws);
        break;
      case "PLAY_CARD":
        this.handlePlayCard(ws, data.card);
        break;
      case "USE_SHURIKEN":
        this.handleUseShuriken(ws);
        break;
      default:
        console.error("Unknown message type:", data.type);
    }
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
      lobby: toLobbyStatePayload(this.lobby),
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
    if (leavingPlayerId) {
      removePlayer(this.lobby, leavingPlayerId);

      await this.saveLobbyState();
      this.sendLobbyState();
    }

    void code;
    void reason;
    void wasClean;
  }

  async handlePlayCard(ws: WebSocket, playedCard: number) {
    void ws;
    const isAccepted = playCard(this.lobby, playedCard);

    if (isAccepted) {
      await this.saveLobbyState();
      this.sendLobbyState();
    } else {
      this.broadcast({
        type: "LIFE_LOST",
        remainingLives: this.lobby.lives,
        wrongCard: playedCard,
      });
    }
  }

  async handleJoinLobby(ws: WebSocket, playerName: string) {
    const existingAttachment = readPlayerAttachment(ws);
    if (existingAttachment) {
      ws.send(
        JSON.stringify({
          type: "JOINED",
          playerId: existingAttachment.playerId,
          playerName: existingAttachment.playerName,
        }),
      );
      this.sendLobbyState();
      return;
    }

    const newPlayer: Player = addPlayer(this.lobby, playerName);

    writePlayerAttachment(ws, {
      playerId: newPlayer.id,
      playerName: newPlayer.name,
    });


    ws.send(
      JSON.stringify({
        type: "JOINED",
        playerId: newPlayer.id,
        playerName: newPlayer.name,
      }),
    );

    await this.saveLobbyState();
    this.sendLobbyState();
  }

  async handleUseShuriken(ws: WebSocket) {
    void ws;
    const lowestCard = useShuriken(this.lobby);
    if (lowestCard !== null) {
      this.broadcast({
        type: "SHURIKEN_USED",
        remainingShurikens: this.lobby.shurikens,
        cardRemoved: lowestCard,
      });
    }
  }

  handleStartGame(ws: WebSocket) {
    const playerId = readPlayerAttachment(ws)?.playerId;
    if (!playerId || playerId !== this.lobby.hostPlayerId) {
      ws.send(
        JSON.stringify({
          type: "ERROR",
          message: "Only the lobby creator can start the game.",
        }),
      );
      return;
    }

    if (startGame(this.lobby)) {
      this.broadcast({
        type: "GAME_STARTED",
        players: this.lobby.players.map((p) => ({ id: p.id, name: p.name })),
      });
      void this.saveLobbyState();
      this.sendLobbyState();
    }
  }
}