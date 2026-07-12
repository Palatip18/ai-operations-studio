import { NextResponse } from "next/server";
import { isAuthenticatedRequest } from "@/lib/auth";
import { runWorkflow, type WorkflowRequest } from "@/lib/workflow";

export async function POST(request: Request) {
  if (!isAuthenticatedRequest(request)) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const body = (await request.json()) as Partial<WorkflowRequest>;
  if (!body.requester || !body.type || !body.priority || !body.details) {
    return NextResponse.json({ error: "All workflow fields are required" }, { status: 400 });
  }
  return NextResponse.json({ runId: `DEMO-${Date.now().toString().slice(-6)}`, steps: runWorkflow(body as WorkflowRequest) });
}
