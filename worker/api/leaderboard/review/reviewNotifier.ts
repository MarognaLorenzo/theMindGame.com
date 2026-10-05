import { LEADERBOARD_READ_LIMIT } from "../leaderboardTypes.ts";
import { PendingReviewEntry } from "./reviewQueue.ts";

// Optional: posts one daily Discord message summarising what's waiting for
// review (run from the Worker's cron trigger), so moderation doesn't require
// polling the database - and doesn't ping once per submission either.
// Configured per environment via the DISCORD_WEBHOOK_URL secret (never a plain
// [vars] entry - it's a bearer credential for posting into the channel);
// environments without it configured silently skip this.
export interface ReviewNotifierConfig {
  webhookUrl: string | undefined;
  // Both required to include the review-queue link; either missing falls back
  // to a raw SQL statement so review is still possible.
  publicBaseUrl: string | undefined;
  approvalKey: string | undefined;
}

export async function sendReviewDigest(
  config: ReviewNotifierConfig,
  queue: PendingReviewEntry[],
): Promise<void> {
  const { webhookUrl, publicBaseUrl, approvalKey } = config;
  if (!webhookUrl || queue.length === 0) {
    return;
  }

  const onBoard = queue.filter((entry) => entry.makesBoard).length;
  const offBoard = queue.length - onBoard;

  const actionLine =
    publicBaseUrl && approvalKey
      ? // Wrapped in <> so Discord's own link-preview crawler doesn't pre-fetch
        // it (harmless anyway - the queue page is read-only on GET, every
        // approve/deny is an explicit button POST).
        `Review: <${publicBaseUrl}/api/leaderboard/review-queue?key=${encodeURIComponent(approvalKey)}>`
      : "Review: `SELECT * FROM leaderboard WHERE status='pending';`";

  const content =
    `📋 **${queue.length}** leaderboard ${queue.length === 1 ? "entry needs" : "entries need"} review\n` +
    `🏆 ${onBoard} would make the top ${LEADERBOARD_READ_LIMIT} - review these first\n` +
    `▫️ ${offBoard} wouldn't\n` +
    actionLine;

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    if (!response.ok) {
      console.error(`Review webhook returned ${response.status}`);
    }
  } catch (err) {
    console.error("Failed to send review digest:", err);
  }
}
