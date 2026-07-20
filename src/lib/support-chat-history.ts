import { randomUUID } from "node:crypto";
import { Redis } from "@upstash/redis";

import type { SupportResult } from "./support-agent";
import { redactSecrets } from "./trace-redaction";

export const SUPPORT_CHAT_SESSION_COOKIE = "support_chat_session";
export const SUPPORT_CHAT_RETENTION_SECONDS = 30 * 24 * 60 * 60;

export type StoredSupportTurn = {
  id: string;
  occurredAt: string;
  userMessage: string;
  assistantMessage: string;
  intent: string;
  risk: string;
  decision: string;
  language: string;
  customerScope: string | null;
  groundednessScore: number;
  toolsUsed: string[];
  sourceIds: string[];
  handoffId: string | null;
  transactionStatus: string | null;
};

export type StoredSupportChatSession = {
  id: string;
  startedAt: string;
  updatedAt: string;
  endedAt: string | null;
  status: "OPEN" | "ENDED";
  turnCount: number;
  primaryIntent: string;
  highestRisk: string;
  latestDecision: string;
  languages: string[];
  turns: StoredSupportTurn[];
};

const INDEX_KEY = "demo:support-chat:sessions";
const SESSION_KEY_PREFIX = "demo:support-chat:session:";
const MAX_SESSIONS = 100;
const MAX_TURNS_PER_SESSION = 40;
const memoryStore = new Map<string, StoredSupportChatSession>();
const memoryIndex: string[] = [];
let redisClient: Redis | null = null;

function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  if (!redisClient) redisClient = new Redis({ url, token });
  return redisClient;
}

function sessionKey(sessionId: string) {
  return `${SESSION_KEY_PREFIX}${sessionId}`;
}

function readCookie(cookieHeader: string | null, name: string) {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const index = part.indexOf("=");
    if (index === -1) continue;
    if (part.slice(0, index).trim() === name) return decodeURIComponent(part.slice(index + 1).trim());
  }
  return null;
}

export function createSupportChatSessionId() {
  return `CHAT-${randomUUID()}`;
}

export function readSupportChatSessionId(request: Request) {
  const value = readCookie(request.headers.get("cookie"), SUPPORT_CHAT_SESSION_COOKIE);
  return value && /^CHAT-[0-9a-f-]{36}$/i.test(value) ? value : null;
}

export const supportChatSessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/api/support",
  maxAge: SUPPORT_CHAT_RETENTION_SECONDS,
};

/** Preserve the demo conversation while removing likely real-world identifiers. */
export function redactChatHistoryText(value: string) {
  return redactSecrets(value)
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[REDACTED_EMAIL]")
    .replace(/(?:\+?66|0)[\s().-]*\d(?:[\s().-]*\d){8}/g, "[REDACTED_PHONE]")
    .replace(/\b\d{11,19}\b/g, "[REDACTED_NUMBER]")
    .replace(/\b(otp|password|passcode|pin)\s*[:=]\s*\S+/gi, "$1=[REDACTED]")
    .slice(0, 2_000);
}

function highestRisk(left: string, right: string) {
  const score: Record<string, number> = { LOW: 1, MEDIUM: 2, HIGH: 3 };
  return (score[right] ?? 0) > (score[left] ?? 0) ? right : left;
}

async function getSession(sessionId: string) {
  const redis = getRedis();
  if (redis) return redis.get<StoredSupportChatSession>(sessionKey(sessionId));
  return memoryStore.get(sessionId) ?? null;
}

async function putSession(session: StoredSupportChatSession) {
  const redis = getRedis();
  if (redis) {
    await redis.set(sessionKey(session.id), session, { ex: SUPPORT_CHAT_RETENTION_SECONDS });
    await redis.lrem(INDEX_KEY, 0, session.id);
    await redis.lpush(INDEX_KEY, session.id);
    await redis.ltrim(INDEX_KEY, 0, MAX_SESSIONS - 1);
    return;
  }
  memoryStore.set(session.id, session);
  const existingIndex = memoryIndex.indexOf(session.id);
  if (existingIndex >= 0) memoryIndex.splice(existingIndex, 1);
  memoryIndex.unshift(session.id);
  if (memoryIndex.length > MAX_SESSIONS) {
    for (const id of memoryIndex.splice(MAX_SESSIONS)) memoryStore.delete(id);
  }
}

export async function saveSupportChatTurn(input: {
  sessionId: string;
  userMessage: string;
  result: SupportResult;
  now?: number;
}) {
  const occurredAt = new Date(input.now ?? Date.now()).toISOString();
  const existing = await getSession(input.sessionId);
  const turn: StoredSupportTurn = {
    id: `TURN-${randomUUID()}`,
    occurredAt,
    userMessage: redactChatHistoryText(input.userMessage),
    assistantMessage: redactChatHistoryText(input.result.answer),
    intent: input.result.trace.intent,
    risk: input.result.trace.risk,
    decision: input.result.trace.decision,
    language: input.result.trace.language,
    customerScope: input.result.trace.customerScope,
    groundednessScore: input.result.trace.verifier.groundednessScore,
    toolsUsed: input.result.trace.steps.map((step) => step.tool).slice(0, 8),
    sourceIds: input.result.trace.sources.map((source) => source.id).slice(0, 8),
    handoffId: input.result.handoff?.handoffId ?? null,
    transactionStatus: input.result.transaction?.status ?? null,
  };
  const turns = [...(existing?.turns ?? []), turn].slice(-MAX_TURNS_PER_SESSION);
  const session: StoredSupportChatSession = {
    id: input.sessionId,
    startedAt: existing?.startedAt ?? occurredAt,
    updatedAt: occurredAt,
    endedAt: null,
    status: "OPEN",
    turnCount: (existing?.turnCount ?? 0) + 1,
    primaryIntent: input.result.trace.intent === "unknown" && existing ? existing.primaryIntent : input.result.trace.intent,
    highestRisk: highestRisk(existing?.highestRisk ?? "LOW", input.result.trace.risk),
    latestDecision: input.result.trace.decision,
    languages: [...new Set([...(existing?.languages ?? []), input.result.trace.language])],
    turns,
  };
  await putSession(session);
  return session;
}

export async function endSupportChatSession(sessionId: string, now = Date.now()) {
  const existing = await getSession(sessionId);
  if (!existing) return null;
  const session: StoredSupportChatSession = {
    ...existing,
    status: "ENDED",
    endedAt: new Date(now).toISOString(),
    updatedAt: new Date(now).toISOString(),
  };
  await putSession(session);
  return session;
}

export async function listSupportChatSessions(limit = 30) {
  const safeLimit = Math.max(1, Math.min(limit, 50));
  const redis = getRedis();
  const ids = redis
    ? await redis.lrange<string>(INDEX_KEY, 0, safeLimit - 1)
    : memoryIndex.slice(0, safeLimit);
  const sessions = redis
    ? await Promise.all(ids.map((id) => redis.get<StoredSupportChatSession>(sessionKey(id))))
    : ids.map((id) => memoryStore.get(id) ?? null);
  return sessions.filter((session): session is StoredSupportChatSession => Boolean(session));
}

export function supportChatStorageMode() {
  return getRedis() ? "persistent-redis" as const : "local-memory" as const;
}

export function resetSupportChatHistoryForTests() {
  memoryStore.clear();
  memoryIndex.length = 0;
  redisClient = null;
}
