import { Env } from "../../../index.ts";
import { Responder } from "../../utils/responder.ts";
import { LEADERBOARD_READ_LIMIT, VALID_LEADERBOARD_PLAYER_COUNTS } from "../leaderboardTypes.ts";
import { escapeHtml, renderPage } from "./reviewPage.ts";
import { isValidReviewKey, reviewQueuePath, ReviewView } from "./reviewParams.ts";
import {
  fetchPublishedEntries,
  fetchReviewQueue,
  PendingReviewEntry,
  PublishedEntry,
} from "./reviewQueue.ts";

function renderQueueSection(title: string, entries: PendingReviewEntry[], key: string): string {
  if (entries.length === 0) {
    return "";
  }
  const rows = entries
    .map((entry) => {
      const query = `id=${entry.id}&key=${encodeURIComponent(key)}`;
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
      const query = `id=${entry.id}&key=${encodeURIComponent(key)}`;
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
      : VALID_LEADERBOARD_PLAYER_COUNTS.map((count) =>
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
      <div class="card">
        <h1>Leaderboard review</h1>
        ${content}
      </div>
    `),
  );
}
