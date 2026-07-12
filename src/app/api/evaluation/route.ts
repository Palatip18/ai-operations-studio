import { NextResponse } from "next/server";
import { evaluateRetrieval } from "@/lib/evaluation";

export async function GET() {
  return NextResponse.json(evaluateRetrieval());
}
