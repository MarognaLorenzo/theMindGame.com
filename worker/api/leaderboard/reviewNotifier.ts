// Optional: pings a Discord webhook whenever a submission lands as 'pending',
// so moderation doesn't require polling the database. Configured per
// environment via the DISCORD_WEBHOOK_URL secret (never a plain [vars] entry -
// it's a bearer credential for posting into the channel); environments
// without it configured (e.g. production, for now) silently skip this.
interface PendingSubmissionNotice {
  id: number;
  teamName: string;
  countryCode: string;
  playerCount: number;
  finalSeconds: number;
}

export interface ReviewNotifierConfig {
  webhookUrl: string | undefined;
  // Both required to include the one-click approve link; either missing
  // falls back to a raw SQL statement so review is still possible.
  publicBaseUrl: string | undefined;
  approvalKey: string | undefined;
}

export async function notifyPendingSubmission(
  config: ReviewNotifierConfig,
  entry: PendingSubmissionNotice,
): Promise<void> {
  const { webhookUrl, publicBaseUrl, approvalKey } = config;
  if (!webhookUrl) {
    return;
  }

  const actionLine =
    publicBaseUrl && approvalKey
      ? // Wrapped in <> so Discord's own link-preview crawler doesn't pre-fetch
        // (and thereby land on, though not mutate - GET is confirm-only, with
        // both approve/deny as explicit buttons on that page) it.
        `Review: <${publicBaseUrl}/api/leaderboard/review?id=${entry.id}&key=${encodeURIComponent(approvalKey)}>`
      : `Approve: \`UPDATE leaderboard SET status='approved' WHERE id=${entry.id};\` ` +
        `/ Deny: \`UPDATE leaderboard SET status='rejected' WHERE id=${entry.id};\``;

  const content =
    `🔔 New leaderboard submission needs review\n` +
    `**${entry.teamName}** (${entry.countryCode}) - ${entry.playerCount} players, ${entry.finalSeconds.toFixed(1)}s\n` +
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
    // A notification failure must never affect the actual submission.
    console.error("Failed to notify review webhook:", err);
  }
}
