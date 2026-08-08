import { Env } from "../../index.ts";
import { withCors } from "./cors.ts";

export class Responder {
  constructor(private request: Request, private env: Env) {}

  public respondWithError(message: string, status: number = 400): Response {
    return withCors(
      new Response(JSON.stringify({ error: message }), {
        status,
        headers: { "Content-Type": "application/json" },
      }),
      this.request,
      this.env,
    );
  }

  public respondMissingField(fieldName: string): Response {
    return this.respondWithError(`Missing field: ${fieldName}`, 400);
  }

  public respondInvalidField(fieldName: string, message: string): Response {
    return this.respondWithError(`Invalid field ${fieldName}: ${message}`, 400);
  }

  public respondWithJson(data: any, status: number = 200): Response {
    return withCors(
      new Response(JSON.stringify(data), {
        status,
        headers: { "Content-Type": "application/json" },
      }),
      this.request,
      this.env,
    );
  }

  public respondWithWebSocket(webSocket: WebSocket): Response {
    console.log("Responding with WebSocket");
    return new Response(null, { status: 101, webSocket });
  }
}