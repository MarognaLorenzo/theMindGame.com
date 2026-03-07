import { DurableObject } from "cloudflare:workers";

interface Player {
  id: string;
  name: string;
  hand: number[];
}

interface Lobby {
  players: Player[];
  discardPile: number[];
  lives: number;
  shurikens: number;
  currentLevel: number;
  state: "waiting" | "playing" | "won" | "lost";
  hostPlayerId: string | null;
}

interface PlayerAttachment {
  playerId: string;
  playerName: string;
}

export class LobbyServer extends DurableObject {
  private initialized = false;

  private lobby: Lobby = {
    players: [],
    discardPile: [],
    lives: 3,
    shurikens: 2,
    currentLevel: 1,
    state: "waiting",
    hostPlayerId: null,
  };

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

  private getAttachment(ws: WebSocket): PlayerAttachment | null {
    const attachment = ws.deserializeAttachment() as PlayerAttachment | null;
    if (!attachment?.playerId || !attachment?.playerName) {
      return null;
    }

    return attachment;
  }

  private reconcilePlayersFromSockets() {
    const playersById = new Map<string, Player>();

    for (const ws of this.ctx.getWebSockets()) {
      const attachment = this.getAttachment(ws);
      if (!attachment) {
        continue;
      }

      const existing = this.lobby.players.find((p) => p.id === attachment.playerId);
      playersById.set(
        attachment.playerId,
        existing ?? { id: attachment.playerId, name: attachment.playerName, hand: [] },
      );
    }

    this.lobby.players = Array.from(playersById.values());

    if (
      this.lobby.hostPlayerId &&
      !this.lobby.players.some((p) => p.id === this.lobby.hostPlayerId)
    ) {
      this.lobby.hostPlayerId = null;
    }

    if (!this.lobby.hostPlayerId && this.lobby.players.length > 0) {
      this.lobby.hostPlayerId = this.lobby.players[0].id;
    }
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
      lobby: {...this.lobby,
        players: this.lobby.players.map((p) => ({
          id: p.id,
          name: p.name,
          handSize: p.hand.length,
        })),
      },
    });
  }

  async webSocketClose(
    ws: globalThis.WebSocket,
    code: number,
    reason: string,
    wasClean: boolean,
  ) {
    await this.ensureLoaded();

    const leavingPlayerId = this.getAttachment(ws)?.playerId;
    if (leavingPlayerId) {
      this.lobby.players = this.lobby.players.filter(
        (player) => player.id !== leavingPlayerId,
      );

      if (this.lobby.hostPlayerId === leavingPlayerId) {
        this.lobby.hostPlayerId = this.lobby.players[0]?.id ?? null;
      }

      await this.saveLobbyState();
      this.sendLobbyState();
    }

    void code;
    void reason;
    void wasClean;
  }

  handlePlayCard(ws: WebSocket, playedCard: number) {
    void ws;
    const allCards = this.lobby.players.flatMap((p) => p.hand);
    const minCard = Math.min(...allCards);

    if (playedCard === minCard) {
      this.lobby.players.forEach((p) => {
        p.hand = p.hand.filter((c) => c !== playedCard);
      });
      this.lobby.discardPile.push(playedCard);
      this.broadcast({ type: "CARD_ACCEPTED", card: playedCard });
    } else {
      this.lobby.lives -= 1;
      this.broadcast({
        type: "LIFE_LOST",
        remainingLives: this.lobby.lives,
        wrongCard: playedCard,
      });
    }
  }

  async handleJoinLobby(ws: WebSocket, playerName: string) {
    const existingAttachment = this.getAttachment(ws);
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

    const playerId = crypto.randomUUID();
    const newPlayer: Player = { id: playerId, name: playerName, hand: [] };
    this.lobby.players.push(newPlayer);

    if (!this.lobby.hostPlayerId) {
      this.lobby.hostPlayerId = playerId;
    }

    ws.serializeAttachment({ playerId, playerName } satisfies PlayerAttachment);


    ws.send(
      JSON.stringify({
        type: "JOINED",
        playerId,
        playerName,
      }),
    );

    // this.broadcast({
    //   type: "PLAYER_JOINED",
    //   data: newPlayer.id,
    //   playerName: newPlayer.name,
    // });

    await this.saveLobbyState();
    this.sendLobbyState();
  }

  handleUseShuriken(ws: WebSocket) {
    void ws;
    if (this.lobby.shurikens > 0) {
      this.lobby.shurikens -= 1;
      const lowestCard = Math.min(...this.lobby.players.flatMap((p) => p.hand));
      this.lobby.discardPile.push(lowestCard);
      this.lobby.players.forEach((p) => {
        p.hand = p.hand.filter((c) => c !== lowestCard);
      });
      this.broadcast({
        type: "SHURIKEN_USED",
        remainingShurikens: this.lobby.shurikens,
        cardRemoved: lowestCard,
      });
    }
  }

  handleStartGame(ws: WebSocket) {
    const playerId = this.getAttachment(ws)?.playerId;
    if (!playerId || playerId !== this.lobby.hostPlayerId) {
      ws.send(
        JSON.stringify({
          type: "ERROR",
          message: "Only the lobby creator can start the game.",
        }),
      );
      return;
    }

    if (this.lobby.state === "waiting") {
      this.lobby.state = "playing";
      const deck = Array.from({ length: 100 }, (_, i) => i + 1).sort(
        () => Math.random() - 0.5,
      );
      const numPlayers = this.lobby.players.length;
      this.lobby.players.forEach((player, index) => {
        player.hand = deck
          .filter((_, i) => i % numPlayers === index)
          .slice(0, 3);
      });
      this.lobby.lives = 3;
      this.lobby.shurikens = 2;
      this.broadcast({
        type: "GAME_STARTED",
        players: this.lobby.players.map((p) => ({ id: p.id, name: p.name })),
      });
      void this.saveLobbyState();
      this.sendLobbyState();
    }
  }
}