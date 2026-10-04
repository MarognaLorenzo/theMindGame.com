// A team name a human has already approved once doesn't need reviewing again:
// returning teams get their new entry published straight away. Matched
// case-insensitively (SQLite's NOCASE folds ASCII letters only, which errs on
// the side of sending a name to review rather than approving it).
export async function isPreviouslyApprovedTeamName(
  db: D1Database,
  teamName: string,
): Promise<boolean> {
  const row = await db
    .prepare(
      `SELECT 1 FROM leaderboard
        WHERE status = 'approved' AND team_name = ? COLLATE NOCASE
        LIMIT 1`,
    )
    .bind(teamName)
    .first();
  return row !== null;
}
