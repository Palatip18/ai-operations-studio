import { NextResponse } from "next/server";

import { isAuthenticatedRequest } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  endSupportChatSession,
  listSupportChatSessions,
  readSupportChatSessionId,
  SUPPORT_CHAT_SESSION_COOKIE,
  supportChatSessionCookieOptions,
  supportChatStorageMode,
} from "@/lib/support-chat-history";

export async function GET(request: Request) {
  if (!isAuthenticatedRequest(request)) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const rate = checkRateLimit(request, "support-history", 60, 10 * 60 * 1000);
  if (!rate.allowed) return NextResponse.json({ error: "Demo request limit reached." }, { status: 429, headers: { "Retry-After": String(rate.retryAfter) } });
  const requestedLimit = Number(new URL(request.url).searchParams.get("limit") ?? 30);
  const sessions = await listSupportChatSessions(Number.isFinite(requestedLimit) ? requestedLimit : 30);
  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    storageMode: supportChatStorageMode(),
    retentionDays: 30,
    containsRedactedChatText: true,
    sessions,
  }, { headers: { "Cache-Control": "no-store" } });
}

export async function DELETE(request: Request) {
  if (!isAuthenticatedRequest(request)) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const sessionId = readSupportChatSessionId(request);
  if (sessionId) await endSupportChatSession(sessionId);
  const response = NextResponse.json({ success: true, endedSessionId: sessionId });
  response.cookies.set(SUPPORT_CHAT_SESSION_COOKIE, "", { ...supportChatSessionCookieOptions, maxAge: 0 });
  return response;
}
