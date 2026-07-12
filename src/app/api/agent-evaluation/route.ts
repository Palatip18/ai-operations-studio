import { NextResponse } from "next/server";
import { isAuthenticatedRequest } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { runAgentEvaluationSuite } from "@/lib/agent-evaluation";

export async function GET(request: Request) {
  if (!isAuthenticatedRequest(request)) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const rate = checkRateLimit(request, "agent-evaluation", 5, 10 * 60 * 1000);
  if (!rate.allowed) return NextResponse.json({ error: "Evaluation limit reached. Please try again later." }, { status: 429, headers: { "Retry-After": String(rate.retryAfter) } });
  return NextResponse.json(await runAgentEvaluationSuite());
}
