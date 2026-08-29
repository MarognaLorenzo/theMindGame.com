import { Env } from "../index.ts";

// Server-side gameplay analytics via Workers Analytics Engine. One datapoint per
// meaningful game event; Cloudflare retains it ~90 days (sampled under load) and
// it is queried later over the SQL API. No cookies, no PII, writes are
// non-blocking.
//
// Fixed column layout so every SQL query stays stable:
//   blob1 / index1 = event name (index lets each event type sample on its own)
//   blob2 = lobby short code ("" when unknown) — lets you group a lobby's
//           created / started / won|lost events together
//   double1..double5 = playerCount, finalSeconds, livesLostCount,
//                      shurikensUsedCount, level  (0 when not applicable)

export type AnalyticsEventName =
  | "lobby_created"
  | "game_started"
  | "game_won"
  | "game_lost";

export interface AnalyticsFields {
  shortCode?: string;
  playerCount?: number;
  finalSeconds?: number;
  livesLostCount?: number;
  shurikensUsedCount?: number;
  level?: number;
}

export function track(
  env: Env,
  name: AnalyticsEventName,
  fields: AnalyticsFields = {},
): void {
  if (!env.ANALYTICS) {
    return;
  }

  try {
    env.ANALYTICS.writeDataPoint({
      indexes: [name],
      blobs: [name, fields.shortCode ?? ""],
      doubles: [
        fields.playerCount ?? 0,
        fields.finalSeconds ?? 0,
        fields.livesLostCount ?? 0,
        fields.shurikensUsedCount ?? 0,
        fields.level ?? 0,
      ],
    });
  } catch (err) {
    console.error("analytics writeDataPoint failed", err);
  }
}
