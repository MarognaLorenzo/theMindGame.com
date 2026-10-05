import { Env } from "../../../index.ts";
import { Responder } from "../../utils/responder.ts";
import { REVIEW_OUTCOME_LABELS } from "./reviewActions.ts";
import { escapeHtml, renderCard } from "./reviewPage.ts";
import { parseReviewParams } from "./reviewParams.ts";

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
