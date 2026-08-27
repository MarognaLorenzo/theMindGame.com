
import { Env } from "../../index.ts";
const DEFAULT_ALLOWED_ORIGINS = ["http://localhost:3000"];

function resolveAllowedOrigins(env: Env): string[] {
  const raw = env.ALLOWED_ORIGINS?.trim();
  if (!raw) {
    return DEFAULT_ALLOWED_ORIGINS;
  }

  return raw
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}


// An allowlist entry of the form "*.example.com" matches any subdomain of that
// exact domain (e.g. a Cloudflare Pages preview URL like
// <hash>.themindgameonline3-0-pages.pages.dev) - never the bare shared suffix
// (".pages.dev" itself is a domain every Cloudflare Pages customer shares, so
// this only ever matches subdomains of a domain YOU explicitly listed, never
// an unrelated project's).
function isOriginAllowed(origin: string, allowedOrigins: string[]): boolean {
  return allowedOrigins.some((entry) => {
    if (entry.startsWith("*.")) {
      const suffix = entry.slice(1); // "*.foo.com" -> ".foo.com" (keeps the leading dot)
      return origin.length > suffix.length && origin.endsWith(suffix);
    }
    return origin === entry;
  });
}

export function buildCorsHeaders(request: Request, env: Env): Record<string, string> {
  const origin = request.headers.get("Origin")?.trim();
  const allowedOrigins = resolveAllowedOrigins(env);
  const allowAnyOrigin = allowedOrigins.includes("*");

  let allowedOrigin = DEFAULT_ALLOWED_ORIGINS[0];
  if (allowAnyOrigin) {
    allowedOrigin = "*";
  } else if (origin && isOriginAllowed(origin, allowedOrigins)) {
    allowedOrigin = origin;
  } else if (allowedOrigins.length > 0) {
    allowedOrigin = allowedOrigins[0];
  }

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
}

export function withCors(response: Response, request: Request, env: Env): Response {
  const headers = new Headers(response.headers);
  const corsHeaders = buildCorsHeaders(request, env);
  Object.entries(corsHeaders).forEach(([key, value]) => {
    headers.set(key, value);
  });

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
    webSocket: response.webSocket,
  });
}