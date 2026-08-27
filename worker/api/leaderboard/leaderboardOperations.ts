import { Env, LobbyRegistry } from "../../index.ts";
import { Responder } from "../utils/responder.ts";

// Public read model for a single leaderboard row.
interface LeaderboardRow {
  team_name: string;
  country_code: string;
  player_count: number;
  final_seconds: number;
  lives_lost_count: number;
  shurikens_used_count: number;
  created_at: string;
}

const LEADERBOARD_READ_LIMIT = 100;
const VALID_PLAYER_COUNTS = [2, 3, 4];

// POST /api/leaderboard/submit
// Body: { shortCode, token, teamName, countryCode }
// Resolves the shortCode to its LobbyServer DO (exactly like joinLobby) and
// hands the submission to that DO, which owns validation and the D1 insert.
export async function submitLeaderboardEntry(
  registryStub: DurableObjectStub<LobbyRegistry>,
  request: Request,
  env: Env,
  responder: Responder,
): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return responder.respondWithError("Invalid JSON body", 400);
  }

  const { shortCode, token, teamName, countryCode } = (body ?? {}) as Record<
    string,
    unknown
  >;

  if (typeof shortCode !== "string" || !shortCode) {
    return responder.respondMissingField("shortCode");
  }
  if (typeof token !== "string" || !token) {
    return responder.respondMissingField("token");
  }
  if (typeof teamName !== "string") {
    return responder.respondMissingField("teamName");
  }
  if (typeof countryCode !== "string") {
    return responder.respondMissingField("countryCode");
  }

  const lobbyDOId = await registryStub.getValue(shortCode);
  if (!lobbyDOId) {
    return responder.respondWithError(`Lobby with ID ${shortCode} not found`, 404);
  }

  const lobbyStub = env.LOBBY_SERVER.get(
    env.LOBBY_SERVER.idFromString(lobbyDOId),
  );

  const result = await lobbyStub.submitLeaderboardEntry(
    token,
    teamName,
    countryCode,
    shortCode,
  );

  if (!result.ok) {
    return responder.respondWithError(result.error, result.status);
  }
  return responder.respondWithJson({ ok: true }, 201);
}

// GET /api/leaderboard?playerCount=2|3|4
// Returns approved entries for the given team size, fastest first.
export async function getLeaderboard(
  request: Request,
  env: Env,
  responder: Responder,
): Promise<Response> {
  const playerCount = Number(
    new URL(request.url).searchParams.get("playerCount"),
  );
  if (!VALID_PLAYER_COUNTS.includes(playerCount)) {
    return responder.respondInvalidField("playerCount", "must be 2, 3, or 4");
  }

  const { results } = await env.DB.prepare(
    `SELECT team_name, country_code, player_count, final_seconds,
            lives_lost_count, shurikens_used_count, created_at
       FROM leaderboard
      WHERE status = 'approved' AND player_count = ?
      ORDER BY final_seconds ASC
      LIMIT ?`,
  )
    .bind(playerCount, LEADERBOARD_READ_LIMIT)
    .all<LeaderboardRow>();

  return responder.respondWithJson({ entries: results });
}
