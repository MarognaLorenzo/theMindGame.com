"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { SocketLobbyState, SocketMessage } from "../types";

const DEFAULT_WORKER_URL = "http://127.0.0.1:8787";

interface CreateLobbyResponse {
  lobbyId?: string;
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

  function disconnectSocket() {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
    setMyPlayerId(null);
    setLobby(null);
  }

  function connectToLobby(targetLobbyId: string) {
    setError("");

    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }

    if (!targetLobbyId.trim()) {
      setError("Please enter a lobby ID.");
      return;
    }

    disconnectSocket();

    const url = new URL(`${wsBaseUrl}/api/join`);
    url.searchParams.set("lobbyId", targetLobbyId.trim());
    url.searchParams.set("name", name.trim());

    setStatus("Connecting to lobby...");

    const ws = new WebSocket(url.toString());
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      setStatus(`Connected to lobby ${targetLobbyId}`);
      appendMessage(`Connected to lobby ${targetLobbyId}`);
      ws.send(JSON.stringify({ type: "JOIN" }));
      appendMessage("Sent: JOIN");
    };

    ws.onmessage = (event) => {
      const incoming =
        typeof event.data === "string" ? event.data : "(binary data)";
      appendMessage(`Received: ${incoming}`);

      if (typeof event.data !== "string") {
        return;
      }

      try {
        const data = JSON.parse(event.data) as SocketMessage;

        if (data.type === "JOINED") {
          setMyPlayerId(data.playerId);
        }

        if (data.type === "LOBBY_STATE") {
          setLobby(data.lobby);
        }

        if (data.type === "ERROR") {
          setError(data.message);
        }
      } catch {
        // Keep non-JSON payloads in the raw log only.
      }
    };

    ws.onerror = () => {
      setError("Could not connect to lobby.");
      setStatus("Join failed");
      appendMessage("Socket error while joining lobby");
    };

    ws.onclose = () => {
      setIsConnected(false);
      setStatus("Disconnected");
      appendMessage("Socket closed");
      if (wsRef.current === ws) {
        wsRef.current = null;
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
      connectToLobby(data.lobbyId);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      setStatus("Create failed");
      appendMessage(`Create failed: ${message}`);
    }
  }

  function joinLobby() {
    setError("");
    connectToLobby(lobbyId);
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

  useEffect(() => {
    return () => {
      disconnectSocket();
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
  };
}
