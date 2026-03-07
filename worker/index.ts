import { LobbyServer } from "./lobby.ts";

export interface Env {
  LOBBY_SERVER: DurableObjectNamespace<LobbyServer>;
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

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    if (path === "/api/create") {
      const id = env.LOBBY_SERVER.newUniqueId();
      return withCors(
        new Response(JSON.stringify({ lobbyId: id.toString() }), {
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

      const id = env.LOBBY_SERVER.idFromString(lobbyIdString);
      const lobbyStub = env.LOBBY_SERVER.get(id);
      return lobbyStub.fetch(request);
    }

    return withCors(new Response("Not Found", { status: 404 }));
  },
};

export { LobbyServer };