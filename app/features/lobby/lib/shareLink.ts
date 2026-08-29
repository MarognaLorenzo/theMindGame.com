// Helpers for the "share a link to join my lobby" feature.
//
// A shareable invite is just the app origin plus a `?lobby=CODE` query param. There is no
// router in this app (static export, single page), so intake is done manually on mount in
// useLobbyClient: the param pre-fills the join form, then it is stripped from the URL.

// Client-side copy of the lobby short-code format. Mirrors SHORT_CODE_ALPHABET /
// SHORT_CODE_LENGTH in worker/api/utils/shortCodeLib.ts — kept as a local copy rather than a
// cross-import, the same way the leaderboard client mirrors server constants (see
// app/features/leaderboard/lib/scoring.ts). The names match the worker's so the pair is
// greppable if the format ever changes.
const SHORT_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const SHORT_CODE_LENGTH = 6;
const SHORT_CODE_RE = new RegExp(`^[${SHORT_CODE_ALPHABET}]{${SHORT_CODE_LENGTH}}$`);

const LOBBY_QUERY_PARAM = "lobby";

export function buildJoinUrl(lobbyId: string): string {
  return `${window.location.origin}/?${LOBBY_QUERY_PARAM}=${encodeURIComponent(lobbyId)}`;
}

// Reads and validates the invite code from the current URL. Returns the normalised (upper-case)
// code, or null when the param is absent or malformed.
export function readLobbyCodeFromUrl(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = new URLSearchParams(window.location.search).get(LOBBY_QUERY_PARAM);
  if (!raw) {
    return null;
  }

  const code = raw.trim().toUpperCase();
  return SHORT_CODE_RE.test(code) ? code : null;
}

// Removes the `?lobby=` param from the address bar without a navigation, so a later refresh
// (or the localStorage session-restore path) is not influenced by a stale invite code.
export function stripLobbyCodeFromUrl(): void {
  if (typeof window === "undefined") {
    return;
  }

  const url = new URL(window.location.href);
  if (!url.searchParams.has(LOBBY_QUERY_PARAM)) {
    return;
  }

  url.searchParams.delete(LOBBY_QUERY_PARAM);
  const search = url.searchParams.toString();
  window.history.replaceState(
    window.history.state,
    "",
    `${url.pathname}${search ? `?${search}` : ""}${url.hash}`,
  );
}

export type ShareOutcome = "shared" | "copied" | "error" | "cancelled";

// Prefers the native share sheet (mobile) and falls back to copying to the clipboard.
export async function shareJoinLink(lobbyId: string): Promise<ShareOutcome> {
  const url = buildJoinUrl(lobbyId);

  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({
        title: "The Mind",
        text: "Join my lobby on The Mind",
        url,
      });
      return "shared";
    } catch (err) {
      // AbortError = user dismissed the share sheet. Nothing was shared, so report it as a
      // no-op rather than a success or an error; the caller leaves the UI untouched.
      if (err instanceof DOMException && err.name === "AbortError") {
        return "cancelled";
      }
      // Any other share failure: fall through to the clipboard path.
    }
  }

  try {
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      return "error";
    }
    await navigator.clipboard.writeText(url);
    return "copied";
  } catch {
    return "error";
  }
}
