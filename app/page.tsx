"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const DEFAULT_WORKER_URL = "http://127.0.0.1:8787";

interface LobbyPlayer {
  id: string;
  name: string;
  handSize: number;
}

interface SocketJoinedMessage {
  type: "JOINED";
  playerId: string;
  playerName: string;
}

interface SocketLobbyState {
  players: LobbyPlayer[];
  hostPlayerId: string | null;
  state: "waiting" | "playing" | "won" | "lost";
  discardPile: number[];
  lives: number;
  shurikens: number;
  currentLevel: number;
}

interface SocketLobbyStateMessage {
  type: "LOBBY_STATE";
  lobby: SocketLobbyState;
}

interface SocketErrorMessage {
  type: "ERROR";
  message: string;
}

type SocketMessage = SocketJoinedMessage | SocketLobbyStateMessage | SocketErrorMessage;

export default function Home() {
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
      const incoming = typeof event.data === "string" ? event.data : "(binary data)";
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
        // Ignore non-JSON messages and keep them only in the raw log.
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

      const data = (await res.json()) as { lobbyId?: string };
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

  function startGame() {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      setError("You are not connected to a lobby.");
      return;
    }

    wsRef.current.send(JSON.stringify({ type: "START" }));
    appendMessage("Sent: START");
  }

  useEffect(() => {
    return () => {
      disconnectSocket();
    };
  }, []);

  const isHost = Boolean(myPlayerId === lobby?.hostPlayerId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-cyan-950/20 to-slate-900 px-6 py-12 text-slate-100">
      <main className="mx-auto w-full max-w-2xl rounded-2xl border border-cyan-300/20 bg-slate-900/80 p-8 shadow-2xl shadow-cyan-950/50 backdrop-blur">
        <h1 className="text-3xl font-bold tracking-tight text-cyan-300">
          The Mind Lobby
        </h1>
        <p className="mt-2 text-sm text-slate-300">
          Enter your name, create a lobby, or join an existing one.
        </p>

        <div className="mt-8 space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm text-slate-300">Name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Lorenzo"
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 outline-none ring-cyan-400 transition focus:ring-2"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm text-slate-300">Lobby ID</span>
            <input
              value={lobbyId}
              onChange={(e) => setLobbyId(e.target.value)}
              placeholder="Paste lobby ID to join"
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 outline-none ring-cyan-400 transition focus:ring-2"
            />
          </label>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            onClick={createLobby}
            className="rounded-lg bg-cyan-500 px-4 py-2 font-semibold text-slate-950 transition hover:bg-cyan-400"
          >
            Create Lobby
          </button>
          <button
            onClick={joinLobby}
            className="rounded-lg border border-cyan-400/60 px-4 py-2 font-semibold text-cyan-300 transition hover:bg-cyan-400/10"
          >
            Join Lobby
          </button>
          <button
            onClick={disconnectSocket}
            className="rounded-lg border border-slate-600 px-4 py-2 font-semibold text-slate-300 transition hover:bg-slate-800"
          >
            Disconnect
          </button>
        </div>

        <div className="mt-6 space-y-1 text-sm">
          <p className="text-slate-300">Status: {status}</p>
          {error ? <p className="text-rose-400">Error: {error}</p> : null}
          <p className="text-slate-500">Backend: {workerBaseUrl}</p>
        </div>

        {isConnected ? (
          <section className="mt-8 rounded-xl border border-cyan-300/20 bg-slate-950/70 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-cyan-400/80">
                  Lobby Code
                </p>
                <p className="text-3xl font-black tracking-[0.25em] text-cyan-200">
                  {lobbyId || "------"}
                </p>
              </div>
              <div className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">
                State: {lobby?.state}
              </div>
            </div>

            <div className="mt-5">
              <h2 className="text-sm font-semibold text-cyan-300">Players In Room</h2>
              <ul className="mt-3 space-y-2">
                {lobby?.players.length === 0 ? (
                  <li className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-500">
                    Waiting for players...
                  </li>
                ) : (
                  lobby?.players.map((player) => {
                    const isPlayerHost = lobby?.hostPlayerId === player.id;
                    const isMe = myPlayerId === player.id;

                    return (
                      <li
                        key={player.id}
                        className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900 px-3 py-2"
                      >
                        <span className="text-sm text-slate-200">
                          {player.name}
                          {isMe ? " (you)" : ""}
                        </span>
                        {isPlayerHost ? (
                          <span className="rounded bg-cyan-500/20 px-2 py-0.5 text-xs font-semibold text-cyan-200">
                            Host
                          </span>
                        ) : null}
                      </li>
                    );
                  })
                )}
              </ul>
            </div>
            
            {isHost && lobby?.state === "waiting" && lobby.players.length > 1 ? (
              <button
                onClick={startGame}
                className="mt-5 w-full rounded-lg bg-emerald-400 px-4 py-2 font-bold text-emerald-950 transition hover:bg-emerald-300"
              >
                Start Game
              </button>
            ) : null}
          </section>
        ) : null}

        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-cyan-300">Live Message Log</h2>
            <button
              onClick={() => setMessages([])}
              className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800"
            >
              Clear
            </button>
          </div>
          <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs text-slate-300">
            {messages.length === 0 ? (
              <p className="text-slate-500">No messages yet.</p>
            ) : (
              <ul className="space-y-1">
                {messages.map((line, index) => (
                  <li key={`${line}-${index}`} className="break-all">
                    {line}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
