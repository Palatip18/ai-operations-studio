import { NextResponse } from "next/server";
import { evaluateRetrieval, evaluateSemanticRetrieval } from "@/lib/evaluation";
import { isOpenAIConfigured } from "@/lib/openai";
import { checkRateLimit } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const rate = checkRateLimit(request, "evaluation", 5, 10 * 60 * 1000);
  if (!rate.allowed) return NextResponse.json({ error: "Evaluation limit reached. Please try again later." }, { status: 429, headers: { "Retry-After": String(rate.retryAfter) } });
  const mode = new URL(request.url).searchParams.get("mode");
  return NextResponse.json(mode === "semantic" || (mode !== "local" && isOpenAIConfigured()) ? await evaluateSemanticRetrieval() : evaluateRetrieval());
}
