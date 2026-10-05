import { Env } from "../../../index.ts";
import { Responder } from "../../utils/responder.ts";

export function isValidReviewKey(key: string | null, env: Env): key is string {
  return Boolean(env.REVIEW_APPROVAL_KEY) && key === env.REVIEW_APPROVAL_KEY;
}

// The review page has two views: the pending queue, and what's currently
// published (where an approved entry can be taken back down).
export type ReviewView = "queue" | "published";

export function reviewQueuePath(key: string, view: ReviewView = "queue"): string {
  const base = `/api/leaderboard/review-queue?key=${encodeURIComponent(key)}`;
  return view === "published" ? `${base}&view=published` : base;
}

interface ReviewRequestParams {
  id: number;
  key: string;
}

export function parseReviewParams(url: URL, env: Env, responder: Responder): ReviewRequestParams | Response {
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
