import { describe, expect, it } from "vitest";
import { redactSecrets, summarize } from "./trace-redaction";

describe("redactSecrets", () => {
  it("masks OpenAI-style secret keys", () => {
    expect(redactSecrets("here is my key sk-abcdefghij1234567890")).not.toContain("sk-abcdefghij1234567890");
  });

  it("masks bearer tokens", () => {
    expect(redactSecrets("Authorization: Bearer abc123.def456-ghi789")).not.toMatch(/bearer\s+abc123/i);
  });

  it("masks password key-value pairs", () => {
    expect(redactSecrets('password: "hunter2222"')).not.toContain("hunter2222");
  });

  it("masks api_key key-value pairs", () => {
    expect(redactSecrets("api_key=zzzz9999yyyy8888")).not.toContain("zzzz9999yyyy8888");
  });

  it("masks cookie header content", () => {
    expect(redactSecrets("Cookie: demo_session=abc.def.ghi; other=1")).not.toContain("demo_session=abc.def.ghi");
  });

  it("leaves ordinary text untouched", () => {
    const text = "What is the deadline for submitting an expense claim?";
    expect(redactSecrets(text)).toBe(text);
  });
});

describe("summarize", () => {
  it("truncates long text", () => {
    const long = "a".repeat(500);
    expect(summarize(long, 50).length).toBeLessThanOrEqual(51);
  });

  it("redacts before truncating", () => {
    const text = `sk-${"x".repeat(40)} and then some more filler text padded out long enough to truncate`;
    const result = summarize(text, 30);
    expect(result).not.toContain("sk-");
  });
});
