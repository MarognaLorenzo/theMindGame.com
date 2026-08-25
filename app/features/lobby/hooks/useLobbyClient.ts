"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { SocketLobbyState, SocketMessage } from "../types";

const DEFAULT_WORKER_URL = "http://127.0.0.1:8787";
const MAX_RECONNECT_ATTEMPTS = 5;

interface CreateLobbyResponse {
  lobbyId?: string;
}

interface StoredLobbySession {
  lobbyId: string;
  playerId: string;
  playerName: string;
  resumeToken: string;
  savedAt: number;
}

const SESSION_STORAGE_KEY = "mind-game:lobby-session";
// The server drops a disconnected player (and their resume token) ~120s after their socket
// closes, so a stored session older than that is already dead server-side. Give it a little
// headroom over that grace period, then stop treating it as resumable.
const SESSION_TTL_MS = 5 * 60 * 1000;

function loadStoredSession(): StoredLobbySession | null {
  if (!window || !window.localStorage) {
    return null;
  }

  const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<StoredLobbySession>;
    if (
      !parsed.lobbyId ||
      !parsed.playerId ||
      !parsed.playerName ||
      !parsed.resumeToken ||
      !parsed.savedAt
    ) {
      return null;
    }

    if (Date.now() - parsed.savedAt > SESSION_TTL_MS) {
      clearSession();
      return null;
    }

    return {
      lobbyId: parsed.lobbyId,
      playerId: parsed.playerId,
      playerName: parsed.playerName,
      resumeToken: parsed.resumeToken,
      savedAt: parsed.savedAt,
    };
  } catch {
    return null;
  }
}

function persistSession(session: Omit<StoredLobbySession, "savedAt">) {
  if (!window || !window.localStorage) {
    return;
  }
  window.localStorage.setItem(
    SESSION_STORAGE_KEY,
    JSON.stringify({ ...session, savedAt: Date.now() }),
  );
}

function clearSession() {
  if (!window || !window.localStorage) {
    return;
  }
  window.localStorage.removeItem(SESSION_STORAGE_KEY);
}

function getStoredSessionForLobby(
  targetLobbyId: string,
  playerName: string,
): StoredLobbySession | null { 
  const session = loadStoredSession();
  if (!session) {
    return null;
  }

  if (session.lobbyId.trim().toUpperCase() !== targetLobbyId.trim().toUpperCase()) {
    return null;
  }

  if (session.playerName.trim().toLowerCase() !== playerName.trim().toLowerCase()) {
    return null;
  }

  return session;
}

interface ConnectOptions {
  resumeToken?: string;
  playerNameOverride?: string;
  autoReconnect?: boolean;
}

interface DisconnectOptions {
  clearStoredSession?: boolean;
  allowReconnect?: boolean;
  clearLobbyState?: boolean;
}

export function useLobbyClient() {
  const [name, setName] = useState("");
  const [lobbyId, setLobbyId] = useState("");
  const [status, setStatus] = useState("Ready");
  const [error, setError] = useState("");
  const [messages, setMessages] = useState<string[]>([]);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const [lobby, setLobby] = useState<SocketLobbyState | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const allowAutoReconnectRef = useRef(true);
  const reconnectAttemptsRef = useRef(0);

  const workerBaseUrl =
    process.env.NEXT_PUBLIC_WORKER_URL?.trim() || DEFAULT_WORKER_URL;

  const wsBaseUrl = useMemo(() => {
    if (workerBaseUrl.startsWith("https://")) {
      return workerBaseUrl.replace("https://", "wss://");
    }
    if (workerBaseUrl.startsWith("http://")) {
      return workerBaseUrl.replace("http://", "ws://");
    }
    return workerBaseUrl;
  }, [workerBaseUrl]);

  function appendMessage(line: string) {
    const timestamp = new Date().toLocaleTimeString();
    setMessages((prev) => [`[${timestamp}] ${line}`, ...prev].slice(0, 50));
  }

  function clearMessages() {
    setMessages([]);
  }

  function clearReconnectTimer() {
    if (reconnectTimerRef.current !== null) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }

  function disconnectSocket(options?: DisconnectOptions) {
    const clearStoredSession = options?.clearStoredSession ?? true;
    const allowReconnect = options?.allowReconnect ?? false;
    const clearLobbyState = options?.clearLobbyState ?? true;

    clearReconnectTimer();
    allowAutoReconnectRef.current = allowReconnect;

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    if (clearStoredSession) {
      clearSession();
    }

    setIsConnected(false);
    setMyPlayerId(null);
    if (clearLobbyState) {
      setLobby(null);
    }
  }

  function scheduleReconnect() {
    clearReconnectTimer();

    const session = loadStoredSession();
    if (!session) {
      return;
    }

    // A failed WebSocket handshake (e.g. an expired resume token rejected before the upgrade)
    // surfaces to the browser as a bare close/error with no readable reason, so we can't tell a
    // dead session apart from a transient network blip. Cap the attempts so a dead session
    // doesn't retry forever instead of trying to interpret the failure.
    reconnectAttemptsRef.current += 1;
    if (reconnectAttemptsRef.current > MAX_RECONNECT_ATTEMPTS) {
      reconnectAttemptsRef.current = 0;
      clearSession();
      setStatus("Ready");
      setError("Could not restore your previous session. Please join again.");
      appendMessage("Giving up on reconnecting after repeated failures.");
      return;
    }

    reconnectTimerRef.current = window.setTimeout(() => {
      connectToLobby(session.lobbyId, {
        resumeToken: session.resumeToken,
        playerNameOverride: session.playerName,
        autoReconnect: true,
      });
    }, 1_500);
  }

  function connectToLobby(targetLobbyId: string, options?: ConnectOptions) {
    setError("");

    const resolvedName = options?.playerNameOverride?.trim() || name.trim();
    const targetId = targetLobbyId.trim();

    if (!resolvedName) {
      setError("Please enter your name.");
      return;
    }

    if (!targetId) {
      setError("Please enter a lobby ID.");
      return;
    }

    disconnectSocket({
      clearStoredSession: false,
      allowReconnect: false,
      clearLobbyState: false,
    });
    allowAutoReconnectRef.current = true;
    if (!options?.autoReconnect) {
      reconnectAttemptsRef.current = 0;
    }

    const url = new URL(`${wsBaseUrl}/api/join`);
    url.searchParams.set("lobbyId", targetId);
    url.searchParams.set("name", resolvedName);
    if(options?.resumeToken) {
      url.searchParams.set("resumeToken", options.resumeToken);
    }

    setStatus(options?.autoReconnect ? "Reconnecting to lobby..." : "Connecting to lobby...");

    const ws = new WebSocket(url.toString());
    wsRef.current = ws;

    ws.onopen = () => {
      if (wsRef.current !== ws) return;
      reconnectAttemptsRef.current = 0;
      setIsConnected(true);
      setStatus(`Connected to lobby ${targetId}`);
      appendMessage(`Connected to lobby ${targetId}`);
      setLobbyId(targetId);
      setName(resolvedName);

      ws.send(JSON.stringify({ type: "JOIN" }));
      appendMessage(options?.resumeToken ? "Sent: JOIN (resume)" : "Sent: JOIN");
    };

    ws.onmessage = (event) => {
      if (wsRef.current !== ws) return;
      const incoming =
        typeof event.data === "string" ? event.data : "(binary data)";
      appendMessage(`Received: ${incoming}`);
      setIsConnected(true);

      if (typeof event.data !== "string") {
        return;
      }

      try {
        const data = JSON.parse(event.data) as SocketMessage;

        if (data.type === "JOINED") {
          setError("");
          setMyPlayerId(data.playerId);

          if (data.resumeToken) {
            persistSession({
              lobbyId: targetId,
              playerId: data.playerId,
              playerName: data.playerName,
              resumeToken: data.resumeToken,
            });
          }

          if (data.playerId) {
            appendMessage(`Joined lobby as player ${data.playerName} (ID: ${data.playerId})`);
          }
        }

        if (data.type === "LOBBY_STATE") {
          setError("");
          setLobby(data.lobby);
        }

        if (data.type === "ERROR") {
          setError(data.message);
          if (data.message.toLowerCase().includes("session expired")) {
            clearSession();
          }
        }

        if (data.type === "GAME_ABORTED") {
          setError(data.message);
          disconnectSocket({ clearStoredSession: true, allowReconnect: false });
          setStatus("Ready");
        }
      } catch {
        // Keep non-JSON payloads in the raw log only.
      }
    };

    ws.onerror = () => {
      // A socket we've already superseded (e.g. the user started a new join while an old
      // auto-reconnect attempt was still in flight) can still fire error/close after the fact.
      // Only the socket we're still actively tracking may touch UI state.
      if (wsRef.current !== ws) return;
      setError("Could not connect to lobby.");
      setStatus("Join failed");
      appendMessage("Socket error while joining lobby");
    };

    ws.onclose = () => {
      if (wsRef.current !== ws) return;

      wsRef.current = null;
      setIsConnected(false);
      setStatus("Disconnected");
      appendMessage("Socket closed");

      if (allowAutoReconnectRef.current) {
        scheduleReconnect();
      }
    };
  }

  async function createLobby() {
    setError("");
    setStatus("Creating lobby...");

    if (!name.trim()) {
      setError("Please enter your name before creating a lobby.");
      setStatus("Create failed");
      return;
    }

    try {
      const res = await fetch(`${workerBaseUrl}/api/create`, { method: "GET" });
      if (!res.ok) {
        throw new Error(`Create failed (${res.status})`);
      }

      const data = (await res.json()) as CreateLobbyResponse;
      if (!data.lobbyId) {
        throw new Error("No lobbyId returned by backend");
      }

      setLobbyId(data.lobbyId);
      setStatus(`Lobby created: ${data.lobbyId}. Joining...`);
      appendMessage(`Lobby created: ${data.lobbyId}`);
      connectToLobby(data.lobbyId, { playerNameOverride: name.trim() });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      setStatus("Create failed");
      appendMessage(`Create failed: ${message}`);
    }
  }

  function joinLobby() {
    setError("");

    const playerName = name.trim();
    const targetLobbyId = lobbyId.trim();
    const storedSession = getStoredSessionForLobby(targetLobbyId, playerName);

    connectToLobby(lobbyId, {
      ...(storedSession ? { resumeToken: storedSession.resumeToken } : {}),
    });
  }

  function validConnection(): boolean {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      setError("You are not connected to a lobby.");
      return false;
    }
    return true;
  }

  function startGame() {
    if (!validConnection()) return;
    wsRef?.current?.send(JSON.stringify({ type: "START" }));
    appendMessage("Sent: START");
  }

  function onCardPlay(card: number) {
    if (!validConnection()) return;
    wsRef?.current?.send(JSON.stringify({ type: "PLAY_CARD", card }));
    appendMessage(`Sent: PLAY_CARD ${card}`);
  }

  function onShurikenUse() {
    if (!validConnection()) return;
    wsRef?.current?.send(JSON.stringify({ type: "USE_SHURIKEN" }));
    appendMessage("Sent: USE_SHURIKEN");
  }

  function exitGame() {
    if (!validConnection()) {
      disconnectSocket({ clearStoredSession: true, allowReconnect: false });
      return;
    }

    wsRef.current?.send(JSON.stringify({ type: "EXIT_GAME" }));
    appendMessage("Sent: EXIT_GAME");
    disconnectSocket({ clearStoredSession: true, allowReconnect: false });
  }

  function leaveLobby() {
    if (!validConnection()) {
      disconnectSocket({ clearStoredSession: true, allowReconnect: false });
      return;
    }

    // Leave is server-authoritative: send LEAVE_LOBBY and let server close the socket.
    clearReconnectTimer();
    allowAutoReconnectRef.current = false;
    clearSession();

    wsRef.current?.send(JSON.stringify({ type: "LEAVE_LOBBY" }));
    appendMessage("Sent: LEAVE_LOBBY");
    setStatus("Leaving lobby...");

    // Fallback: if close event does not arrive, force local cleanup.
    window.setTimeout(() => {
      if (wsRef.current) {
        disconnectSocket({ clearStoredSession: true, allowReconnect: false });
      }
    }, 1200);
  }

  useEffect(() => {
    const session = loadStoredSession();
    if (!session) {
      return;
    }

    setName(session.playerName);
    setLobbyId(session.lobbyId);
    setStatus(`Restoring session for lobby ${session.lobbyId}...`);
    connectToLobby(session.lobbyId, {
      resumeToken: session.resumeToken,
      playerNameOverride: session.playerName,
      autoReconnect: true,
    });
  }, []);

  useEffect(() => {
    return () => {
      disconnectSocket({ clearStoredSession: false, allowReconnect: false });
    };
  }, []);

  const isHost = Boolean(myPlayerId === lobby?.hostPlayerId);

  return {
    name,
    setName,
    lobbyId,
    setLobbyId,
    status,
    error,
    messages,
    myPlayerId,
    lobby,
    isConnected,
    isHost,
    workerBaseUrl,
    createLobby,
    joinLobby,
    disconnectSocket,
    startGame,
    clearMessages,
    onCardPlay,
    onShurikenUse,
    exitGame,
    leaveLobby,
  };
}
