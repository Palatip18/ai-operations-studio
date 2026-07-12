import { describe, expect, it } from "vitest";
import { checkRateLimit } from "./rate-limit";

describe("rate limiting", () => {
  it("blocks requests after the configured limit", () => {
    const request = new Request("https://example.test", { headers: { "x-forwarded-for": "192.0.2.10" } });
    expect(checkRateLimit(request, "test", 2, 60_000).allowed).toBe(true);
    expect(checkRateLimit(request, "test", 2, 60_000).allowed).toBe(true);
    expect(checkRateLimit(request, "test", 2, 60_000).allowed).toBe(false);
  });
});
