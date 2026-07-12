import { NextResponse } from "next/server";
import { isAuthenticatedRequest } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { runSupportAgent } from "@/lib/support-agent";
import { readCustomerContext } from "@/lib/support-customer";

export async function POST(request: Request) {
  if (!isAuthenticatedRequest(request)) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const customer = readCustomerContext(request);
  const rate = checkRateLimit(request, "support", 10, 10 * 60 * 1000);
  if (!rate.allowed) return NextResponse.json({ error: "Demo request limit reached. Please try again later." }, { status: 429, headers: { "Retry-After": String(rate.retryAfter) } });
  const body = (await request.json()) as { message?: string; previousUserMessages?: unknown };
  const message = body.message?.trim();
  if (!message) return NextResponse.json({ error: "Message is required" }, { status: 400 });
  if (message.length > 500) return NextResponse.json({ error: "Message must be 500 characters or fewer" }, { status: 400 });
  const previousUserMessages = Array.isArray(body.previousUserMessages)
    ? body.previousUserMessages.filter((item): item is string => typeof item === "string").slice(-4).map((item) => item.trim().slice(0, 500))
    : [];
  return NextResponse.json(await runSupportAgent(message, previousUserMessages, customer?.userId ?? null));
}
