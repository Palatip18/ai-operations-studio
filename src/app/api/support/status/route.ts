import { NextResponse } from "next/server";
import { isAuthenticatedRequest } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { lookupSimulatedTransaction } from "@/lib/support-backoffice";

export async function POST(request: Request) {
  if (!isAuthenticatedRequest(request)) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const rate = checkRateLimit(request, "support-status", 20, 10 * 60 * 1000);
  if (!rate.allowed) return NextResponse.json({ error: "Demo request limit reached." }, { status: 429, headers: { "Retry-After": String(rate.retryAfter) } });
  const body = (await request.json()) as { message?: string };
  const message = body.message?.trim();
  if (!message) return NextResponse.json({ error: "Message is required" }, { status: 400 });
  if (message.length > 500) return NextResponse.json({ error: "Message must be 500 characters or fewer" }, { status: 400 });
  return NextResponse.json(lookupSimulatedTransaction(message));
}

