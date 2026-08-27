import { Env, LobbyRegistry } from "../../index.ts";
import { Responder } from "../utils/responder.ts";

// Public read model for a single leaderboard row.
interface LeaderboardRow {
  team_name: string;
  country_code: string;
  player_count: number;
  final_seconds: number;
  lives_lost_count: number;
  shurikens_used_count: number;
  created_at: string;
}

const LEADERBOARD_READ_LIMIT = 100;
const VALID_PLAYER_COUNTS = [2, 3, 4];

// POST /api/leaderboard/submit
// Body: { shortCode, token, teamName, countryCode }
// Resolves the shortCode to its LobbyServer DO (exactly like joinLobby) and
// hands the submission to that DO, which owns validation and the D1 insert.
export async function submitLeaderboardEntry(
  registryStub: DurableObjectStub<LobbyRegistry>,
  request: Request,
  env: Env,
  responder: Responder,
): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return responder.respondWithError("Invalid JSON body", 400);
  }

  const { shortCode, token, teamName, countryCode } = (body ?? {}) as Record<
    string,
    unknown
  >;

  if (typeof shortCode !== "string" || !shortCode) {
    return responder.respondMissingField("shortCode");
  }
  if (typeof token !== "string" || !token) {
    return responder.respondMissingField("token");
  }
  if (typeof teamName !== "string") {
    return responder.respondMissingField("teamName");
  }
  if (typeof countryCode !== "string") {
    return responder.respondMissingField("countryCode");
  }

  const lobbyDOId = await registryStub.getValue(shortCode);
  if (!lobbyDOId) {
    return responder.respondWithError(`Lobby with ID ${shortCode} not found`, 404);
  }

  const lobbyStub = env.LOBBY_SERVER.get(
    env.LOBBY_SERVER.idFromString(lobbyDOId),
  );

  const result = await lobbyStub.submitLeaderboardEntry(
    token,
    teamName,
    countryCode,
    shortCode,
  );

  if (!result.ok) {
    return responder.respondWithError(result.error, result.status);
  }
  return responder.respondWithJson({ ok: true }, 201);
}

// GET /api/leaderboard?playerCount=2|3|4
// Returns approved entries for the given team size, fastest first.
export async function getLeaderboard(
  request: Request,
  env: Env,
  responder: Responder,
): Promise<Response> {
  const playerCount = Number(
    new URL(request.url).searchParams.get("playerCount"),
  );
  if (!VALID_PLAYER_COUNTS.includes(playerCount)) {
    return responder.respondInvalidField("playerCount", "must be 2, 3, or 4");
  }

  const { results } = await env.DB.prepare(
    `SELECT team_name, country_code, player_count, final_seconds,
            lives_lost_count, shurikens_used_count, created_at
       FROM leaderboard
      WHERE status = 'approved' AND player_count = ?
      ORDER BY final_seconds ASC
      LIMIT ?`,
  )
    .bind(playerCount, LEADERBOARD_READ_LIMIT)
    .all<LeaderboardRow>();

  return responder.respondWithJson({ entries: results });
}

// Minimal moderation flow reachable from the review notification: a GET here
// renders a confirm page (never mutates on its own - a chat client's link
// preview crawler pre-fetching this URL must not silently approve anything),
// and the page's own form POSTs back here to actually flip the status.
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderPage(body: string): string {
  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Leaderboard review</title>
<style>
  body { font-family: system-ui, sans-serif; background: #0e141b; color: #eff3f8; display: flex; min-height: 100vh; align-items: center; justify-content: center; margin: 0; padding: 1.5rem; }
  .card { max-width: 24rem; text-align: center; }
  button { margin-top: 1rem; padding: 0.75rem 1.5rem; border-radius: 0.75rem; border: none; background: #7ce4c0; color: #0a1712; font-weight: 600; font-size: 1rem; cursor: pointer; }
</style>
</head><body><div class="card">${body}</div></body></html>`;
}

interface ReviewRequestParams {
  id: number;
  key: string;
}

function parseReviewParams(url: URL, env: Env, responder: Responder): ReviewRequestParams | Response {
  const idParam = url.searchParams.get("id");
  const key = url.searchParams.get("key");

  if (!idParam || !key) {
    return responder.respondWithError("Missing id or key", 400);
  }
  const id = Number(idParam);
  if (!Number.isInteger(id) || id <= 0) {
    return responder.respondInvalidField("id", "must be a positive integer");
  }
  if (!env.REVIEW_APPROVAL_KEY || key !== env.REVIEW_APPROVAL_KEY) {
    return responder.respondWithError("Invalid or missing key", 403);
  }

  return { id, key };
}

// A pending row can only ever resolve to one of these two terminal states.
const REVIEW_OUTCOME_LABELS: Record<string, string> = {
  approved: "✅ approved",
  rejected: "🚫 rejected",
};

// GET /api/leaderboard/review?id&key - read-only confirmation page, offering
// both actions. Never mutates on its own - a chat client's link-preview
// crawler pre-fetching this URL must not silently approve/deny anything -
// each button's form POSTs back to actually flip the status.
export async function renderReviewConfirmation(
  request: Request,
  env: Env,
  responder: Responder,
): Promise<Response> {
  const url = new URL(request.url);
  const params = parseReviewParams(url, env, responder);
  if (params instanceof Response) {
    return params;
  }

  const row = await env.DB.prepare(
    "SELECT team_name, country_code, player_count, final_seconds, status FROM leaderboard WHERE id = ?",
  )
    .bind(params.id)
    .first<{
      team_name: string;
      country_code: string;
      player_count: number;
      final_seconds: number;
      status: string;
    }>();

  if (!row) {
    return responder.respondWithHtml(renderPage(`<p>No leaderboard entry with id ${params.id}.</p>`), 404);
  }

  const outcomeLabel = REVIEW_OUTCOME_LABELS[row.status];
  if (outcomeLabel) {
    return responder.respondWithHtml(
      renderPage(`<p>"${escapeHtml(row.team_name)}" was already ${outcomeLabel}.</p>`),
    );
  }

  const query = `id=${params.id}&key=${encodeURIComponent(params.key)}`;
  return responder.respondWithHtml(
    renderPage(`
      <p>Review this leaderboard entry:</p>
      <p><strong>${escapeHtml(row.team_name)}</strong> (${escapeHtml(row.country_code)})<br>
      ${row.player_count} players · ${row.final_seconds.toFixed(1)}s</p>
      <div style="display:flex;gap:0.75rem;justify-content:center;flex-wrap:wrap;">
        <form method="POST" action="/api/leaderboard/approve?${query}">
          <button type="submit">Approve</button>
        </form>
        <form method="POST" action="/api/leaderboard/deny?${query}">
          <button type="submit" style="background:#f08f8f;">Deny</button>
        </form>
      </div>
    `),
  );
}

async function resolveReview(
  request: Request,
  env: Env,
  responder: Responder,
  targetStatus: "approved" | "rejected",
): Promise<Response> {
  const url = new URL(request.url);
  const params = parseReviewParams(url, env, responder);
  if (params instanceof Response) {
    return params;
  }

  const result = await env.DB.prepare(
    "UPDATE leaderboard SET status = ? WHERE id = ? AND status = 'pending'",
  )
    .bind(targetStatus, params.id)
    .run();

  if (result.meta.changes === 0) {
    return responder.respondWithHtml(
      renderPage(`<p>Nothing to do - entry ${params.id} was not pending (already reviewed, or doesn't exist).</p>`),
    );
  }

  return responder.respondWithHtml(
    renderPage(`<p>${REVIEW_OUTCOME_LABELS[targetStatus]} entry ${params.id}.</p>`),
  );
}

// POST /api/leaderboard/approve?id&key - the actual mutation.
export function approveLeaderboardEntry(request: Request, env: Env, responder: Responder): Promise<Response> {
  return resolveReview(request, env, responder, "approved");
}

// POST /api/leaderboard/deny?id&key - the actual mutation.
export function denyLeaderboardEntry(request: Request, env: Env, responder: Responder): Promise<Response> {
  return resolveReview(request, env, responder, "rejected");
}
