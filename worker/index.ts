import { LobbyServer } from "./lobby-server.ts";
import { LobbyRegistry } from "./lobby-registry.ts";

export interface Env {
  LOBBY_SERVER: DurableObjectNamespace<LobbyServer>;
  LOBBY_REGISTRY: DurableObjectNamespace<LobbyRegistry>;
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "http://localhost:3000",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function withCors(response: Response): Response {
  const headers = new Headers(response.headers);
  Object.entries(CORS_HEADERS).forEach(([key, value]) => {
    headers.set(key, value);
  });

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
    webSocket: response.webSocket,
  });
}

const SHORT_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const SHORT_CODE_LENGTH = 6;
const SHORT_CODE_MAX_ATTEMPTS = 6;
const REGISTRY_OBJECT_NAME = "global-registry";

interface RegistryReserveResponse {
  ok: boolean;
}

interface RegistryResolveResponse {
  lobbyId: string | null;
}

function isLongLobbyId(value: string): boolean {
  return /^[0-9a-f]{64}$/i.test(value);
}

function generateShortCode(): string {
  const random = crypto.getRandomValues(new Uint8Array(SHORT_CODE_LENGTH));
  return Array.from(random, (byte) => {
    return SHORT_CODE_ALPHABET[byte % SHORT_CODE_ALPHABET.length];
  }).join("");
}

function normalizeShortCode(value: string): string {
  return value.trim().toUpperCase();
}

function getRegistryStub(env: Env): DurableObjectStub {
  const registryId = env.LOBBY_REGISTRY.idFromName(REGISTRY_OBJECT_NAME);
  return env.LOBBY_REGISTRY.get(registryId);
}

async function reserveShortCode(
  env: Env,
  code: string,
  lobbyId: string,
): Promise<boolean> {
  const registryStub = getRegistryStub(env);
  const res = await registryStub.fetch("https://lobby-registry/reserve", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, lobbyId }),
  });

  if (!res.ok) {
    return false;
  }

  const data = (await res.json()) as RegistryReserveResponse;
  return data.ok;
}

async function resolveShortCode(env: Env, code: string): Promise<string | null> {
  const registryStub = getRegistryStub(env);
  const res = await registryStub.fetch("https://lobby-registry/resolve", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: normalizeShortCode(code) }),
  });

  if (!res.ok) {
    return null;
  }

  const data = (await res.json()) as RegistryResolveResponse;
  return data.lobbyId;
}

async function createShortCodeMapping(
  env: Env,
  lobbyId: string,
): Promise<string | null> {
  for (let attempt = 0; attempt < SHORT_CODE_MAX_ATTEMPTS; attempt += 1) {
    const code = normalizeShortCode(generateShortCode());
    const reserved = await reserveShortCode(env, code, lobbyId);
    if (reserved) {
      return code;
    }
  }

  return null;
}

const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    if (path === "/api/create") {
      const id = env.LOBBY_SERVER.newUniqueId();
      const longLobbyId = id.toString();
      const shortLobbyId = await createShortCodeMapping(env, longLobbyId);

      if (!shortLobbyId) {
        return withCors(
          new Response("Could not allocate lobby code", { status: 500 }),
        );
      }

      return withCors(
        new Response(JSON.stringify({ lobbyId: shortLobbyId }), {
          headers: { "Content-Type": "application/json" },
        }),
      );
    }

    if (path === "/api/join") {
      const lobbyIdString = url.searchParams.get("lobbyId");
      const name = url.searchParams.get("name");

      if (!lobbyIdString || !name) {
        return withCors(
          new Response("Missing lobbyId or name", { status: 400 }),
        );
      }

      let resolvedLobbyId = lobbyIdString;
      if (!isLongLobbyId(lobbyIdString)) {
        const mappedLobbyId = await resolveShortCode(env, lobbyIdString);
        if (!mappedLobbyId) {
          return withCors(
            new Response("Unknown lobby ID", { status: 404 }),
          );
        }
        resolvedLobbyId = mappedLobbyId;
      }

      const id = env.LOBBY_SERVER.idFromString(resolvedLobbyId);
      const lobbyStub = env.LOBBY_SERVER.get(id);
      return lobbyStub.fetch(request);
    }

    return withCors(new Response("Not Found", { status: 404 }));
  },
};

export default worker;

export { LobbyRegistry, LobbyServer };