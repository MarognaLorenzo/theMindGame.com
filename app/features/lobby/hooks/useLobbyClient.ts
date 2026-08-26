"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { SocketLobbyState } from "../types";
import {
  LobbySocketController,
  toWsBaseUrl,
  type DisconnectOptions,
} from "../lib/lobbySocket";
import { getStoredSessionForLobby, loadStoredSession } from "../lib/sessionStorage";

const DEFAULT_WORKER_URL = "http://127.0.0.1:8787";

interface CreateLobbyResponse {
  lobbyId?: string;
}

export function useLobbyClient() {
  const [name, setName] = useState("");
  const [lobbyId, setLobbyId] = useState("");
  const [status, setStatus] = useState("Ready");
  const [error, setError] = useState("");
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const [lobby, setLobby] = useState<SocketLobbyState | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const workerBaseUrl =
    process.env.NEXT_PUBLIC_WORKER_URL?.trim() || DEFAULT_WORKER_URL;
  const wsBaseUrl = useMemo(() => toWsBaseUrl(workerBaseUrl), [workerBaseUrl]);

  const controllerRef = useRef<LobbySocketController | null>(null);
  if (controllerRef.current === null) {
    controllerRef.current = new LobbySocketController(wsBaseUrl, {
      setName,
      setLobbyId,
      setStatus,
      setError,
      setMyPlayerId,
      setLobby,
      setIsConnected,
    });
  }
  const controller = controllerRef.current;

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
      controller.connect(data.lobbyId, { playerNameOverride: name.trim() });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      setStatus("Create failed");
    }
  }

  function joinLobby() {
    setError("");

    const playerName = name.trim();
    const targetLobbyId = lobbyId.trim();
    const storedSession = getStoredSessionForLobby(targetLobbyId, playerName);

    controller.connect(lobbyId, {
      playerNameOverride: playerName,
      ...(storedSession ? { resumeToken: storedSession.resumeToken } : {}),
    });
  }

  function validConnection(): boolean {
    if (!controller.isOpen()) {
      setError("You are not connected to a lobby.");
      return false;
    }
    return true;
  }

  function startGame() {
    if (!validConnection()) return;
    controller.send({ type: "START" });
  }

  function onCardPlay(card: number) {
    if (!validConnection()) return;
    controller.send({ type: "PLAY_CARD", card });
  }

  function onShurikenUse() {
    if (!validConnection()) return;
    controller.send({ type: "USE_SHURIKEN" });
  }

  function exitGame() {
    if (!validConnection()) {
      controller.disconnect({ clearStoredSession: true, allowReconnect: false });
      return;
    }

    controller.send({ type: "EXIT_GAME" });
    controller.disconnect({ clearStoredSession: true, allowReconnect: false });
  }

  function leaveLobby() {
    if (!validConnection()) {
      controller.disconnect({ clearStoredSession: true, allowReconnect: false });
      return;
    }

    controller.leave();
  }

  useEffect(() => {
    const session = loadStoredSession();
    if (!session) {
      return;
    }

    setName(session.playerName);
    setLobbyId(session.lobbyId);
    setStatus(`Restoring session for lobby ${session.lobbyId}...`);
    controller.connect(session.lobbyId, {
      resumeToken: session.resumeToken,
      playerNameOverride: session.playerName,
      autoReconnect: true,
    });
    // Runs once on mount to resume a previous session; `controller` is a stable ref value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      controller.disconnect({ clearStoredSession: false, allowReconnect: false });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isHost = Boolean(myPlayerId === lobby?.hostPlayerId);

  return {
    name,
    setName,
    lobbyId,
    setLobbyId,
    status,
    error,
    myPlayerId,
    lobby,
    isConnected,
    isHost,
    workerBaseUrl,
    createLobby,
    joinLobby,
    disconnectSocket: (options?: DisconnectOptions) => controller.disconnect(options),
    startGame,
    onCardPlay,
    onShurikenUse,
    exitGame,
    leaveLobby,
  };
}
