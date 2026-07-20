import { NextResponse } from "next/server";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";
import { customerContextCookieOptions, SUPPORT_CUSTOMER_COOKIE } from "@/lib/support-customer";
import { SUPPORT_CHAT_SESSION_COOKIE, supportChatSessionCookieOptions } from "@/lib/support-chat-history";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions, maxAge: 0 });
  response.cookies.set(SUPPORT_CUSTOMER_COOKIE, "", { ...customerContextCookieOptions, maxAge: 0 });
  response.cookies.set(SUPPORT_CHAT_SESSION_COOKIE, "", { ...supportChatSessionCookieOptions, maxAge: 0 });
  return response;
}
