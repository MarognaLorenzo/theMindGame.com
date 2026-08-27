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

export async function notifyPendingSubmission(
  webhookUrl: string | undefined,
  entry: PendingSubmissionNotice,
): Promise<void> {
  if (!webhookUrl) {
    return;
  }

  const content =
    `🔔 New leaderboard submission needs review\n` +
    `**${entry.teamName}** (${entry.countryCode}) - ${entry.playerCount} players, ${entry.finalSeconds.toFixed(1)}s\n` +
    `Approve: \`UPDATE leaderboard SET status='approved' WHERE id=${entry.id};\``;

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
