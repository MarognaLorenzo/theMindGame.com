import { Env } from "../../../index.ts";
import { Responder } from "../../utils/responder.ts";
import { renderCard } from "./reviewPage.ts";
import { parseReviewParams, reviewQueuePath } from "./reviewParams.ts";

// The only moderation endpoints that mutate anything. Each is a POST from a
// button on one of the review pages - never a bare GET, which a chat client's
// link-preview crawler could trigger on its own.

// A pending row resolves to approved or rejected; an approved row can later be
// removed (taken off the public board after publication).
export const REVIEW_OUTCOME_LABELS: Record<string, string> = {
  approved: "✅ approved",
  rejected: "🚫 rejected",
  removed: "🗑️ removed",
};

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
