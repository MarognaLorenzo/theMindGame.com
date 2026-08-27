import { LobbyServer } from "./lobbyServerDO.ts";
import { LobbyRegistry } from "./lobbyRegistryDO.ts";
import { createLobby, joinLobby } from "./api/lobbyOperations.ts";
import {
  getLeaderboard,
  submitLeaderboardEntry,
} from "./api/leaderboard/leaderboardOperations.ts";
import { Responder } from "./api/utils/responder.ts";

export interface Env {
  LOBBY_SERVER: DurableObjectNamespace<LobbyServer>;
  LOBBY_REGISTRY: DurableObjectNamespace<LobbyRegistry>;
  DB: D1Database;
  ALLOWED_ORIGINS?: string;
}

const REGISTRY_OBJECT_NAME = "global-registry";

function getRegistryStub(env: Env): DurableObjectStub<LobbyRegistry> {
  const registryId = env.LOBBY_REGISTRY.idFromName(REGISTRY_OBJECT_NAME);
  return env.LOBBY_REGISTRY.get(registryId);
}

const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const responder = new Responder(request, env);

    try {
      if (request.method === "OPTIONS") {
        return responder.respondWithJson({}, 204);
      }

      const path = (new URL(request.url)).pathname;
      const registryStub = getRegistryStub(env);

      if (path === "/api/create") {
        return await createLobby(registryStub, env, responder);
      }

      if (path === "/api/join") {
        return await joinLobby(registryStub, request, env, responder);
      }

      if (path === "/api/leaderboard/submit" && request.method === "POST") {
        return await submitLeaderboardEntry(registryStub, request, env, responder);
      }

      if (path === "/api/leaderboard" && request.method === "GET") {
        return await getLeaderboard(request, env, responder);
      }
      return responder.respondWithError("Not Found", 404);
    } catch (err) {
      console.error("Unhandled error in worker fetch:", err);
      return responder.respondWithError("Internal Server Error", 500);
    }
  }
};

export default worker;

export { LobbyRegistry, LobbyServer };