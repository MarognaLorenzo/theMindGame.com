import { DurableObject } from "cloudflare:workers";
import { readPlayerAttachment, writePlayerAttachment } from "./lobby-attachments";
import { reconcilePlayersFromSockets, toLobbyStatePayload } from "./lobby-state";
import {
  addPlayer,
  createInitialLobby,
  playCard,
  removePlayer,
  startGame,
  useShuriken as spendShuriken,
} from "./lobby.ts";
import type { Lobby, Player } from "./lobby.ts";

const DISCONNECT_GRACE_MS = 120_000;
const RESUME_TOKENS_KEY = "resume-tokens";
const PENDING_DISCONNECTS_KEY = "pending-disconnects";

type ResumeTokens = Record<string, string>;
type PendingDisconnects = Record<string, number>;

interface JoinPayload {
  type: "JOIN";
  resumeToken?: string;
}

interface StartPayload {
  type: "START";
}

interface PlayCardPayload {
  type: "PLAY_CARD";
  card: number;
}

interface UseShurikenPayload {
  type: "USE_SHURIKEN";
}

interface ExitGamePayload {
  type: "EXIT_GAME";
}

type ClientMessage =
  | JoinPayload
  | StartPayload
  | PlayCardPayload
  | UseShurikenPayload
  | ExitGamePayload;

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

  private async loadResumeTokens(): Promise<ResumeTokens> {
    return (await this.ctx.storage.get<ResumeTokens>(RESUME_TOKENS_KEY)) ?? {};
  }

  private async saveResumeTokens(tokens: ResumeTokens) {
    await this.ctx.storage.put(RESUME_TOKENS_KEY, tokens);
  }

  private async loadPendingDisconnects(): Promise<PendingDisconnects> {
    return (
      (await this.ctx.storage.get<PendingDisconnects>(PENDING_DISCONNECTS_KEY)) ??
      {}
    );
  }

  private async savePendingDisconnects(pending: PendingDisconnects) {
    await this.ctx.storage.put(PENDING_DISCONNECTS_KEY, pending);
  }

  private hasConnectedSocketForPlayer(
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

  private async scheduleDisconnectRemoval(playerId: string) {
    const pending = await this.loadPendingDisconnects();
    pending[playerId] = Date.now() + DISCONNECT_GRACE_MS;

    await this.savePendingDisconnects(pending);

    const soonestExpiry = Math.min(...Object.values(pending));
    await this.ctx.storage.setAlarm(soonestExpiry);
  }

  private async clearPendingDisconnect(playerId: string) {
    const pending = await this.loadPendingDisconnects();
    if (!(playerId in pending)) {
      return;
    }

    delete pending[playerId];
    await this.savePendingDisconnects(pending);

    const remainingDeadlines = Object.values(pending);
    if (remainingDeadlines.length > 0) {
      await this.ctx.storage.setAlarm(Math.min(...remainingDeadlines));
    } else {
      await this.ctx.storage.deleteAlarm();
    }
  }

  private isSamePlayerName(a: string, b: string): boolean {
    return a.trim().toLowerCase() === b.trim().toLowerCase();
  }

  private findResumeTokenForPlayer(
    tokens: ResumeTokens,
    playerId: string,
  ): string | null {
    return Object.entries(tokens).find(([, id]) => id === playerId)?.[0] ?? null;
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
    const data = JSON.parse(message) as ClientMessage;
    switch (data.type) {
      case "JOIN":
        await this.handleJoinLobby(ws, playerName, data.resumeToken);
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
      case "EXIT_GAME":
        await this.handleExitGame(ws);
        break;
      default:
        console.error("Unknown message type");
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
    if (leavingPlayerId && !this.hasConnectedSocketForPlayer(leavingPlayerId, ws)) {
      await this.scheduleDisconnectRemoval(leavingPlayerId);
      this.sendLobbyState();
    }

    void code;
    void reason;
    void wasClean;
  }

  async alarm() {
    await this.ensureLoaded();

    const now = Date.now();
    const pending = await this.loadPendingDisconnects();
    let didRemovePlayer = false;

    for (const [playerId, expiry] of Object.entries(pending)) {
      if (expiry > now) {
        continue;
      }

      if (!this.hasConnectedSocketForPlayer(playerId)) {
        removePlayer(this.lobby, playerId);
        didRemovePlayer = true;
      }

      delete pending[playerId];
    }

    await this.savePendingDisconnects(pending);

    const remainingDeadlines = Object.values(pending);
    if (remainingDeadlines.length > 0) {
      await this.ctx.storage.setAlarm(Math.min(...remainingDeadlines));
    } else {
      await this.ctx.storage.deleteAlarm();
    }

    if (didRemovePlayer) {
      const resumeTokens = await this.loadResumeTokens();
      let tokensChanged = false;

      for (const [token, tokenPlayerId] of Object.entries(resumeTokens)) {
        if (this.lobby.players.some((player) => player.id === tokenPlayerId)) {
          continue;
        }
        delete resumeTokens[token];
        tokensChanged = true;
      }

      if (tokensChanged) {
        await this.saveResumeTokens(resumeTokens);
      }

      await this.saveLobbyState();
      this.sendLobbyState();
    }
  }

  async handlePlayCard(ws: WebSocket, playedCard: number) {
    void ws;
    const isAccepted = playCard(this.lobby, playedCard);
    if (!isAccepted) {
      // check if game is over:
      if (this.lobby.lives <= 0) {
        this.lobby.state = "lost";
      }
    }
    await this.saveLobbyState();
    this.sendLobbyState();
  }

  async handleJoinLobby(
    ws: WebSocket,
    playerName: string,
    resumeToken?: string,
  ) {
    const requestedName = playerName.trim() || "Anonymous";
    const existingAttachment = readPlayerAttachment(ws);
    if (existingAttachment) {
      const resumeTokens = await this.loadResumeTokens();
      const existingResumeToken = this.findResumeTokenForPlayer(
        resumeTokens,
        existingAttachment.playerId,
      );

      ws.send(
        JSON.stringify({
          type: "JOINED",
          playerId: existingAttachment.playerId,
          playerName: existingAttachment.playerName,
          resumeToken: existingResumeToken,
        }),
      );
      this.sendLobbyState();
      return;
    }

    const resumeTokens = await this.loadResumeTokens();
    let joinedPlayer: Player | null = null;
    let tokenToUse = resumeToken;

    if (resumeToken) {
      const restoredPlayerId = resumeTokens[resumeToken];
      const restoredPlayer = this.lobby.players.find(
        (player) => player.id === restoredPlayerId,
      );

      if (restoredPlayer) {
        if (this.hasConnectedSocketForPlayer(restoredPlayer.id)) {
          ws.send(
            JSON.stringify({
              type: "ERROR",
              message: "This player is already connected in the lobby.",
            }),
          );
          return;
        }
        joinedPlayer = restoredPlayer;
      } else {
        ws.send(
          JSON.stringify({
            type: "ERROR",
            message: "Reconnect session expired. Please join the lobby again.",
          }),
        );
        return;
      }
    }

    if (!joinedPlayer) {
      const existingPlayerByName = this.lobby.players.find((player) =>
        this.isSamePlayerName(player.name, requestedName),
      );

      if (existingPlayerByName) {
        if (this.hasConnectedSocketForPlayer(existingPlayerByName.id)) {
          ws.send(
            JSON.stringify({
              type: "ERROR",
              message:
                "A player with this name is already connected. Reconnect from that session instead.",
            }),
          );
          return;
        }

        joinedPlayer = existingPlayerByName;
        tokenToUse =
          this.findResumeTokenForPlayer(resumeTokens, joinedPlayer.id) ?? undefined;

        if (!tokenToUse) {
          tokenToUse = crypto.randomUUID();
          resumeTokens[tokenToUse] = joinedPlayer.id;
          await this.saveResumeTokens(resumeTokens);
        }
      } else {
        joinedPlayer = addPlayer(this.lobby, requestedName);
        tokenToUse = crypto.randomUUID();
        resumeTokens[tokenToUse] = joinedPlayer.id;
        await this.saveResumeTokens(resumeTokens);
      }
    }

    writePlayerAttachment(ws, {
      playerId: joinedPlayer.id,
      playerName: joinedPlayer.name,
    });

    await this.clearPendingDisconnect(joinedPlayer.id);

    ws.send(
      JSON.stringify({
        type: "JOINED",
        playerId: joinedPlayer.id,
        playerName: joinedPlayer.name,
        resumeToken: tokenToUse,
      }),
    );

    await this.saveLobbyState();
    this.sendLobbyState();
  }

  async handleUseShuriken(ws: WebSocket) {
    void ws;
    const lowestCard = spendShuriken(this.lobby);
    if (lowestCard !== null) {
      this.sendLobbyState();
    }
  }

  async handleExitGame(ws: WebSocket) {
    const playerId = readPlayerAttachment(ws)?.playerId;
    if (!playerId) {
      return;
    }

    await this.clearPendingDisconnect(playerId);
    removePlayer(this.lobby, playerId);

    const resumeTokens = await this.loadResumeTokens();
    let tokensChanged = false;
    for (const [token, tokenPlayerId] of Object.entries(resumeTokens)) {
      if (tokenPlayerId !== playerId) {
        continue;
      }
      delete resumeTokens[token];
      tokensChanged = true;
    }

    if (tokensChanged) {
      await this.saveResumeTokens(resumeTokens);
    }

    if (this.lobby.state === "playing") {
      this.lobby.state = "waiting";
      this.lobby.discardPile = [];
      this.lobby.lives = 0;
      this.lobby.shurikens = 0;
      this.lobby.currentLevel = 0;
      this.lobby.winningLevel = 0;
      this.lobby.players.forEach((player) => {
        player.hand = [];
      });

      this.broadcast({
        type: "GAME_ABORTED",
        message: "A player exited the game. Returning everyone to home.",
      });
    }

    await this.saveLobbyState();
    this.sendLobbyState();
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