import { createHmac, timingSafeEqual } from "node:crypto";

export const SUPPORT_CUSTOMER_COOKIE = "support_customer";
// Browser-session customer context, with an 8-hour cryptographic safety cap.
// The cookie itself has no Max-Age and is explicitly cleared on End chat or logout.
export const SUPPORT_CUSTOMER_MAX_AGE_SECONDS = 8 * 60 * 60;

export type DemoCustomer = {
  userId: string;
  displayName: string;
  tier: "STANDARD" | "PLUS";
  status: "ACTIVE";
};

const customers = new Map<string, DemoCustomer>([
  ["USER-RAY01", { userId: "USER-RAY01", displayName: "Ray Demo", tier: "PLUS", status: "ACTIVE" }],
  ["USER-MALI02", { userId: "USER-MALI02", displayName: "Mali Demo", tier: "STANDARD", status: "ACTIVE" }],
]);

function secret() {
  const value = process.env.DEMO_PASSWORD;
  if (!value) throw new Error("DEMO_PASSWORD is not configured");
  return value;
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(`support-customer:${payload}`).digest("base64url");
}

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function findDemoCustomer(userId: string): DemoCustomer | null {
  return customers.get(userId.trim().toUpperCase()) ?? null;
}

export function createCustomerContextToken(customer: DemoCustomer, now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({ userId: customer.userId, exp: now + SUPPORT_CUSTOMER_MAX_AGE_SECONDS * 1000 })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifyCustomerContextToken(token: string | undefined | null, now = Date.now()): DemoCustomer | null {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature || !safeEqual(signature, sign(payload))) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString()) as { userId?: string; exp?: number };
    if (!parsed.userId || typeof parsed.exp !== "number" || parsed.exp <= now) return null;
    return findDemoCustomer(parsed.userId);
  } catch {
    return null;
  }
}

export function readCustomerContext(request: Request): DemoCustomer | null {
  const cookie = request.headers.get("cookie") ?? "";
  const value = cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${SUPPORT_CUSTOMER_COOKIE}=`))?.slice(SUPPORT_CUSTOMER_COOKIE.length + 1);
  return verifyCustomerContextToken(value ? decodeURIComponent(value) : null);
}

export const customerContextCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/api/support",
};
