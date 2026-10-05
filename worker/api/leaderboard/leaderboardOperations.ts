import { Env, LobbyRegistry } from "../../index.ts";
import { Responder } from "../utils/responder.ts";
import { LEADERBOARD_READ_LIMIT } from "./leaderboardTypes.ts";
import {
  fetchPublishedEntries,
  fetchReviewQueue,
  PendingReviewEntry,
  PublishedEntry,
} from "./reviewQueue.ts";

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
  .card.wide { max-width: 40rem; width: 100%; text-align: left; align-self: flex-start; }
  button { margin-top: 1rem; padding: 0.75rem 1.5rem; border-radius: 0.75rem; border: none; background: #7ce4c0; color: #0a1712; font-weight: 600; font-size: 1rem; cursor: pointer; }
  .deny { background: #f08f8f; }
  .queue { list-style: none; padding: 0; margin: 0 0 2rem; }
  .queue li { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap; padding: 0.75rem 0; border-bottom: 1px solid #ffffff1a; }
  .queue .meta { color: #9aa7b5; font-size: 0.875rem; }
  .queue .actions { display: flex; gap: 0.5rem; }
  .queue button { margin-top: 0; padding: 0.5rem 1rem; font-size: 0.875rem; }
  .nav { display: flex; gap: 1.25rem; margin-bottom: 1.5rem; }
  .nav a { color: #7ce4c0; }
  .nav a.current { color: #eff3f8; font-weight: 600; text-decoration: none; }
</style>
</head><body>${body}</body></html>`;
}

function renderCard(body: string): string {
  return renderPage(`<div class="card">${body}</div>`);
}

function isValidReviewKey(key: string | null, env: Env): key is string {
  return Boolean(env.REVIEW_APPROVAL_KEY) && key === env.REVIEW_APPROVAL_KEY;
}

// The review page has two views: the pending queue, and what's currently
// published (where an approved entry can be taken back down).
type ReviewView = "queue" | "published";

function reviewQueuePath(key: string, view: ReviewView = "queue"): string {
  const base = `/api/leaderboard/review-queue?key=${encodeURIComponent(key)}`;
  return view === "published" ? `${base}&view=published` : base;
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
  if (!isValidReviewKey(key, env)) {
    return responder.respondWithError("Invalid or missing key", 403);
  }

  return { id, key };
}

// A pending row resolves to approved or rejected; an approved row can later be
// removed (taken off the public board after publication).
const REVIEW_OUTCOME_LABELS: Record<string, string> = {
  approved: "✅ approved",
  rejected: "🚫 rejected",
  removed: "🗑️ removed",
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
    return responder.respondWithHtml(renderCard(`<p>No leaderboard entry with id ${params.id}.</p>`), 404);
  }

  const outcomeLabel = REVIEW_OUTCOME_LABELS[row.status];
  if (outcomeLabel) {
    return responder.respondWithHtml(
      renderCard(`<p>"${escapeHtml(row.team_name)}" was already ${outcomeLabel}.</p>`),
    );
  }

  const query = `id=${params.id}&key=${encodeURIComponent(params.key)}`;
  return responder.respondWithHtml(
    renderCard(`
      <p>Review this leaderboard entry:</p>
      <p><strong>${escapeHtml(row.team_name)}</strong> (${escapeHtml(row.country_code)})<br>
      ${row.player_count} players · ${row.final_seconds.toFixed(1)}s</p>
      <div style="display:flex;gap:0.75rem;justify-content:center;flex-wrap:wrap;">
        <form method="POST" action="/api/leaderboard/approve?${query}">
          <button type="submit">Approve</button>
        </form>
        <form method="POST" action="/api/leaderboard/deny?${query}">
          <button type="submit" class="deny">Deny</button>
        </form>
      </div>
    `),
  );
}

async function transitionEntry(
  request: Request,
  env: Env,
  responder: Responder,
  fromStatus: "pending" | "approved",
  targetStatus: "approved" | "rejected" | "removed",
): Promise<Response> {
  const url = new URL(request.url);
  const params = parseReviewParams(url, env, responder);
  if (params instanceof Response) {
    return params;
  }

  // The status guard makes every transition idempotent: a double-click or a
  // refresh after the fact changes nothing.
  const result = await env.DB.prepare(
    "UPDATE leaderboard SET status = ? WHERE id = ? AND status = ?",
  )
    .bind(targetStatus, params.id, fromStatus)
    .run();

  // Actions taken from the review page go straight back to the view they came
  // from, so it can be worked through in one sitting. 303 turns the POST into
  // a GET.
  const from = url.searchParams.get("from");
  if (from === "queue" || from === "published") {
    return new Response(null, {
      status: 303,
      headers: { Location: reviewQueuePath(params.key, from) },
    });
  }

  if (result.meta.changes === 0) {
    return responder.respondWithHtml(
      renderCard(`<p>Nothing to do - entry ${params.id} was not ${fromStatus} (already handled, or doesn't exist).</p>`),
    );
  }

  return responder.respondWithHtml(
    renderCard(`<p>${REVIEW_OUTCOME_LABELS[targetStatus]} entry ${params.id}.</p>`),
  );
}

function renderQueueSection(title: string, entries: PendingReviewEntry[], key: string): string {
  if (entries.length === 0) {
    return "";
  }
  const rows = entries
    .map((entry) => {
      const query = `id=${entry.id}&key=${encodeURIComponent(key)}&from=queue`;
      return `
        <li>
          <div>
            <strong>${escapeHtml(entry.team_name)}</strong> (${escapeHtml(entry.country_code)})<br>
            <span class="meta">${entry.player_count} players · ${entry.final_seconds.toFixed(1)}s · ${escapeHtml(entry.created_at)} UTC</span>
          </div>
          <div class="actions">
            <form method="POST" action="/api/leaderboard/approve?${query}"><button type="submit">Approve</button></form>
            <form method="POST" action="/api/leaderboard/deny?${query}"><button type="submit" class="deny">Deny</button></form>
          </div>
        </li>`;
    })
    .join("");
  return `<h2>${title} (${entries.length})</h2><ul class="queue">${rows}</ul>`;
}

function renderPublishedSection(playerCount: number, entries: PublishedEntry[], key: string): string {
  if (entries.length === 0) {
    return "";
  }
  const rows = entries
    .map((entry) => {
      const query = `id=${entry.id}&key=${encodeURIComponent(key)}&from=published`;
      return `
        <li>
          <div>
            <strong>#${entry.rank} ${escapeHtml(entry.team_name)}</strong> (${escapeHtml(entry.country_code)})<br>
            <span class="meta">${entry.final_seconds.toFixed(1)}s · ${escapeHtml(entry.created_at)} UTC</span>
          </div>
          <div class="actions">
            <form method="POST" action="/api/leaderboard/remove?${query}" onsubmit="return confirm('Take this entry off the public leaderboard?')">
              <button type="submit" class="deny">Remove</button>
            </form>
          </div>
        </li>`;
    })
    .join("");
  return `<h2>${playerCount} players (${entries.length})</h2><ul class="queue">${rows}</ul>`;
}

function renderReviewNav(key: string, current: ReviewView, pendingCount: number): string {
  const link = (view: ReviewView, label: string) =>
    `<a href="${reviewQueuePath(key, view)}"${view === current ? ' class="current"' : ""}>${label}</a>`;
  return `<nav class="nav">${link("queue", `Pending (${pendingCount})`)}${link("published", "Published")}</nav>`;
}

async function renderQueueView(env: Env, key: string): Promise<string> {
  const queue = await fetchReviewQueue(env.DB);
  const body =
    queue.length === 0
      ? "<p>Nothing to review - the queue is empty. 🎉</p>"
      : renderQueueSection(`🏆 Would make the top ${LEADERBOARD_READ_LIMIT}`, queue.filter((e) => e.makesBoard), key) +
        renderQueueSection(`Wouldn't make the top ${LEADERBOARD_READ_LIMIT}`, queue.filter((e) => !e.makesBoard), key);
  return renderReviewNav(key, "queue", queue.length) + body;
}

async function renderPublishedView(env: Env, key: string): Promise<string> {
  const [queue, published] = await Promise.all([fetchReviewQueue(env.DB), fetchPublishedEntries(env.DB)]);
  const body =
    published.length === 0
      ? "<p>Nothing is published yet.</p>"
      : VALID_PLAYER_COUNTS.map((count) =>
          renderPublishedSection(count, published.filter((e) => e.player_count === count), key),
        ).join("");
  return renderReviewNav(key, "published", queue.length) + body;
}

// GET /api/leaderboard/review-queue?key[&view=published] - the moderation page.
// Default view: every pending entry, those that would make the public board
// first. Published view: what the public board currently shows, each entry
// removable. Read-only like the single review page: every action is its own
// POST form.
export async function renderReviewQueue(
  request: Request,
  env: Env,
  responder: Responder,
): Promise<Response> {
  const url = new URL(request.url);
  const key = url.searchParams.get("key");
  if (!isValidReviewKey(key, env)) {
    return responder.respondWithError("Invalid or missing key", 403);
  }

  const content =
    url.searchParams.get("view") === "published"
      ? await renderPublishedView(env, key)
      : await renderQueueView(env, key);

  return responder.respondWithHtml(
    renderPage(`
      <div class="card wide">
        <h1>Leaderboard review</h1>
        ${content}
      </div>
    `),
  );
}

// POST /api/leaderboard/approve?id&key - the actual mutation.
export function approveLeaderboardEntry(request: Request, env: Env, responder: Responder): Promise<Response> {
  return transitionEntry(request, env, responder, "pending", "approved");
}

// POST /api/leaderboard/deny?id&key - the actual mutation.
export function denyLeaderboardEntry(request: Request, env: Env, responder: Responder): Promise<Response> {
  return transitionEntry(request, env, responder, "pending", "rejected");
}

// POST /api/leaderboard/remove?id&key - takes an approved entry back off the
// public board. Only that one row: other entries under the same team name
// stay published (and keep the name auto-approvable).
export function removeLeaderboardEntry(request: Request, env: Env, responder: Responder): Promise<Response> {
  return transitionEntry(request, env, responder, "approved", "removed");
}
