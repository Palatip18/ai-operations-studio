import { NextResponse } from "next/server";
import { isAuthenticatedRequest } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { createCustomerContextToken, customerContextCookieOptions, findDemoCustomer, readCustomerContext, SUPPORT_CUSTOMER_COOKIE } from "@/lib/support-customer";

export async function GET(request: Request) {
  if (!isAuthenticatedRequest(request)) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const customer = readCustomerContext(request);
  if (!customer) return NextResponse.json({ verified: false }, { status: 200 });
  return NextResponse.json({ verified: true, customer });
}

export async function POST(request: Request) {
  if (!isAuthenticatedRequest(request)) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const rate = checkRateLimit(request, "support-customer", 10, 10 * 60 * 1000);
  if (!rate.allowed) return NextResponse.json({ error: "Too many verification attempts." }, { status: 429, headers: { "Retry-After": String(rate.retryAfter) } });
  const body = (await request.json()) as { userId?: unknown };
  const userId = typeof body.userId === "string" ? body.userId.trim().toUpperCase() : "";
  if (!/^USER-[A-Z0-9]{5,12}$/.test(userId)) return NextResponse.json({ error: "Invalid demo User ID format." }, { status: 400 });
  const customer = findDemoCustomer(userId);
  if (!customer) return NextResponse.json({ error: "Demo user was not found." }, { status: 404 });
  const response = NextResponse.json({ verified: true, customer });
  response.cookies.set(SUPPORT_CUSTOMER_COOKIE, createCustomerContextToken(customer), customerContextCookieOptions);
  return response;
}

export async function DELETE(request: Request) {
  if (!isAuthenticatedRequest(request)) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const response = NextResponse.json({ verified: false });
  response.cookies.set(SUPPORT_CUSTOMER_COOKIE, "", { ...customerContextCookieOptions, maxAge: 0 });
  return response;
}
