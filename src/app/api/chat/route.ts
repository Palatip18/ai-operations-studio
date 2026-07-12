import { NextResponse } from "next/server";
import { isAuthenticatedRequest } from "@/lib/auth";
import { runLiveAssistant } from "@/lib/llm";
import { executeTool, routeTool } from "@/lib/tools";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  if (!isAuthenticatedRequest(request)) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const rate = checkRateLimit(request, "chat", 12, 10 * 60 * 1000);
  if (!rate.allowed) return NextResponse.json({ error: "Demo request limit reached. Please try again later." }, { status: 429, headers: { "Retry-After": String(rate.retryAfter) } });
  const body = (await request.json()) as { message?: string };
  const message = body.message?.trim();
  if (!message) return NextResponse.json({ error: "Message is required" }, { status: 400 });
  if (message.length > 500) return NextResponse.json({ error: "Message must be 500 characters or fewer" }, { status: 400 });

  if (process.env.AI_PROVIDER === "openai") {
    try {
      const liveResult = await runLiveAssistant(message);
      if (liveResult) return NextResponse.json(liveResult);
    } catch (error) {
      console.error("Live model failed; using deterministic fallback", error instanceof Error ? error.message : "Unknown error");
    }
  }

  const routed = routeTool(message);
  if (routed) {
    const result = executeTool(routed.name, routed.arguments);
    return NextResponse.json({ answer: result.answer, toolCalls: [result.trace], mode: "deterministic" });
  }
  return NextResponse.json({ answer: "This prototype can route requests to three tools. Ask about an expense or incident policy, request a workflow preview, or ask for retrieval evaluation metrics.", toolCalls: [], mode: "deterministic" });
}
