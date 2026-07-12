import { NextResponse } from "next/server";
import { searchKnowledge } from "@/lib/knowledge";

export async function POST(request: Request) {
  const body = (await request.json()) as { message?: string };
  const message = body.message?.trim();
  if (!message) return NextResponse.json({ error: "Message is required" }, { status: 400 });

  const lower = message.toLowerCase();
  if (lower.includes("policy") || lower.includes("onboard") || lower.includes("incident") || lower.includes("expense")) {
    const results = searchKnowledge(message);
    return NextResponse.json({
      answer: results.length
        ? `I searched the sample knowledge base and found: ${results[0].document.content}`
        : "I searched the sample knowledge base but did not find a grounded answer.",
      toolCall: { name: "search_knowledge", arguments: { query: message }, resultCount: results.length },
      mode: "mock",
    });
  }

  return NextResponse.json({
    answer: "This demo routes operational questions to safe, deterministic tools. Ask about onboarding, expenses, or incident handling to see a tool call.",
    toolCall: null,
    mode: "mock",
  });
}
