import { NextResponse } from "next/server";
import { createSessionToken, isDemoAccessConfigured, SESSION_COOKIE, SESSION_MAX_AGE_SECONDS, sessionCookieOptions, verifyPassword } from "@/lib/auth";
import { clearFailures, clientKey, isLockedOut, recordFailure, retryAfterSeconds } from "@/lib/login-rate-limit";

export async function POST(request: Request) {
  if (!isDemoAccessConfigured()) {
    return NextResponse.json({ error: "Demo access is not configured." }, { status: 503 });
  }
  const client = clientKey(request);
  if (isLockedOut(client)) {
    const retryAfter = retryAfterSeconds(client);
    return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429, headers: { "Retry-After": String(retryAfter) } });
  }

  let password = "";
  try {
    const body = (await request.json()) as { password?: unknown };
    if (typeof body.password === "string") password = body.password;
  } catch {
    password = "";
  }

  if (!verifyPassword(password)) {
    recordFailure(client);
    return NextResponse.json({ error: "Invalid password." }, { status: 401 });
  }

  clearFailures(client);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, createSessionToken(), { ...sessionCookieOptions, maxAge: SESSION_MAX_AGE_SECONDS });
  return response;
}
