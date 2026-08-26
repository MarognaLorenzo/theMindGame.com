export interface StoredLobbySession {
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

export function loadStoredSession(): StoredLobbySession | null {
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

export function persistSession(session: Omit<StoredLobbySession, "savedAt">) {
  if (!window || !window.localStorage) {
    return;
  }
  window.localStorage.setItem(
    SESSION_STORAGE_KEY,
    JSON.stringify({ ...session, savedAt: Date.now() }),
  );
}

export function clearSession() {
  if (!window || !window.localStorage) {
    return;
  }
  window.localStorage.removeItem(SESSION_STORAGE_KEY);
}

export function getStoredSessionForLobby(
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
