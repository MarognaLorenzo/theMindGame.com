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
    // The Fetch spec forbids a body on these statuses; the runtime throws if one is
    // attached. 204 in particular is what our own OPTIONS preflight handler returns,
    // so this isn't just theoretical - every cross-origin POST/PUT/etc. with a JSON
    // body triggers a preflight that would otherwise crash before CORS headers are
    // ever attached, which the browser then reports as a CORS failure.
    const isNullBodyStatus = status === 101 || status === 204 || status === 205 || status === 304;

    return withCors(
      new Response(isNullBodyStatus ? null : JSON.stringify(data), {
        status,
        headers: isNullBodyStatus ? {} : { "Content-Type": "application/json" },
      }),
      this.request,
      this.env,
    );
  }

  public respondWithWebSocket(webSocket: WebSocket): Response {
    return new Response(null, { status: 101, webSocket });
  }

  public respondWithHtml(html: string, status: number = 200): Response {
    return withCors(
      new Response(html, {
        status,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      }),
      this.request,
      this.env,
    );
  }
}