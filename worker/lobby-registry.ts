import { DurableObject } from "cloudflare:workers";

interface ReserveRequest {
  code: string;
  lobbyId: string;
}

interface ResolveRequest {
  code: string;
}

interface ReserveResponse {
  ok: boolean;
}

interface ResolveResponse {
  lobbyId: string | null;
}

export class LobbyRegistry extends DurableObject {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "POST" && url.pathname === "/reserve") {
      return this.handleReserve(request);
    }

    if (request.method === "POST" && url.pathname === "/resolve") {
      return this.handleResolve(request);
    }

    return new Response("Not Found", { status: 404 });
  }

  private async handleReserve(request: Request): Promise<Response> {
    const payload = (await request.json()) as ReserveRequest;
    if (!payload.code || !payload.lobbyId) {
      return new Response(JSON.stringify({ ok: false } satisfies ReserveResponse), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const existing = await this.ctx.storage.get<string>(payload.code);
    if (existing && existing !== payload.lobbyId) {
      return new Response(JSON.stringify({ ok: false } satisfies ReserveResponse), {
        status: 409,
        headers: { "Content-Type": "application/json" },
      });
    }

    await this.ctx.storage.put(payload.code, payload.lobbyId);
    return new Response(JSON.stringify({ ok: true } satisfies ReserveResponse), {
      headers: { "Content-Type": "application/json" },
    });
  }

  private async handleResolve(request: Request): Promise<Response> {
    const payload = (await request.json()) as ResolveRequest;
    if (!payload.code) {
      return new Response(
        JSON.stringify({ lobbyId: null } satisfies ResolveResponse),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const lobbyId = await this.ctx.storage.get<string>(payload.code);
    return new Response(JSON.stringify({ lobbyId: lobbyId ?? null } satisfies ResolveResponse), {
      headers: { "Content-Type": "application/json" },
    });
  }
}
