import { NextResponse } from "next/server";

import { isAuthenticatedRequest } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { buildSupportAnalytics, dispatchSimulatedAnalyticsReport, type AnalyticsPeriod } from "@/lib/support-analytics";

const periods = new Set<AnalyticsPeriod>(["day", "week", "month"]);

function readPeriod(value: string | null): AnalyticsPeriod | null {
  return value && periods.has(value as AnalyticsPeriod) ? value as AnalyticsPeriod : null;
}

export async function GET(request: Request) {
  if (!isAuthenticatedRequest(request)) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const rate = checkRateLimit(request, "support-analytics", 30, 10 * 60 * 1000);
  if (!rate.allowed) return NextResponse.json({ error: "Demo request limit reached." }, { status: 429, headers: { "Retry-After": String(rate.retryAfter) } });
  const period = readPeriod(new URL(request.url).searchParams.get("period"));
  if (!period) return NextResponse.json({ error: "Period must be day, week, or month." }, { status: 400 });
  return NextResponse.json(buildSupportAnalytics(period));
}

export async function POST(request: Request) {
  if (!isAuthenticatedRequest(request)) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const rate = checkRateLimit(request, "support-analytics-report", 10, 10 * 60 * 1000);
  if (!rate.allowed) return NextResponse.json({ error: "Demo request limit reached." }, { status: 429, headers: { "Retry-After": String(rate.retryAfter) } });
  const body = await request.json() as { period?: string };
  const period = readPeriod(body.period ?? null);
  if (!period) return NextResponse.json({ error: "Period must be day, week, or month." }, { status: 400 });
  return NextResponse.json(dispatchSimulatedAnalyticsReport(period));
}
