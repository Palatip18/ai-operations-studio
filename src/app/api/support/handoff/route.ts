import { NextResponse } from "next/server";
import { isAuthenticatedRequest } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { handleSimulatedHandoff, type HandoffInput } from "@/lib/support-handoff";

export async function POST(request: Request) {
  if (!isAuthenticatedRequest(request)) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const rate = checkRateLimit(request, "support-handoff", 15, 10 * 60 * 1000);
  if (!rate.allowed) return NextResponse.json({ error: "Demo handoff limit reached." }, { status: 429, headers: { "Retry-After": String(rate.retryAfter) } });

  const body = await request.json() as Partial<HandoffInput>;
  const required = [body.customerMessage, body.intent, body.risk, body.escalationReason, body.locale, body.idempotencyKey];
  if (required.some((value) => typeof value !== "string" || !value.trim())) return NextResponse.json({ error: "Required handoff fields are missing." }, { status: 400 });
  if (body.customerMessage!.length > 1_000 || body.idempotencyKey!.length > 128) return NextResponse.json({ error: "Handoff payload exceeds demo limits." }, { status: 400 });

  return NextResponse.json(handleSimulatedHandoff(body as HandoffInput));
}
