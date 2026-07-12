import { beforeAll, describe, expect, it } from "vitest";

import { createSessionToken, SESSION_COOKIE } from "@/lib/auth";
import { GET, POST } from "./route";

describe("support analytics API", () => {
  beforeAll(() => {
    process.env.DEMO_PASSWORD = "analytics-test-password";
  });

  it("rejects unauthenticated analytics access", async () => {
    const response = await GET(new Request("http://localhost/api/support/analytics?period=week"));
    expect(response.status).toBe(401);
  });

  it("returns a privacy-safe authenticated weekly report", async () => {
    const request = new Request("http://localhost/api/support/analytics?period=week", { headers: { cookie: `${SESSION_COOKIE}=${createSessionToken()}` } });
    const response = await GET(request);
    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(payload.period).toBe("week");
    expect(payload.source.containsCustomerText).toBe(false);
    expect(payload.metrics.totalInteractions).toBeGreaterThan(0);
  });

  it("creates an authenticated simulated dispatch record", async () => {
    const request = new Request("http://localhost/api/support/analytics", { method: "POST", headers: { cookie: `${SESSION_COOKIE}=${createSessionToken()}`, "content-type": "application/json" }, body: JSON.stringify({ period: "month" }) });
    const response = await POST(request);
    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(payload.simulated).toBe(true);
    expect(payload.status).toBe("QUEUED");
    expect(payload.recipients.length).toBeGreaterThan(0);
  });
});
