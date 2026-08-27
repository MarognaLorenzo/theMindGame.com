import type {
  ClientMessage,
  LeaderboardEligibility,
  SocketLobbyState,
  SocketMessage,
} from "../types";
import { clearSession, loadStoredSession, persistSession } from "./sessionStorage";

const MAX_RECONNECT_ATTEMPTS = 5;

export interface ConnectOptions {
  resumeToken?: string;
  playerNameOverride?: string;
  autoReconnect?: boolean;
}

export interface DisconnectOptions {
  clearStoredSession?: boolean;
  allowReconnect?: boolean;
  clearLobbyState?: boolean;
}

export interface LobbySocketHandlers {
  setName(name: string): void;
  setLobbyId(lobbyId: string): void;
  setStatus(status: string): void;
  setError(message: string): void;
  setMyPlayerId(id: string | null): void;
  setLobby(lobby: SocketLobbyState | null): void;
  setIsConnected(connected: boolean): void;
  setLeaderboardEligibility(eligibility: LeaderboardEligibility | null): void;
}

export function toWsBaseUrl(workerBaseUrl: string): string {
  if (workerBaseUrl.startsWith("https://")) {
    return workerBaseUrl.replace("https://", "wss://");
  }
  if (workerBaseUrl.startsWith("http://")) {
    return workerBaseUrl.replace("http://", "ws://");
  }
  return workerBaseUrl;
}

// Owns the WebSocket connection lifecycle: connecting, parsing incoming messages, and the
// reconnect-with-backoff state machine. Kept free of React so it can be constructed once (in a
// ref) and driven imperatively; state changes are reported back through `handlers`.
export class LobbySocketController {
  private ws: WebSocket | null = null;
  private reconnectTimer: number | null = null;
  private allowAutoReconnect = true;
  private reconnectAttempts = 0;

  constructor(
    private readonly wsBaseUrl: string,
    private readonly handlers: LobbySocketHandlers,
  ) {}

  isOpen(): boolean {
    return Boolean(this.ws && this.ws.readyState === WebSocket.OPEN);
  }

  send(message: ClientMessage) {
    this.ws?.send(JSON.stringify(message));
  }

  private clearReconnectTimer() {
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  disconnect(options?: DisconnectOptions) {
    const clearStoredSession = options?.clearStoredSession ?? true;
    const allowReconnect = options?.allowReconnect ?? false;
    const clearLobbyState = options?.clearLobbyState ?? true;

    this.clearReconnectTimer();
    this.allowAutoReconnect = allowReconnect;

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    if (clearStoredSession) {
      clearSession();
    }

    this.handlers.setIsConnected(false);
    this.handlers.setMyPlayerId(null);
    if (clearLobbyState) {
      this.handlers.setLobby(null);
      this.handlers.setLeaderboardEligibility(null);
    }
  }

  // Leave is server-authoritative: send LEAVE_LOBBY and let the server close the socket.
  // Callers should only invoke this once they've confirmed the connection is open.
  leave() {
    this.clearReconnectTimer();
    this.allowAutoReconnect = false;
    clearSession();

    this.send({ type: "LEAVE_LOBBY" });
    this.handlers.setStatus("Leaving lobby...");

    // Fallback: if the close event does not arrive, force local cleanup.
    window.setTimeout(() => {
      if (this.ws) {
        this.disconnect({ clearStoredSession: true, allowReconnect: false });
      }
    }, 1200);
  }

  private scheduleReconnect() {
    this.clearReconnectTimer();

    const session = loadStoredSession();
    if (!session) {
      return;
    }

    // A failed WebSocket handshake (e.g. an expired resume token rejected before the upgrade)
    // surfaces to the browser as a bare close/error with no readable reason, so we can't tell a
    // dead session apart from a transient network blip. Cap the attempts so a dead session
    // doesn't retry forever instead of trying to interpret the failure.
    this.reconnectAttempts += 1;
    if (this.reconnectAttempts > MAX_RECONNECT_ATTEMPTS) {
      this.reconnectAttempts = 0;
      clearSession();
      this.handlers.setStatus("Ready");
      this.handlers.setError("Could not restore your previous session. Please join again.");
      return;
    }

    this.reconnectTimer = window.setTimeout(() => {
      this.connect(session.lobbyId, {
        resumeToken: session.resumeToken,
        playerNameOverride: session.playerName,
        autoReconnect: true,
      });
    }, 1_500);
  }

  connect(targetLobbyId: string, options?: ConnectOptions) {
    this.handlers.setError("");

    const resolvedName = options?.playerNameOverride?.trim() ?? "";
    const targetId = targetLobbyId.trim();

    if (!resolvedName) {
      this.handlers.setError("Please enter your name.");
      return;
    }

    if (!targetId) {
      this.handlers.setError("Please enter a lobby ID.");
      return;
    }

    this.disconnect({
      clearStoredSession: false,
      allowReconnect: false,
      clearLobbyState: false,
    });
    this.allowAutoReconnect = true;
    if (!options?.autoReconnect) {
      this.reconnectAttempts = 0;
    }

    const url = new URL(`${this.wsBaseUrl}/api/join`);
    url.searchParams.set("lobbyId", targetId);
    url.searchParams.set("name", resolvedName);
    if (options?.resumeToken) {
      url.searchParams.set("resumeToken", options.resumeToken);
    }

    this.handlers.setStatus(options?.autoReconnect ? "Reconnecting to lobby..." : "Connecting to lobby...");

    const ws = new WebSocket(url.toString());
    this.ws = ws;

    ws.onopen = () => {
      if (this.ws !== ws) return;
      this.reconnectAttempts = 0;
      this.handlers.setIsConnected(true);
      this.handlers.setStatus(`Connected to lobby ${targetId}`);
      this.handlers.setLobbyId(targetId);
      this.handlers.setName(resolvedName);

      ws.send(JSON.stringify({ type: "JOIN" } satisfies ClientMessage));
    };

    ws.onmessage = (event) => {
      if (this.ws !== ws) return;
      this.handlers.setIsConnected(true);

      if (typeof event.data !== "string") {
        return;
      }

      try {
        const data = JSON.parse(event.data) as SocketMessage;

        if (data.type === "JOINED") {
          this.handlers.setError("");
          this.handlers.setMyPlayerId(data.playerId);

          if (data.resumeToken) {
            persistSession({
              lobbyId: targetId,
              playerId: data.playerId,
              playerName: data.playerName,
              resumeToken: data.resumeToken,
            });
          }
        }

        if (data.type === "LOBBY_STATE") {
          this.handlers.setError("");
          this.handlers.setLobby(data.lobby);
          // The token is only ever broadcast once, at the moment of the win; once the
          // room moves on (a new game starts) it's no longer valid for submission.
          if (data.lobby.state !== "won") {
            this.handlers.setLeaderboardEligibility(null);
          }
        }

        if (data.type === "LEADERBOARD_ELIGIBLE") {
          this.handlers.setLeaderboardEligibility({
            token: data.token,
            expiresAt: data.expiresAt,
            finalSeconds: data.finalSeconds,
            livesLostCount: data.livesLostCount,
            shurikensUsedCount: data.shurikensUsedCount,
            playerCount: data.playerCount,
          });
        }

        if (data.type === "ERROR") {
          this.handlers.setError(data.message);
          if (data.message.toLowerCase().includes("session expired")) {
            clearSession();
          }
        }

        if (data.type === "GAME_ABORTED") {
          this.handlers.setError(data.message);
          this.disconnect({ clearStoredSession: true, allowReconnect: false });
          this.handlers.setStatus("Ready");
        }
      } catch {
        // Ignore non-JSON payloads.
      }
    };

    ws.onerror = () => {
      // A socket we've already superseded (e.g. the user started a new join while an old
      // auto-reconnect attempt was still in flight) can still fire error/close after the fact.
      // Only the socket we're still actively tracking may touch UI state.
      if (this.ws !== ws) return;
      this.handlers.setError("Could not connect to lobby.");
      this.handlers.setStatus("Join failed");
    };

    ws.onclose = () => {
      if (this.ws !== ws) return;

      this.ws = null;
      this.handlers.setIsConnected(false);
      this.handlers.setStatus("Disconnected");

      if (this.allowAutoReconnect) {
        this.scheduleReconnect();
      }
    };
  }
}
