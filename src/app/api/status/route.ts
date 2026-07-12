import { NextResponse } from "next/server";
import { isAuthenticatedRequest } from "@/lib/auth";
import { isOpenAIConfigured } from "@/lib/openai";

export async function GET(request: Request) {
  if (!isAuthenticatedRequest(request)) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  return NextResponse.json({
    liveAI: isOpenAIConfigured(),
    chat: isOpenAIConfigured() ? "openai-tool-calling" : "deterministic-fallback",
    retrieval: isOpenAIConfigured() ? "openai-embeddings" : "local-vector-fallback",
  });
}
