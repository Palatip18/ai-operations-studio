import { createHash } from "node:crypto";

export type HandoffStatus = "QUEUED" | "FAILED" | "RETRYABLE";

export type HandoffResult = {
  success: boolean;
  simulated: true;
  handoffId?: string;
  status: HandoffStatus;
  destination?: string;
  createdAt?: string;
  idempotent?: boolean;
};

export type HandoffInput = {
  customerMessage: string;
  intent: string;
  risk: string;
  escalationReason: string;
  locale: string;
  idempotencyKey: string;
};

const MAX_CACHE_ENTRIES = 5_000;
const handoffCache = new Map<string, HandoffResult>();

export function handleSimulatedHandoff(input: HandoffInput): HandoffResult {
  const cached = handoffCache.get(input.idempotencyKey);
  if (cached) return { ...cached, idempotent: true };

  if (handoffCache.size >= MAX_CACHE_ENTRIES) {
    const oldest = handoffCache.keys().next().value as string | undefined;
    if (oldest) handoffCache.delete(oldest);
  }

  const digest = createHash("sha256").update(input.idempotencyKey).digest("hex").slice(0, 10).toUpperCase();
  const result: HandoffResult = {
    success: true,
    simulated: true,
    handoffId: `DEMO-CS-${digest}`,
    status: "QUEUED",
    destination: "Customer Support Queue",
    createdAt: new Date().toISOString(),
    idempotent: false,
  };
  handoffCache.set(input.idempotencyKey, result);
  return { ...result };
}

export function resetSimulatedHandoffsForTests() {
  handoffCache.clear();
}

export function getSimulatedHandoffCacheSizeForTests() {
  return handoffCache.size;
}
