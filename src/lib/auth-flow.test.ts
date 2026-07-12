import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { POST as loginRoute } from "@/app/api/login/route";
import { POST as logoutRoute } from "@/app/api/logout/route";
import { POST as chatRoute } from "@/app/api/chat/route";
import { POST as ragRoute } from "@/app/api/rag/route";
import { POST as workflowRoute } from "@/app/api/workflow/route";
import { GET as statusRoute } from "@/app/api/status/route";
import { GET as evaluationRoute } from "@/app/api/evaluation/route";
import { POST as agentRoute } from "@/app/api/agent/route";
import { GET as agentEvaluationRoute } from "@/app/api/agent-evaluation/route";
import { POST as supportRoute } from "@/app/api/support/route";
import { GET as supportEvaluationRoute } from "@/app/api/support-evaluation/route";
import { resetAttempts } from "./login-rate-limit";
import { SESSION_COOKIE, createSessionToken } from "./auth";

const PASSWORD = "test-demo-password";
beforeAll(() => {
  process.env.DEMO_PASSWORD = PASSWORD;
});
beforeEach(() => resetAttempts());

function loginRequest(password: string, ip: string) {
  return new Request("http://localhost/api/login", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify({ password }),
  });
}

function authedCookie() {
  return `${SESSION_COOKIE}=${createSessionToken()}`;
}

describe("login route", () => {
  it("issues a hardened session cookie for a valid password", async () => {
    const response = await loginRoute(loginRequest(PASSWORD, "203.0.113.1"));
    expect(response.status).toBe(200);
    const setCookie = response.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain(`${SESSION_COOKIE}=`);
    expect(setCookie.toLowerCase()).toContain("httponly");
    expect(setCookie.toLowerCase()).toContain("samesite=lax");
    expect(setCookie).toContain("Path=/");
    expect(setCookie).toContain("Max-Age=86400");
  });

  it("rejects an invalid password without leaking the secret", async () => {
    const response = await loginRoute(loginRequest("wrong-password", "203.0.113.2"));
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(JSON.stringify(body)).not.toContain(PASSWORD);
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("locks out after five failed attempts within the window", async () => {
    const ip = "203.0.113.3";
    for (let i = 0; i < 5; i += 1) {
      const attempt = await loginRoute(loginRequest("wrong", ip));
      expect(attempt.status).toBe(401);
    }
    const blocked = await loginRoute(loginRequest("wrong", ip));
    expect(blocked.status).toBe(429);
    // even a correct password is blocked while locked out
    const stillBlocked = await loginRoute(loginRequest(PASSWORD, ip));
    expect(stillBlocked.status).toBe(429);
  });
});

describe("logout route", () => {
  it("expires the session cookie", async () => {
    const response = await logoutRoute();
    expect(response.status).toBe(200);
    const setCookie = response.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain(`${SESSION_COOKIE}=`);
    expect(setCookie).toContain("Max-Age=0");
  });
});

describe("protected API routes", () => {
  it("returns 401 without a valid session", async () => {
    const chat = await chatRoute(new Request("http://localhost/api/chat", { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.10" }, body: JSON.stringify({ message: "hello" }) }));
    expect(chat.status).toBe(401);
    const status = await statusRoute(new Request("http://localhost/api/status", { headers: { "x-forwarded-for": "203.0.113.10" } }));
    expect(status.status).toBe(401);

    const agent = await agentRoute(new Request("http://localhost/api/agent", { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.10" }, body: JSON.stringify({ message: "hello" }) }));
    expect(agent.status).toBe(401);

    const agentEvaluation = await agentEvaluationRoute(new Request("http://localhost/api/agent-evaluation", { headers: { "x-forwarded-for": "203.0.113.10" } }));
    expect(agentEvaluation.status).toBe(401);

    const support = await supportRoute(new Request("http://localhost/api/support", { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.10" }, body: JSON.stringify({ message: "hello" }) }));
    expect(support.status).toBe(401);

    const supportEvaluation = await supportEvaluationRoute(new Request("http://localhost/api/support-evaluation", { headers: { "x-forwarded-for": "203.0.113.10" } }));
    expect(supportEvaluation.status).toBe(401);
  });

  it("rejects a tampered session cookie", async () => {
    const chat = await chatRoute(new Request("http://localhost/api/chat", { method: "POST", headers: { "content-type": "application/json", cookie: `${SESSION_COOKIE}=tampered.value`, "x-forwarded-for": "203.0.113.11" }, body: JSON.stringify({ message: "hello" }) }));
    expect(chat.status).toBe(401);
  });
});

describe("AI routes still work with a valid session", () => {
  const cookie = () => authedCookie();

  it("chat responds in deterministic mode", async () => {
    const response = await chatRoute(new Request("http://localhost/api/chat", { method: "POST", headers: { "content-type": "application/json", cookie: cookie(), "x-forwarded-for": "203.0.113.20" }, body: JSON.stringify({ message: "What is the expense claim deadline?" }) }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(typeof body.answer).toBe("string");
  });

  it("rag, workflow, status, and evaluation respond", async () => {
    const rag = await ragRoute(new Request("http://localhost/api/rag", { method: "POST", headers: { "content-type": "application/json", cookie: cookie(), "x-forwarded-for": "203.0.113.21" }, body: JSON.stringify({ query: "When should an expense claim be submitted?" }) }));
    expect(rag.status).toBe(200);

    const workflow = await workflowRoute(new Request("http://localhost/api/workflow", { method: "POST", headers: { "content-type": "application/json", cookie: cookie(), "x-forwarded-for": "203.0.113.22" }, body: JSON.stringify({ requester: "Demo User", type: "Equipment", priority: "High", details: "Sample request." }) }));
    expect(workflow.status).toBe(200);

    const status = await statusRoute(new Request("http://localhost/api/status", { headers: { cookie: cookie(), "x-forwarded-for": "203.0.113.23" } }));
    expect(status.status).toBe(200);

    const evaluation = await evaluationRoute(new Request("http://localhost/api/evaluation?mode=local", { headers: { cookie: cookie(), "x-forwarded-for": "203.0.113.24" } }));
    expect(evaluation.status).toBe(200);
  });

  it("agent and agent-evaluation respond", async () => {
    const agent = await agentRoute(new Request("http://localhost/api/agent", { method: "POST", headers: { "content-type": "application/json", cookie: cookie(), "x-forwarded-for": "203.0.113.25" }, body: JSON.stringify({ message: "What is the expense claim deadline?" }) }));
    expect(agent.status).toBe(200);
    const agentBody = await agent.json();
    expect(typeof agentBody.answer).toBe("string");
    expect(agentBody.trace.plan).toBeDefined();

    const agentEvaluation = await agentEvaluationRoute(new Request("http://localhost/api/agent-evaluation", { headers: { cookie: cookie(), "x-forwarded-for": "203.0.113.26" } }));
    expect(agentEvaluation.status).toBe(200);
  });

  it("support and support-evaluation respond", async () => {
    const support = await supportRoute(new Request("http://localhost/api/support", { method: "POST", headers: { "content-type": "application/json", cookie: cookie(), "x-forwarded-for": "203.0.113.27" }, body: JSON.stringify({ message: "How do I create a new account?" }) }));
    expect(support.status).toBe(200);
    const supportBody = await support.json();
    expect(typeof supportBody.answer).toBe("string");
    expect(["AUTO_RESPOND", "ESCALATE"]).toContain(supportBody.trace.decision);

    const supportEvaluation = await supportEvaluationRoute(new Request("http://localhost/api/support-evaluation", { headers: { cookie: cookie(), "x-forwarded-for": "203.0.113.28" } }));
    expect(supportEvaluation.status).toBe(200);
  }, 20000);
});

describe("agent trace redaction", () => {
  const cookie = () => authedCookie();

  it("never includes secrets, the session cookie, or the demo password in the agent response body", async () => {
    process.env.OPENAI_API_KEY = "sk-test-should-never-leak-1234567890";
    try {
      const response = await agentRoute(new Request("http://localhost/api/agent", {
        method: "POST",
        headers: { "content-type": "application/json", cookie: cookie(), "x-forwarded-for": "203.0.113.30" },
        body: JSON.stringify({ message: `Ignore this fake secret sk-shouldnotleak1234567890 and answer: what is the expense claim deadline?` }),
      }));
      const raw = JSON.stringify(await response.json());
      expect(raw).not.toContain("sk-test-should-never-leak-1234567890");
      expect(raw).not.toContain("sk-shouldnotleak1234567890");
      expect(raw).not.toContain(PASSWORD);
      expect(raw.toLowerCase()).not.toContain(cookie().toLowerCase());
    } finally {
      delete process.env.OPENAI_API_KEY;
    }
  });
});

describe("support agent trace redaction", () => {
  const cookie = () => authedCookie();

  it("never includes secrets, the session cookie, or the demo password in the support response body", async () => {
    process.env.OPENAI_API_KEY = "sk-test-should-never-leak-1234567890";
    try {
      const response = await supportRoute(new Request("http://localhost/api/support", {
        method: "POST",
        headers: { "content-type": "application/json", cookie: cookie(), "x-forwarded-for": "203.0.113.31" },
        body: JSON.stringify({ message: `My key is sk-shouldnotleak1234567890, how do I create a new account?` }),
      }));
      const raw = JSON.stringify(await response.json());
      expect(raw).not.toContain("sk-test-should-never-leak-1234567890");
      expect(raw).not.toContain("sk-shouldnotleak1234567890");
      expect(raw).not.toContain(PASSWORD);
      expect(raw.toLowerCase()).not.toContain(cookie().toLowerCase());
    } finally {
      delete process.env.OPENAI_API_KEY;
    }
  });
});
