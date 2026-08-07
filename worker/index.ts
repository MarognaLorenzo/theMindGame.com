import { LobbyServer } from "./lobby-server.ts";
import { LobbyRegistry } from "./lobbyRegistryDO.ts";
import { createLobby, joinLobby } from "./api/lobbyOperations.ts";
import { Responder } from "./api/responder.ts";

export interface Env {
  LOBBY_SERVER: DurableObjectNamespace<LobbyServer>;
  LOBBY_REGISTRY: DurableObjectNamespace<LobbyRegistry>;
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

    if (request.method === "OPTIONS") {
      return responder.respondWithJson({}, 204);
    }

    const path = (new URL(request.url)).pathname;
    const registryStub = getRegistryStub(env);

    if (path === "/api/create") {
      return createLobby(registryStub, env, responder);
    }

    if (path === "/api/join") {
      return joinLobby(registryStub, request, env, responder);
    }
    return responder.respondWithError("Not Found", 404);
  }
};

export default worker;

export { LobbyRegistry, LobbyServer };