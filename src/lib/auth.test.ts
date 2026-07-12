import { beforeAll, describe, expect, it } from "vitest";
import {
  createSessionToken,
  isAuthenticatedRequest,
  readSessionCookie,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  verifyPassword,
  verifySessionToken,
} from "./auth";

const PASSWORD = "test-demo-password";
beforeAll(() => {
  process.env.DEMO_PASSWORD = PASSWORD;
});

describe("verifyPassword", () => {
  it("accepts the configured demo password", () => {
    expect(verifyPassword(PASSWORD)).toBe(true);
  });
  it("rejects a wrong or empty password", () => {
    expect(verifyPassword("wrong")).toBe(false);
    expect(verifyPassword("")).toBe(false);
  });
});

describe("session token", () => {
  it("verifies a freshly issued token", () => {
    expect(verifySessionToken(createSessionToken())).toBe(true);
  });
  it("rejects an expired token", () => {
    const issuedLongAgo = Date.now() - (SESSION_MAX_AGE_SECONDS + 60) * 1000;
    expect(verifySessionToken(createSessionToken(issuedLongAgo))).toBe(false);
  });
  it("rejects a tampered or malformed token", () => {
    const token = createSessionToken();
    expect(verifySessionToken(token + "x")).toBe(false);
    expect(verifySessionToken("not-a-token")).toBe(false);
    expect(verifySessionToken(undefined)).toBe(false);
  });
});

describe("request cookie helpers", () => {
  it("reads the session cookie from a header", () => {
    const token = createSessionToken();
    expect(readSessionCookie(`other=1; ${SESSION_COOKIE}=${token}`)).toBe(token);
    expect(readSessionCookie(null)).toBeUndefined();
  });
  it("treats a request without a valid cookie as unauthenticated", () => {
    const anonymous = new Request("http://localhost/api/chat");
    expect(isAuthenticatedRequest(anonymous)).toBe(false);
  });
  it("treats a request with a valid cookie as authenticated", () => {
    const authed = new Request("http://localhost/api/chat", {
      headers: { cookie: `${SESSION_COOKIE}=${createSessionToken()}` },
    });
    expect(isAuthenticatedRequest(authed)).toBe(true);
  });
});
