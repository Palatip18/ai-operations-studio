import { NextResponse } from "next/server";
import { isAuthenticatedRequest } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { runSupportAgent, type SupportResult } from "@/lib/support-agent";
import { recordSupportEvent } from "@/lib/support-analytics";
import { createCustomerContextToken, customerContextCookieOptions, findDemoCustomer, readCustomerContext, SUPPORT_CUSTOMER_COOKIE } from "@/lib/support-customer";

function verificationOnlyResult(answer: string, customerVerificationRequired: boolean): SupportResult {
  return {
    answer,
    customerVerificationRequired,
    transaction: null,
    handoff: null,
    trace: {
      intent: "unknown",
      risk: "LOW",
      steps: [{ tool: "verify_customer_user_id", input: { source: "conversation" }, outputSummary: answer, resultCount: customerVerificationRequired ? 0 : 1 }],
      sources: [],
      verifier: { applicable: false, grounded: false, groundednessScore: 0, supportingSourceIds: [], querySupportScore: 1, warning: null },
      decision: "AUTO_RESPOND",
      escalationReason: null,
      latencyMs: 0,
      toolCallCount: 1,
      modelCallCount: 0,
      estimatedUsage: null,
      mode: "deterministic",
      language: "en",
      normalizationMode: "original",
      customerScope: null,
    },
  };
}

export async function POST(request: Request) {
  if (!isAuthenticatedRequest(request)) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const customer = readCustomerContext(request);
  const rate = checkRateLimit(request, "support", 10, 10 * 60 * 1000);
  if (!rate.allowed) return NextResponse.json({ error: "Demo request limit reached. Please try again later." }, { status: 429, headers: { "Retry-After": String(rate.retryAfter) } });
  const body = (await request.json()) as { message?: string; previousUserMessages?: unknown };
  const message = body.message?.trim();
  if (!message) return NextResponse.json({ error: "Message is required" }, { status: 400 });
  if (message.length > 500) return NextResponse.json({ error: "Message must be 500 characters or fewer" }, { status: 400 });
  const previousUserMessages = Array.isArray(body.previousUserMessages)
    ? body.previousUserMessages.filter((item): item is string => typeof item === "string").slice(-4).map((item) => item.trim().slice(0, 500))
    : [];

  if (!customer && /^USER-[A-Z0-9]{5,12}$/i.test(message)) {
    const verifiedCustomer = findDemoCustomer(message);
    if (!verifiedCustomer) {
      const thai = previousUserMessages.some((item) => /\p{Script=Thai}/u.test(item));
      const answer = thai ? "ขออภัยค่ะ แอดมินยังไม่พบยูสเซอร์นี้ รบกวนลูกค้าตรวจสอบแล้วแจ้งเข้ามาใหม่อีกครั้งนะคะ" : "Sorry, that User ID was not found. Please check it and try again.";
      return NextResponse.json(verificationOnlyResult(answer, true));
    }

    const pendingMessage = [...previousUserMessages].reverse().find((item) => !/^USER-/i.test(item));
    const result = pendingMessage
      ? await runSupportAgent(pendingMessage, previousUserMessages.filter((item) => item !== pendingMessage), verifiedCustomer.userId)
      : verificationOnlyResult(`User ${verifiedCustomer.userId} verified for this chat session. How can I help?`, false);
    const thai = Boolean(pendingMessage && /\p{Script=Thai}/u.test(pendingMessage));
    result.answer = thai
      ? `ได้ค่ะ แอดมินตรวจสอบยูสเซอร์ ${verifiedCustomer.userId} เรียบร้อยแล้วนะคะ ${result.answer}`
      : `User ${verifiedCustomer.userId} is verified for this chat session. ${result.answer}`;
    result.trace.customerScope = verifiedCustomer.userId;
    if (!result.customerVerificationRequired && !result.clarificationRequired) recordSupportEvent(result.trace);
    const response = NextResponse.json(result);
    response.cookies.set(SUPPORT_CUSTOMER_COOKIE, createCustomerContextToken(verifiedCustomer), customerContextCookieOptions);
    return response;
  }
  const result = await runSupportAgent(message, previousUserMessages, customer?.userId ?? null);
  if (!result.customerVerificationRequired && !result.clarificationRequired) recordSupportEvent(result.trace);
  return NextResponse.json(result);
}
