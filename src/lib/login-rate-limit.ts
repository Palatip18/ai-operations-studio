/**
 * Modular, testable login attempt limiter. Counts only FAILED demo-login
 * attempts per client and locks the client out after MAX_FAILED_ATTEMPTS
 * within ATTEMPT_WINDOW_MS. In-memory only — appropriate for a single-instance
 * portfolio demo, not for production (which would need a shared store).
 */

type Attempt = { count: number; resetAt: number };

const attempts = new Map<string, Attempt>();

export const MAX_FAILED_ATTEMPTS = 5;
export const ATTEMPT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

/** Derive a best-effort client key from proxy headers. */
export function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "anonymous";
}

/** True when the client has reached the failed-attempt threshold. */
export function isLockedOut(client: string, now = Date.now()): boolean {
  const entry = attempts.get(client);
  if (!entry || entry.resetAt <= now) return false;
  return entry.count >= MAX_FAILED_ATTEMPTS;
}

/** Seconds until the current lockout window resets (0 if not locked out). */
export function retryAfterSeconds(client: string, now = Date.now()): number {
  const entry = attempts.get(client);
  if (!entry || entry.resetAt <= now) return 0;
  return Math.ceil((entry.resetAt - now) / 1000);
}

/** Record one failed attempt, opening a new window if needed. */
export function recordFailure(client: string, now = Date.now()): void {
  const entry = attempts.get(client);
  if (!entry || entry.resetAt <= now) {
    attempts.set(client, { count: 1, resetAt: now + ATTEMPT_WINDOW_MS });
    return;
  }
  entry.count += 1;
}

/** Clear a client's failed attempts (called after a successful login). */
export function clearFailures(client: string): void {
  attempts.delete(client);
}

/** Test-only helper to reset all in-memory state. */
export function resetAttempts(): void {
  attempts.clear();
}
