import { NextResponse } from "next/server";
import { evaluateRetrieval, evaluateSemanticRetrieval } from "@/lib/evaluation";
import { isOpenAIConfigured } from "@/lib/openai";

export async function GET(request: Request) {
  const mode = new URL(request.url).searchParams.get("mode");
  return NextResponse.json(mode === "semantic" || (mode !== "local" && isOpenAIConfigured()) ? await evaluateSemanticRetrieval() : evaluateRetrieval());
}
