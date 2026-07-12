import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Password-gated portfolio demo access. This is a lightweight signed-cookie
 * session for a public prototype — it is NOT production authentication.
 * There is no user database, no account model, and no external identity
 * provider. A single shared demo password (DEMO_PASSWORD) unlocks the demo.
 */

export const SESSION_COOKIE = "demo_session";
export const SESSION_MAX_AGE_SECONDS = 24 * 60 * 60; // 24 hours

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

/**
 * The demo password doubles as the HMAC signing key. It is read lazily at
 * call time and never logged, printed, returned, or included in any response.
 */
function getSecret(): string {
  const secret = process.env.DEMO_PASSWORD;
  if (!secret) throw new Error("DEMO_PASSWORD is not configured");
  return secret;
}

export function isDemoAccessConfigured(): boolean {
  return Boolean(process.env.DEMO_PASSWORD);
}

function sign(payload: string): string {
  return base64url(createHmac("sha256", getSecret()).update(payload).digest());
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

/** Constant-time comparison of a candidate password against DEMO_PASSWORD. */
export function verifyPassword(candidate: string): boolean {
  if (!candidate) return false;
  return safeEqual(candidate, getSecret());
}

/** Create a signed session token that expires 24 hours after issue. */
export function createSessionToken(now = Date.now()): string {
  const payload = base64url(JSON.stringify({ exp: now + SESSION_MAX_AGE_SECONDS * 1000 }));
  return `${payload}.${sign(payload)}`;
}

/** Verify signature and expiry of a session token. */
export function verifySessionToken(token: string | undefined | null, now = Date.now()): boolean {
  if (!token) return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;
  if (!safeEqual(signature, sign(payload))) return false;
  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString()) as { exp?: number };
    return typeof decoded.exp === "number" && decoded.exp > now;
  } catch {
    return false;
  }
}

/** Extract the raw session token from a Cookie header, if present. */
export function readSessionCookie(cookieHeader: string | null): string | undefined {
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(";")) {
    const index = part.indexOf("=");
    if (index === -1) continue;
    if (part.slice(0, index).trim() === SESSION_COOKIE) {
      return decodeURIComponent(part.slice(index + 1).trim());
    }
  }
  return undefined;
}

/** True when an incoming request carries a valid, unexpired session cookie. */
export function isAuthenticatedRequest(request: Request, now = Date.now()): boolean {
  return verifySessionToken(readSessionCookie(request.headers.get("cookie")), now);
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};
