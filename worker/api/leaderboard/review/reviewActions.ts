import { Env } from "../../../index.ts";
import { Responder } from "../../utils/responder.ts";
import { parseReviewParams, reviewQueuePath, ReviewView } from "./reviewParams.ts";

// The only moderation endpoints that mutate anything. Each is a POST from a
// button on one of the review pages - never a bare GET, which a chat client's
// link-preview crawler could trigger on its own.

async function transitionEntry(
  request: Request,
  env: Env,
  responder: Responder,
  fromStatus: "pending" | "approved",
  targetStatus: "approved" | "rejected" | "removed",
  returnTo: ReviewView,
): Promise<Response> {
  const url = new URL(request.url);
  const params = parseReviewParams(url, env, responder);
  if (params instanceof Response) {
    return params;
  }

  // A pending row resolves to approved or rejected; an approved row can later
  // be removed (taken off the public board after publication). The status
  // guard makes every transition idempotent: a double-click changes nothing.
  await env.DB.prepare(
    "UPDATE leaderboard SET status = ? WHERE id = ? AND status = ?",
  )
    .bind(targetStatus, params.id, fromStatus)
    .run();

  // Straight back to the view the button was on, so it can be worked through
  // in one sitting. 303 turns the POST into a GET.
  return new Response(null, {
    status: 303,
    headers: { Location: reviewQueuePath(params.key, returnTo) },
  });
}

// POST /api/leaderboard/approve?id&key - from the pending queue.
export function approveLeaderboardEntry(request: Request, env: Env, responder: Responder): Promise<Response> {
  return transitionEntry(request, env, responder, "pending", "approved", "queue");
}

// POST /api/leaderboard/deny?id&key - from the pending queue.
export function denyLeaderboardEntry(request: Request, env: Env, responder: Responder): Promise<Response> {
  return transitionEntry(request, env, responder, "pending", "rejected", "queue");
}

// POST /api/leaderboard/remove?id&key - takes an approved entry back off the
// public board. Only that one row: other entries under the same team name
// stay published (and keep the name auto-approvable).
export function removeLeaderboardEntry(request: Request, env: Env, responder: Responder): Promise<Response> {
  return transitionEntry(request, env, responder, "approved", "removed", "published");
}
