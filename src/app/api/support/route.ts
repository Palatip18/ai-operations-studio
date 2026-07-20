import { NextResponse } from "next/server";
import { isAuthenticatedRequest } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { runSupportAgent, type SupportResult } from "@/lib/support-agent";
import { recordSupportEvent } from "@/lib/support-analytics";
import { createCustomerContextToken, customerContextCookieOptions, findDemoCustomer, readCustomerContext, SUPPORT_CUSTOMER_COOKIE } from "@/lib/support-customer";
import { classifyIntent } from "@/lib/support-classification";
import { normalizeLocally } from "@/lib/multilingual";

function verificationOnlyResult(answer: string, customerVerificationRequired: boolean, language: "en" | "th" | "zh" = "en"): SupportResult {
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
      language,
      normalizationMode: "original",
      customerScope: null,
    },
  };
}

function looksLikeCustomerIdentifier(value: string) {
  const compactPhone = value.replace(/[^\d]/g, "");
  return /^[A-Z][A-Z0-9._-]{2,31}$/i.test(value) || /^0\d{9}$/.test(compactPhone);
}

function isTransactionSupportMessage(value: string) {
  return classifyIntent(normalizeLocally(value)) === "deposit_withdrawal"
    || /ฝาก(?:เงิน)?|ถอน(?:เงิน)?|deposit|withdraw(?:al|ing)?|top ?up|cash ?out/i.test(value);
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

  const pendingMessage = [...previousUserMessages].reverse().find((item) => (
    isTransactionSupportMessage(item)
  ));
  const awaitingCustomerIdentifier = !customer && Boolean(pendingMessage) && looksLikeCustomerIdentifier(message);

  if (awaitingCustomerIdentifier) {
    const verifiedCustomer = findDemoCustomer(message);
    if (!verifiedCustomer) {
      const thai = Boolean(pendingMessage && /\p{Script=Thai}/u.test(pendingMessage));
      const answer = thai
        ? "ขออภัยค่ะ ยังไม่พบบัญชีจากยูสเซอร์หรือเบอร์โทรนี้ รบกวนตรวจสอบข้อมูลแล้วแจ้งอีกครั้งนะคะ"
        : "Sorry, no account was found for that username or phone number. Please check it and try again.";
      return NextResponse.json(verificationOnlyResult(answer, true, thai ? "th" : "en"));
    }

    const result = await runSupportAgent(pendingMessage!, previousUserMessages.filter((item) => item !== pendingMessage), verifiedCustomer.userId);
    const thai = Boolean(pendingMessage && /\p{Script=Thai}/u.test(pendingMessage));
    const verifiedReference = /^USER-/i.test(message) ? `ยูสเซอร์ ${message}` : `บัญชี ${message}`;
    result.answer = thai
      ? `ได้ค่ะ ตรวจสอบ${verifiedReference} เรียบร้อยแล้วนะคะ ${result.answer}`
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
