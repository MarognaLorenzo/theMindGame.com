import { DurableObject } from "cloudflare:workers";
import { addMissingPlayersFromSockets, filterPlayersWithoutSockets, readPlayerAttachment, writePlayerAttachment } from "./ws/wsUtils.ts";
import { dispatchWsMessage } from "./ws/wsMessageDispatcher.ts";
import { createEmptyRoom, hydrateRoom, Room } from "./game/room.ts";
import { ResumeTokenManager } from "./connections/resumeTokens.ts";
import {PendingDisconnectionsManager} from "./connections/pendingDisconnections.ts";
import { Player } from "./game/player.ts";
import { Env } from "./index.ts";
import {
  isValidLeaderboardPlayerCount,
  LEADERBOARD_TOKEN_STORAGE_KEY,
  LEADERBOARD_TOKEN_TTL_MS,
  LeaderboardSubmitResult,
  LeaderboardToken,
  MAX_TEAM_NAME_LENGTH,
} from "./api/leaderboard/leaderboardTypes.ts";
import { normalizeCountryCode } from "./api/leaderboard/countryCodes.ts";
import { notifyPendingSubmission } from "./api/leaderboard/reviewNotifier.ts";

export class LobbyServer extends DurableObject<Env> {
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
    await this.tokensManager.load();
    if (!resumeToken && this.room.isPlayerNameInUse(playerName)) {
      return new Response(JSON.stringify({ error: "Name already taken." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    let thePlayer: Player;

    if (resumeToken) {
      const playerId = this.tokensManager.tryGetPlayerIdFromToken(resumeToken);
      if (!playerId) {
        return new Response(JSON.stringify({ error: "Invalid resume token." }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      const existingPlayer = this.room.tryGetPlayerById(playerId);
      if (!existingPlayer) {
        return new Response(JSON.stringify({ error: "Invalid resume token." }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Check if the player already has a connected socket
      if (this.hasConnectedSocketForPlayer(existingPlayer.id)) {
        this.ctx.getWebSockets().forEach((ws) => {
          if (readPlayerAttachment(ws)?.playerId === existingPlayer.id) {
            ws.close();
          }
        });
      }
      this.pendingDisconnectionsManager.clearDisconnectDeadlineForPlayer(existingPlayer.id);
      thePlayer = existingPlayer;
    } else {
      thePlayer = this.room.createAddPlayer(playerName);
    }

    const [clientWs, serverWs] = Object.values(new WebSocketPair());
    this.ctx.acceptWebSocket(serverWs, [playerName]);

    writePlayerAttachment(serverWs, {
      playerId: thePlayer.id,
      playerName: thePlayer.name
    });

    const response = new Response(null, { status: 101, webSocket: clientWs });

    await this.saveLobbyState();
    return response;
  }

  async webSocketMessage(ws: WebSocket, message: string) {
    await dispatchWsMessage(ws, message, this);
  }

  // Called once, when the room transitions into the "won" state. Issues a
  // single-use submission token, persists it as this game's strongly-consistent
  // source of truth, and broadcasts it (with the ranking stats) to every player
  // so any of them can post the team to the leaderboard.
  async onGameWon(): Promise<void> {
    const stats = this.room.getWinStats();
    if (!isValidLeaderboardPlayerCount(stats.playerCount)) {
      // e.g. a solo test game - won normally, but not a ranked team size.
      return;
    }

    const record: LeaderboardToken = {
      token: crypto.randomUUID(),
      expiresAt: Date.now() + LEADERBOARD_TOKEN_TTL_MS,
      used: false,
      stats,
    };
    await this.ctx.storage.put(LEADERBOARD_TOKEN_STORAGE_KEY, record);

    this.broadcast({
      type: "LEADERBOARD_ELIGIBLE",
      token: record.token,
      expiresAt: record.expiresAt,
      finalSeconds: stats.finalSeconds,
      livesLostCount: stats.livesLostCount,
      shurikensUsedCount: stats.shurikensUsedCount,
      playerCount: stats.playerCount,
    });
  }

  // Direct RPC entry point (mirrors LobbyRegistry.tryInsert/getValue) used by
  // POST /api/leaderboard/submit. The token is marked used and persisted BEFORE
  // the D1 insert so a racing/duplicate request can only ever lose a win, never
  // create a duplicate row.
  async submitLeaderboardEntry(
    token: string,
    teamName: string,
    countryCode: string,
    shortCode: string,
  ): Promise<LeaderboardSubmitResult> {
    const record = await this.ctx.storage.get<LeaderboardToken>(
      LEADERBOARD_TOKEN_STORAGE_KEY,
    );

    if (!record || record.token !== token) {
      return { ok: false, error: "Invalid submission token.", status: 400 };
    }
    if (record.used) {
      return { ok: false, error: "This win has already been submitted.", status: 409 };
    }
    if (Date.now() > record.expiresAt) {
      return { ok: false, error: "The submission window has expired.", status: 410 };
    }

    const trimmedName = typeof teamName === "string" ? teamName.trim() : "";
    if (trimmedName.length === 0) {
      return { ok: false, error: "A team name is required.", status: 400 };
    }
    const cleanName = trimmedName.slice(0, MAX_TEAM_NAME_LENGTH);

    const cleanCountry = normalizeCountryCode(countryCode);
    if (!cleanCountry) {
      return { ok: false, error: "Unrecognized country code.", status: 400 };
    }

    // Belt-and-suspenders: onGameWon() already withholds tokens for ineligible
    // team sizes, but this is what stands between a malformed record and an
    // uncaught D1 CHECK-constraint exception (which would bypass CORS entirely).
    if (!isValidLeaderboardPlayerCount(record.stats.playerCount)) {
      return { ok: false, error: "This lobby size is not eligible for the leaderboard.", status: 400 };
    }

    record.used = true;
    await this.ctx.storage.put(LEADERBOARD_TOKEN_STORAGE_KEY, record);

    const { finalSeconds, livesLostCount, shurikensUsedCount, playerCount } =
      record.stats;

    const insertResult = await this.env.DB.prepare(
      `INSERT INTO leaderboard
         (team_name, country_code, player_count, final_seconds,
          lives_lost_count, shurikens_used_count, lobby_short_code, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
    )
      .bind(
        cleanName,
        cleanCountry,
        playerCount,
        finalSeconds,
        livesLostCount,
        shurikensUsedCount,
        shortCode || null,
      )
      .run();

    await notifyPendingSubmission(
      {
        webhookUrl: this.env.DISCORD_WEBHOOK_URL,
        publicBaseUrl: this.env.PUBLIC_BASE_URL,
        approvalKey: this.env.REVIEW_APPROVAL_KEY,
      },
      {
        id: insertResult.meta.last_row_id,
        teamName: cleanName,
        countryCode: cleanCountry,
        playerCount,
        finalSeconds,
      },
    );

    return { ok: true };
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
    if (
      leavingPlayerId &&
      this.room.tryGetPlayerById(leavingPlayerId) &&
      !this.hasConnectedSocketForPlayer(leavingPlayerId, ws)
    ) {
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