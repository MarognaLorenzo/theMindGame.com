"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { LeaderboardEligibility, SocketLobbyState } from "../types";
import {
  LobbySocketController,
  toWsBaseUrl,
  type DisconnectOptions,
} from "../lib/lobbySocket";
import {
  clearSession,
  getStoredSessionForLobby,
  loadStoredSession,
} from "../lib/sessionStorage";
import { readLobbyCodeFromUrl, stripLobbyCodeFromUrl } from "../lib/shareLink";

const DEFAULT_WORKER_URL = "http://127.0.0.1:8787";

interface CreateLobbyResponse {
  lobbyId?: string;
}

interface LeaderboardSubmitErrorResponse {
  error?: string;
}

export type LeaderboardSubmitStatus = "idle" | "submitting" | "submitted" | "error";

// Which pre-lobby action is currently in flight, so the onboarding UI can show a spinner
// between the click and the lobby actually coming back. Cleared once a lobby arrives or the
// attempt errors out.
export type LobbyActionPending = "creating" | "joining" | null;

// The pre-lobby onboarding is a small step machine rather than one all-at-once form:
//  name   -> ask who the player is (every path needs this)
//  choice -> create a lobby, or continue to the code step to join one
//  code   -> type/paste a lobby code, then join
//  invite -> arrived via a ?lobby=CODE link: room is known, only the name is missing
export type LobbyPhase = "name" | "choice" | "code" | "invite";

export function useLobbyClient() {
  const [name, setName] = useState("");
  const [lobbyId, setLobbyId] = useState("");
  const [phase, setPhase] = useState<LobbyPhase>("name");
  const [status, setStatus] = useState("Ready");
  const [error, setError] = useState("");
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const [lobby, setLobby] = useState<SocketLobbyState | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [leaderboardEligibility, setLeaderboardEligibility] =
    useState<LeaderboardEligibility | null>(null);
  const [leaderboardSubmitStatus, setLeaderboardSubmitStatus] =
    useState<LeaderboardSubmitStatus>("idle");
  const [leaderboardSubmitError, setLeaderboardSubmitError] = useState("");
  const [pending, setPending] = useState<LobbyActionPending>(null);

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
      setLeaderboardEligibility: (eligibility) => {
        setLeaderboardEligibility(eligibility);
        setLeaderboardSubmitStatus("idle");
        setLeaderboardSubmitError("");
      },
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

    setPending("creating");

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
    setPending("joining");

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

  async function submitLeaderboardEntry(teamName: string, countryCode: string) {
    if (!leaderboardEligibility) {
      return;
    }

    setLeaderboardSubmitStatus("submitting");
    setLeaderboardSubmitError("");

    try {
      const res = await fetch(`${workerBaseUrl}/api/leaderboard/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shortCode: lobbyId,
          token: leaderboardEligibility.token,
          teamName,
          countryCode,
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as LeaderboardSubmitErrorResponse;
        throw new Error(data.error ?? `Submission failed (${res.status})`);
      }

      setLeaderboardSubmitStatus("submitted");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setLeaderboardSubmitError(message);
      setLeaderboardSubmitStatus("error");
    }
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

    const linkedLobbyId = readLobbyCodeFromUrl();
    if (linkedLobbyId) {
      stripLobbyCodeFromUrl();
      const sessionMatchesLink =
        session && session.lobbyId.trim().toUpperCase() === linkedLobbyId;

      if (!sessionMatchesLink) {
        // An invite link is an explicit intent to join a specific lobby, so it wins over a
        // lingering session for a different one. Pre-fill the join form and stop here.
        if (session) {
          clearSession();
        }
        // These setState calls intentionally run post-mount rather than during render: this is a
        // static export with no server-side `window`, so reading the URL/localStorage during
        // render would make the client's first render diverge from the pre-rendered HTML and
        // trigger a hydration mismatch. Deferring to an effect is the correct trade-off here, not
        // the "cascading renders" issue this rule normally warns about.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLobbyId(linkedLobbyId);
        setPhase("invite");
        setStatus("Ready");
        return;
      }
      // The stored session is for the invited lobby — fall through and resume it.
    }

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

  // A pre-lobby action resolves either way: the lobby state lands (success) or an error
  // surfaces. Derive the spinner state from that rather than racing to clear it in a
  // callback — every entry point (`createLobby`, `joinLobby`, `connect`) resets `error`
  // first, so a fresh attempt re-shows the spinner.
  const activePending: LobbyActionPending = lobby || error ? null : pending;

  const isHost = Boolean(myPlayerId === lobby?.hostPlayerId);

  return {
    name,
    setName,
    lobbyId,
    setLobbyId,
    phase,
    setPhase,
    status,
    error,
    myPlayerId,
    lobby,
    isConnected,
    isHost,
    workerBaseUrl,
    leaderboardEligibility,
    leaderboardSubmitStatus,
    leaderboardSubmitError,
    pending: activePending,
    createLobby,
    joinLobby,
    disconnectSocket: (options?: DisconnectOptions) => controller.disconnect(options),
    startGame,
    onCardPlay,
    onShurikenUse,
    exitGame,
    leaveLobby,
    submitLeaderboardEntry,
  };
}
