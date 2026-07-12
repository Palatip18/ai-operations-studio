import { beforeEach, describe, expect, it } from "vitest";
import { clearFailures, isLockedOut, MAX_FAILED_ATTEMPTS, recordFailure, resetAttempts } from "./login-rate-limit";

beforeEach(() => resetAttempts());

describe("login attempt limiter", () => {
  it("does not lock out below the threshold", () => {
    const client = "198.51.100.1";
    for (let i = 0; i < MAX_FAILED_ATTEMPTS - 1; i += 1) recordFailure(client);
    expect(isLockedOut(client)).toBe(false);
  });
  it("locks out at the configured threshold", () => {
    const client = "198.51.100.2";
    for (let i = 0; i < MAX_FAILED_ATTEMPTS; i += 1) recordFailure(client);
    expect(isLockedOut(client)).toBe(true);
  });
  it("clears failures after a successful login", () => {
    const client = "198.51.100.3";
    for (let i = 0; i < MAX_FAILED_ATTEMPTS; i += 1) recordFailure(client);
    clearFailures(client);
    expect(isLockedOut(client)).toBe(false);
  });
});
