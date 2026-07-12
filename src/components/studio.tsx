"use client";

import { FormEvent, useEffect, useState } from "react";
import { knowledgeDocuments } from "@/lib/knowledge";
import {
  LanguageSwitcher,
  uiCopy,
  useUiLocale,
  type UiLocale,
} from "@/lib/ui-i18n";

type Module = "chat" | "knowledge" | "workflow" | "agent" | "support";
type WorkflowStep = { step: string; detail: string; status: string };
type AgentPlanStep = { tool: string; reason: string };
type AgentStepTrace = {
  tool: string;
  input: Record<string, unknown>;
  outputSummary: string;
  resultCount: number;
};
type AgentSource = { id: string; title: string; score: number };
type AgentVerifier = {
  applicable: boolean;
  grounded: boolean;
  groundednessScore: number;
  supportingSourceIds: string[];
  warning: string | null;
};
type AgentTrace = {
  plan: AgentPlanStep[];
  steps: AgentStepTrace[];
  sources: AgentSource[];
  verifier: AgentVerifier;
  latencyMs: number;
  toolCallCount: number;
  modelCallCount: number;
  estimatedUsage: { promptTokens: number; totalTokens: number } | null;
  mode: string;
};
type AgentResult = { answer: string; trace: AgentTrace };
type SupportTrace = {
  intent: string;
  risk: string;
  steps: AgentStepTrace[];
  sources: AgentSource[];
  verifier: AgentVerifier;
  decision: "AUTO_RESPOND" | "ESCALATE";
  escalationReason: string | null;
  latencyMs: number;
  toolCallCount: number;
  modelCallCount: number;
  estimatedUsage: { promptTokens: number; totalTokens: number } | null;
  mode: string;
};
type SupportResult = { answer: string; trace: SupportTrace };

const moduleIds: Module[] = [
  "chat",
  "knowledge",
  "workflow",
  "agent",
  "support",
];

export function Studio() {
  const { locale, setLocale, copy } = useUiLocale();
  const modules = moduleIds.map((id, index) => ({
    id,
    number: String(index + 1).padStart(2, "0"),
    label: copy.modules[index][0],
    description: copy.modules[index][1],
  }));
  const [active, setActive] = useState<Module>("chat");
  const [liveAI, setLiveAI] = useState(false);
  useEffect(() => {
    fetch("/api/status")
      .then((response) => response.json())
      .then((data: { liveAI: boolean }) => setLiveAI(data.liveAI))
      .catch(() => setLiveAI(false));
  }, []);
  async function signOut() {
    await fetch("/api/logout", { method: "POST" }).catch(() => {});
    window.location.href = "/login";
  }
  return (
    <div className="mx-auto min-h-screen max-w-[1500px] px-5 py-5 sm:px-8 lg:px-12">
      <header className="flex items-center justify-between border-b border-white/10 pb-5">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-lg border border-green-300/30 bg-green-300/10 font-mono text-sm text-green-300">
            AI
          </div>
          <div>
            <p className="text-sm font-semibold tracking-tight">
              AI Operations Studio
            </p>
            <p className="text-xs text-[#90a9a0]">{copy.subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <LanguageSwitcher locale={locale} onChange={setLocale} />
          <div className="hidden items-center gap-2 rounded-full border border-green-300/20 bg-green-300/5 px-3 py-1.5 text-xs text-green-200 sm:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-green-300" />
            {liveAI ? copy.live : copy.safe}
          </div>
          <button
            type="button"
            onClick={signOut}
            className="rounded-full border border-white/10 bg-white/[.03] px-3 py-1.5 text-xs text-[#90a9a0] transition hover:border-green-300/30 hover:text-green-200"
          >
            {copy.signOut}
          </button>
        </div>
      </header>

      <main className="grid gap-10 py-10 lg:grid-cols-[340px_1fr] lg:py-16">
        <section>
          <p className="mb-4 font-mono text-xs uppercase tracking-[.22em] text-green-300">
            {copy.eyebrow}
          </p>
          <h1 className="max-w-sm text-4xl font-semibold leading-[1.05] tracking-[-.05em] sm:text-5xl">
            {copy.hero}
          </h1>
          <p className="mt-5 max-w-sm text-sm leading-6 text-[#90a9a0]">
            {copy.intro}
          </p>
          <div className="mt-9 space-y-2">
            {modules.map((module) => (
              <button
                key={module.id}
                onClick={() => setActive(module.id)}
                className={`group flex w-full items-center gap-4 rounded-xl border px-4 py-3 text-left transition ${active === module.id ? "border-green-300/30 bg-green-300/10" : "border-transparent hover:border-white/10 hover:bg-white/[.03]"}`}
              >
                <span
                  className={`font-mono text-xs ${active === module.id ? "text-green-300" : "text-[#60776f]"}`}
                >
                  {module.number}
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-medium">
                    {module.label}
                  </span>
                  <span className="block text-xs text-[#718a81]">
                    {module.description}
                  </span>
                </span>
                <span
                  className={`text-lg ${active === module.id ? "text-green-300" : "text-[#456057]"}`}
                >
                  →
                </span>
              </button>
            ))}
          </div>
          <div className="mt-9 grid grid-cols-3 gap-2 border-t border-white/10 pt-5 text-center">
            {copy.stats.map(([value, label]) => (
              <div key={label}>
                <p className="font-mono text-lg text-green-200">{value}</p>
                <p className="text-[10px] uppercase tracking-wider text-[#60776f]">
                  {label}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-[#0c1917]/90 shadow-2xl shadow-black/30">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <div>
              <p className="text-sm font-medium">
                {modules.find((m) => m.id === active)?.label}
              </p>
              <p className="text-xs text-[#718a81]">{copy.interactive}</p>
            </div>
            <span className="rounded-md bg-white/5 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-[#718a81]">
              {copy.prototype}
            </span>
          </div>
          <div className="min-h-[570px] p-5 sm:p-7">
            {active === "chat" ? (
              <ChatDemo locale={locale} />
            ) : active === "knowledge" ? (
              <KnowledgeDemo locale={locale} />
            ) : active === "workflow" ? (
              <WorkflowDemo locale={locale} />
            ) : active === "agent" ? (
              <AgentDemo locale={locale} />
            ) : (
              <SupportDemo locale={locale} />
            )}
          </div>
        </section>
      </main>
      <footer className="flex flex-col gap-2 border-t border-white/10 py-5 text-xs text-[#60776f] sm:flex-row sm:items-center sm:justify-between">
        <p>{copy.footer}</p>
        <p className="font-mono">Next.js · TypeScript · Tailwind CSS</p>
      </footer>
    </div>
  );
}

function ChatDemo({ locale }: { locale: UiLocale }) {
  const copy = uiCopy[locale];
  const [message, setMessage] = useState<string>(copy.chatDefault);
  const [submittedMessage, setSubmittedMessage] = useState("");
  const [result, setResult] = useState<{
    answer: string;
    toolCalls: { name: string; resultCount: number; summary: string }[];
    mode: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const suggestions = copy.chatSuggestions;
  useEffect(() => {
    if (!submittedMessage) queueMicrotask(() => setMessage(copy.chatDefault));
  }, [copy.chatDefault, submittedMessage]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    const prompt = message.trim();
    if (!prompt) return;
    setSubmittedMessage(prompt);
    setMessage("");
    setLoading(true);
    setResult(null);
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: prompt }),
    });
    setResult(await response.json());
    setLoading(false);
  }
  return (
    <div className="flex min-h-[510px] flex-col">
      <div className="mb-5 rounded-xl border border-white/10 bg-[#07100f] p-4">
        <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-green-300">
          {copy.chatTitle}
        </p>
        <p className="text-sm leading-5 text-[#b7cbc3]">{copy.chatIntro}</p>
      </div>
      <div className="mb-6 flex flex-wrap gap-2">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => setMessage(suggestion)}
            className="rounded-full border border-white/10 bg-white/[.025] px-3 py-1.5 text-left text-xs text-[#90a9a0] transition hover:border-green-300/30 hover:text-green-200"
          >
            {suggestion}
          </button>
        ))}
      </div>
      <div className="flex-1 space-y-4" aria-live="polite">
        {!submittedMessage && (
          <div className="rounded-xl border border-dashed border-white/10 px-5 py-10 text-center">
            <p className="text-sm text-[#90a9a0]">{copy.empty}</p>
            <p className="mt-2 text-xs text-[#60776f]">
              {copy.documentsFictional}
            </p>
          </div>
        )}
        {submittedMessage && (
          <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-green-300 px-4 py-3 text-sm text-[#07100f]">
            {submittedMessage}
          </div>
        )}
        {loading && (
          <div className="max-w-[90%] rounded-2xl rounded-bl-sm border border-white/10 bg-white/[.04] px-4 py-3 text-sm text-[#90a9a0]">
            {copy.reviewing}
          </div>
        )}
        {result && (
          <div className="max-w-[90%] space-y-3">
            <div className="rounded-2xl rounded-bl-sm border border-white/10 bg-white/[.04] px-4 py-3 text-sm leading-6 text-[#d9e8e2]">
              {result.answer}
            </div>
            {result.toolCalls.length > 0 && (
              <details className="rounded-xl border border-white/10 bg-[#07100f] p-3">
                <summary className="cursor-pointer text-xs font-medium text-green-300">
                  {copy.traceLink}
                </summary>
                <div className="mt-3 space-y-2 border-t border-white/10 pt-3">
                  {result.toolCalls.map((tool, index) => (
                    <div
                      key={`${tool.name}-${index}`}
                      className="font-mono text-xs"
                    >
                      <div className="flex flex-wrap justify-between gap-2 text-[#b7cbc3]">
                        <span>{tool.name}</span>
                        <span>
                          {tool.resultCount} {copy.itemsReviewed}
                        </span>
                      </div>
                      <p className="mt-1 text-[#718a81]">{tool.summary}</p>
                    </div>
                  ))}
                  <p className="font-mono text-[10px] uppercase tracking-wider text-[#60776f]">
                    {copy.executionMode}: {result.mode}
                  </p>
                </div>
              </details>
            )}
          </div>
        )}
      </div>
      <form
        onSubmit={submit}
        className="mt-6 flex gap-2 rounded-xl border border-white/10 bg-[#07100f] p-2"
      >
        <input
          aria-label="Chat message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={copy.askPlaceholder}
          className="min-w-0 flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-[#456057]"
        />
        <button
          disabled={loading || !message.trim()}
          className="rounded-lg bg-green-300 px-4 py-2 text-sm font-medium text-[#07100f] disabled:opacity-50"
        >
          {loading ? copy.running : copy.ask}
        </button>
      </form>
    </div>
  );
}

function KnowledgeDemo({ locale }: { locale: UiLocale }) {
  const copy = uiCopy[locale];
  const [query, setQuery] = useState<string>(copy.knowledgeQuery);
  useEffect(() => {
    queueMicrotask(() => setQuery(copy.knowledgeQuery));
  }, [copy.knowledgeQuery]);
  const [result, setResult] = useState<{
    answer: string;
    sources: { id: string; title: string; score: number }[];
    retrievalMode: string;
    embeddingModel: string;
  } | null>(null);
  const [metrics, setMetrics] = useState<{
    passed: number;
    total: number;
    top1Accuracy: number;
  } | null>(null);
  async function submit(event: FormEvent) {
    event.preventDefault();
    const [response, evaluation] = await Promise.all([
      fetch("/api/rag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      }),
      fetch("/api/evaluation"),
    ]);
    setResult(await response.json());
    setMetrics(await evaluation.json());
  }
  return (
    <div>
      <form onSubmit={submit} className="flex gap-2">
        <input
          aria-label="Knowledge query"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-white/10 bg-[#07100f] px-4 py-3 text-sm outline-none focus:border-green-300/40"
        />
        <button className="rounded-lg bg-green-300 px-4 text-sm font-medium text-[#07100f]">
          {copy.search}
        </button>
      </form>
      <div className="mt-7 grid gap-5 xl:grid-cols-[.9fr_1.1fr]">
        <div>
          <p className="mb-3 font-mono text-[10px] uppercase tracking-wider text-[#718a81]">
            {copy.sampleDocuments}
          </p>
          <p className="mb-3 text-xs text-[#60776f]">{copy.sourceLanguage}</p>
          <div className="space-y-2">
            {knowledgeDocuments.map((doc) => (
              <div
                key={doc.id}
                className="rounded-xl border border-white/10 bg-white/[.025] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-medium">{doc.title}</p>
                  <span className="text-green-300">◇</span>
                </div>
                <p className="mt-2 text-xs text-[#718a81]">
                  {doc.category} · {doc.updated}
                </p>
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-3 font-mono text-[10px] uppercase tracking-wider text-[#718a81]">
            {copy.groundedAnswer}
          </p>
          <div className="min-h-56 rounded-xl border border-white/10 bg-[#07100f] p-5">
            {result ? (
              <>
                <p className="text-sm leading-6 text-[#d9e8e2]">
                  {result.answer}
                </p>
                <div className="mt-5 border-t border-white/10 pt-4">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[10px] uppercase tracking-wider text-[#60776f]">
                      {copy.citations}
                    </p>
                    <span className="rounded bg-green-300/10 px-2 py-1 font-mono text-[9px] text-green-300">
                      {result.retrievalMode} · {result.embeddingModel}
                    </span>
                  </div>
                  {result.sources.map((source) => (
                    <p key={source.id} className="mb-1 text-xs text-green-300">
                      [{source.title}] · cosine {source.score.toFixed(3)}
                    </p>
                  ))}
                </div>
                {metrics && (
                  <div className="mt-4 rounded-lg border border-green-300/20 bg-green-300/5 p-3">
                    <p className="font-mono text-[10px] uppercase tracking-wider text-green-300">
                      {copy.evaluation}
                    </p>
                    <p className="mt-1 text-xs text-[#d9e8e2]">
                      {copy.topAccuracy}:{" "}
                      {Math.round(metrics.top1Accuracy * 100)}% (
                      {metrics.passed}/{metrics.total} documented cases)
                    </p>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-[#60776f]">{copy.runQuery}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function WorkflowDemo({ locale }: { locale: UiLocale }) {
  const copy = uiCopy[locale];
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [runId, setRunId] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/workflow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(form)),
    });
    const data = await response.json();
    setSteps(data.steps);
    setRunId(data.runId);
  }
  return (
    <div className="grid gap-7 xl:grid-cols-[.9fr_1.1fr]">
      <form key={locale} onSubmit={submit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs text-[#90a9a0]">
            {copy.requester}
          </label>
          <input
            name="requester"
            required
            defaultValue="Maya Chen"
            className="w-full rounded-lg border border-white/10 bg-[#07100f] px-3 py-2.5 text-sm outline-none"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs text-[#90a9a0]">
            {copy.requestType}
          </label>
          <select
            name="type"
            className="w-full rounded-lg border border-white/10 bg-[#07100f] px-3 py-2.5 text-sm"
          >
            <option value="Software access">
              {locale === "th"
                ? "สิทธิ์ซอฟต์แวร์"
                : locale === "zh"
                  ? "软件访问"
                  : "Software access"}
            </option>
            <option value="Equipment">
              {locale === "th"
                ? "อุปกรณ์"
                : locale === "zh"
                  ? "设备"
                  : "Equipment"}
            </option>
            <option value="Training">
              {locale === "th"
                ? "การฝึกอบรม"
                : locale === "zh"
                  ? "培训"
                  : "Training"}
            </option>
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs text-[#90a9a0]">
            {copy.priority}
          </label>
          <select
            name="priority"
            className="w-full rounded-lg border border-white/10 bg-[#07100f] px-3 py-2.5 text-sm"
          >
            <option value="Normal">
              {locale === "th" ? "ปกติ" : locale === "zh" ? "普通" : "Normal"}
            </option>
            <option value="High">
              {locale === "th" ? "สูง" : locale === "zh" ? "高" : "High"}
            </option>
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs text-[#90a9a0]">
            {copy.justification}
          </label>
          <textarea
            name="details"
            required
            defaultValue={copy.workflowDetails}
            rows={4}
            className="w-full resize-none rounded-lg border border-white/10 bg-[#07100f] px-3 py-2.5 text-sm outline-none"
          />
        </div>
        <button className="w-full rounded-lg bg-green-300 py-2.5 text-sm font-medium text-[#07100f]">
          {copy.runWorkflow}
        </button>
      </form>
      <div>
        <div className="mb-4 flex items-center justify-between">
          <p className="font-mono text-[10px] uppercase tracking-wider text-[#718a81]">
            {copy.executionTrace}
          </p>
          {runId && (
            <span className="font-mono text-[10px] text-green-300">
              {runId}
            </span>
          )}
        </div>
        <div className="space-y-2">
          {steps.length ? (
            steps.map((item, index) => (
              <div
                key={item.step}
                className="flex gap-4 rounded-xl border border-white/10 bg-white/[.025] p-4"
              >
                <div
                  className={`grid h-7 w-7 shrink-0 place-items-center rounded-full font-mono text-xs ${item.status === "review" ? "bg-amber-300/15 text-amber-200" : "bg-green-300/15 text-green-300"}`}
                >
                  {index + 1}
                </div>
                <div>
                  <p className="text-sm font-medium">{item.step}</p>
                  <p className="mt-1 text-xs text-[#718a81]">{item.detail}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-[#60776f]">
              {copy.submitWorkflow}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const agentScenarios = [
  {
    label: "1 · Policy question (RAG)",
    message:
      "What is the deadline for submitting an expense claim, and what proof is required?",
  },
  {
    label: "2 · Workflow analysis",
    message:
      "Analyze this request and run workflow rules: a high priority equipment request for Maya Chen who needs a new laptop.",
  },
  {
    label: "3 · Insufficient evidence",
    message: "How many annual leave days does an employee receive?",
  },
];

function AgentDemo({ locale }: { locale: UiLocale }) {
  const copy = uiCopy[locale];
  const scenarios =
    locale === "th"
      ? [
          {
            label: "1 · คำถามนโยบาย (RAG)",
            message:
              "ต้องส่งคำขอเบิกค่าใช้จ่ายภายในกี่วัน และต้องใช้หลักฐานอะไร",
          },
          {
            label: "2 · วิเคราะห์เวิร์กโฟลว์",
            message: "วิเคราะห์คำขออุปกรณ์เร่งด่วนสำหรับ Maya Chen",
          },
          {
            label: "3 · ข้อมูลไม่เพียงพอ",
            message: "พนักงานมีวันลาพักร้อนกี่วันต่อปี",
          },
        ]
      : locale === "zh"
        ? [
            {
              label: "1 · 政策问题 (RAG)",
              message: "费用报销的截止时间和所需证明是什么？",
            },
            {
              label: "2 · 工作流分析",
              message: "分析 Maya Chen 的高优先级设备请求。",
            },
            { label: "3 · 证据不足", message: "员工每年有多少天年假？" },
          ]
        : agentScenarios;
  const [message, setMessage] = useState("");
  const [submittedMessage, setSubmittedMessage] = useState("");
  const [result, setResult] = useState<AgentResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function run(prompt: string) {
    const trimmed = prompt.trim();
    if (!trimmed) return;
    setSubmittedMessage(trimmed);
    setMessage("");
    setLoading(true);
    setResult(null);
    const response = await fetch("/api/agent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: trimmed }),
    });
    setResult(await response.json());
    setLoading(false);
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    await run(message);
  }

  return (
    <div className="flex min-h-[510px] flex-col">
      <div className="mb-5 rounded-xl border border-white/10 bg-[#07100f] p-4">
        <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-green-300">
          {copy.agentTitle}
        </p>
        <p className="text-sm leading-5 text-[#b7cbc3]">{copy.agentIntro}</p>
      </div>
      <div className="mb-6 flex flex-wrap gap-2">
        {scenarios.map((scenario) => (
          <button
            key={scenario.label}
            type="button"
            disabled={loading}
            onClick={() => run(scenario.message)}
            className="rounded-full border border-green-300/20 bg-green-300/5 px-3 py-1.5 text-left text-xs text-green-200 transition hover:border-green-300/40 disabled:opacity-50"
          >
            {scenario.label}
          </button>
        ))}
      </div>

      <div className="flex-1 space-y-4" aria-live="polite">
        {!submittedMessage && (
          <div className="rounded-xl border border-dashed border-white/10 px-5 py-10 text-center">
            <p className="text-sm text-[#90a9a0]">{copy.agentEmpty}</p>
            <p className="mt-2 text-xs text-[#60776f]">
              {copy.documentsFictional}
            </p>
          </div>
        )}
        {submittedMessage && (
          <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-green-300 px-4 py-3 text-sm text-[#07100f]">
            {submittedMessage}
          </div>
        )}
        {loading && (
          <div className="max-w-[90%] rounded-2xl rounded-bl-sm border border-white/10 bg-white/[.04] px-4 py-3 text-sm text-[#90a9a0]">
            {copy.planning}
          </div>
        )}
        {result && (
          <div className="max-w-full space-y-3">
            <div className="rounded-2xl rounded-bl-sm border border-white/10 bg-white/[.04] px-4 py-3 text-sm leading-6 text-[#d9e8e2]">
              {result.answer}
            </div>

            <div className="rounded-xl border border-white/10 bg-[#07100f] p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="font-mono text-[10px] uppercase tracking-wider text-green-300">
                  {copy.trace}
                </p>
                <span className="rounded bg-green-300/10 px-2 py-1 font-mono text-[9px] text-green-300">
                  {result.trace.mode} · {result.trace.latencyMs}ms ·{" "}
                  {result.trace.toolCallCount} tool call
                  {result.trace.toolCallCount === 1 ? "" : "s"} ·{" "}
                  {result.trace.modelCallCount} model call
                  {result.trace.modelCallCount === 1 ? "" : "s"}
                </span>
              </div>

              <p className="mb-1 text-[10px] uppercase tracking-wider text-[#60776f]">
                {copy.plan}
              </p>
              {result.trace.plan.length ? (
                <div className="mb-4 space-y-1">
                  {result.trace.plan.map((step, index) => (
                    <p
                      key={`${step.tool}-${index}`}
                      className="font-mono text-xs text-[#b7cbc3]"
                    >
                      {index + 1}.{" "}
                      <span className="text-green-300">{step.tool}</span> —{" "}
                      {step.reason}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="mb-4 text-xs text-[#718a81]">{copy.noTool}</p>
              )}

              <p className="mb-1 text-[10px] uppercase tracking-wider text-[#60776f]">
                {copy.tools}
              </p>
              <div className="mb-4 space-y-2">
                {result.trace.steps.map((step, index) => (
                  <div
                    key={`${step.tool}-${index}`}
                    className="font-mono text-xs"
                  >
                    <div className="flex flex-wrap justify-between gap-2 text-[#b7cbc3]">
                      <span>{step.tool}</span>
                      <span>
                        {step.resultCount}{" "}
                        {step.resultCount === 1 ? "item" : "items"}
                      </span>
                    </div>
                    <p className="mt-1 text-[#718a81]">
                      in: {JSON.stringify(step.input)}
                    </p>
                    <p className="text-[#718a81]">out: {step.outputSummary}</p>
                  </div>
                ))}
              </div>

              {result.trace.sources.length > 0 && (
                <>
                  <p className="mb-1 text-[10px] uppercase tracking-wider text-[#60776f]">
                    {copy.sources}
                  </p>
                  <div className="mb-4 space-y-1">
                    {result.trace.sources.map((source) => (
                      <p key={source.id} className="text-xs text-green-300">
                        [{source.title}] · cosine {source.score.toFixed(3)}
                      </p>
                    ))}
                  </div>
                </>
              )}

              <p className="mb-1 text-[10px] uppercase tracking-wider text-[#60776f]">
                {copy.verifier}
              </p>
              <div
                className={`mb-4 rounded-lg border p-3 ${!result.trace.verifier.applicable ? "border-white/10 bg-white/[.02]" : result.trace.verifier.grounded ? "border-green-300/20 bg-green-300/5" : "border-amber-300/30 bg-amber-300/10"}`}
              >
                {result.trace.verifier.applicable ? (
                  <>
                    <p className="text-xs text-[#d9e8e2]">
                      Grounded:{" "}
                      <span
                        className={
                          result.trace.verifier.grounded
                            ? "text-green-300"
                            : "text-amber-200"
                        }
                      >
                        {String(result.trace.verifier.grounded)}
                      </span>{" "}
                      · score{" "}
                      {result.trace.verifier.groundednessScore.toFixed(2)}
                    </p>
                    {result.trace.verifier.supportingSourceIds.length > 0 && (
                      <p className="mt-1 text-xs text-[#90a9a0]">
                        {copy.supportingSources}:{" "}
                        {result.trace.verifier.supportingSourceIds.join(", ")}
                      </p>
                    )}
                    {result.trace.verifier.warning && (
                      <p className="mt-1 text-xs text-amber-200">
                        ⚠ {result.trace.verifier.warning}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-[#718a81]">{copy.notApplicable}</p>
                )}
              </div>

              <p className="text-[10px] uppercase tracking-wider text-[#60776f]">
                {copy.heuristic}
              </p>
              {result.trace.estimatedUsage ? (
                <p className="mt-2 font-mono text-[10px] text-[#60776f]">
                  Estimated usage: {result.trace.estimatedUsage.promptTokens}{" "}
                  prompt / {result.trace.estimatedUsage.totalTokens} total
                  tokens (embedding call)
                </p>
              ) : (
                <p className="mt-2 font-mono text-[10px] text-[#60776f]">
                  Estimated usage: not available (deterministic mode has no
                  provider usage data)
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <form
        onSubmit={submit}
        className="mt-6 flex gap-2 rounded-xl border border-white/10 bg-[#07100f] p-2"
      >
        <input
          aria-label="Agent message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={copy.agentPlaceholder}
          className="min-w-0 flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-[#456057]"
        />
        <button
          disabled={loading || !message.trim()}
          className="rounded-lg bg-green-300 px-4 py-2 text-sm font-medium text-[#07100f] disabled:opacity-50"
        >
          {loading ? copy.running : copy.runCopilot}
        </button>
      </form>
    </div>
  );
}

function SupportDemo({ locale }: { locale: UiLocale }) {
  const copy = uiCopy[locale];
  const localizedScenarios = copy.scenarios.map(([label, message], index) => ({
    label: `${index + 1} · ${label}`,
    message,
  }));
  const [message, setMessage] = useState("");
  const [submittedMessage, setSubmittedMessage] = useState("");
  const [result, setResult] = useState<SupportResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function run(prompt: string) {
    const trimmed = prompt.trim();
    if (!trimmed) return;
    setSubmittedMessage(trimmed);
    setMessage("");
    setLoading(true);
    setResult(null);
    const response = await fetch("/api/support", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: trimmed }),
    });
    setResult(await response.json());
    setLoading(false);
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    await run(message);
  }

  return (
    <div className="flex min-h-[510px] flex-col">
      <div className="mb-5 rounded-xl border border-white/10 bg-[#07100f] p-4">
        <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-green-300">
          {copy.supportTitle}
        </p>
        <p className="text-sm leading-5 text-[#b7cbc3]">{copy.supportIntro}</p>
        <p className="mt-2 text-xs text-[#718a81]">{copy.supportLimit}</p>
      </div>
      <div className="mb-6 flex flex-wrap gap-2">
        {localizedScenarios.map((scenario) => (
          <button
            key={scenario.label}
            type="button"
            disabled={loading}
            onClick={() => run(scenario.message)}
            className="rounded-full border border-green-300/20 bg-green-300/5 px-3 py-1.5 text-left text-xs text-green-200 transition hover:border-green-300/40 disabled:opacity-50"
          >
            {scenario.label}
          </button>
        ))}
      </div>

      <div className="flex-1 space-y-4" aria-live="polite">
        {!submittedMessage && (
          <div className="rounded-xl border border-dashed border-white/10 px-5 py-10 text-center">
            <p className="text-sm text-[#90a9a0]">{copy.supportEmpty}</p>
            <p className="mt-2 text-xs text-[#60776f]">{copy.fictional}</p>
          </div>
        )}
        {submittedMessage && (
          <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-green-300 px-4 py-3 text-sm text-[#07100f]">
            {submittedMessage}
          </div>
        )}
        {loading && (
          <div className="max-w-[90%] rounded-2xl rounded-bl-sm border border-white/10 bg-white/[.04] px-4 py-3 text-sm text-[#90a9a0]">
            {copy.processing}
          </div>
        )}
        {result && (
          <div className="max-w-full space-y-3">
            <div
              className={`rounded-2xl rounded-bl-sm border px-4 py-3 text-sm leading-6 ${result.trace.decision === "ESCALATE" ? "border-amber-300/30 bg-amber-300/10 text-amber-100" : "border-white/10 bg-white/[.04] text-[#d9e8e2]"}`}
            >
              <span className="mr-2 rounded bg-black/20 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider">
                {result.trace.decision}
              </span>
              {result.answer}
            </div>

            <div className="rounded-xl border border-white/10 bg-[#07100f] p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="font-mono text-[10px] uppercase tracking-wider text-green-300">
                  Execution trace
                </p>
                <span className="rounded bg-green-300/10 px-2 py-1 font-mono text-[9px] text-green-300">
                  {result.trace.mode} · {result.trace.latencyMs}ms ·{" "}
                  {result.trace.toolCallCount} tool call
                  {result.trace.toolCallCount === 1 ? "" : "s"} ·{" "}
                  {result.trace.modelCallCount} model call
                  {result.trace.modelCallCount === 1 ? "" : "s"}
                </span>
              </div>

              <div className="mb-4 grid grid-cols-2 gap-2 text-xs">
                <p className="text-[#b7cbc3]">
                  {copy.intent}:{" "}
                  <span className="text-green-300">{result.trace.intent}</span>
                </p>
                <p className="text-[#b7cbc3]">
                  {copy.risk}:{" "}
                  <span
                    className={
                      result.trace.risk === "HIGH"
                        ? "text-amber-200"
                        : "text-green-300"
                    }
                  >
                    {result.trace.risk}
                  </span>
                </p>
              </div>

              {result.trace.escalationReason && (
                <p className="mb-4 rounded-lg border border-amber-300/30 bg-amber-300/10 p-3 text-xs text-amber-100">
                  {copy.reason}: {result.trace.escalationReason}
                </p>
              )}

              <p className="mb-1 text-[10px] uppercase tracking-wider text-[#60776f]">
                {copy.tools}
              </p>
              <div className="mb-4 space-y-2">
                {result.trace.steps.map((step, index) => (
                  <div
                    key={`${step.tool}-${index}`}
                    className="font-mono text-xs"
                  >
                    <div className="flex flex-wrap justify-between gap-2 text-[#b7cbc3]">
                      <span>{step.tool}</span>
                      <span>
                        {step.resultCount}{" "}
                        {step.resultCount === 1 ? "item" : "items"}
                      </span>
                    </div>
                    <p className="mt-1 text-[#718a81]">
                      out: {step.outputSummary}
                    </p>
                  </div>
                ))}
              </div>

              {result.trace.sources.length > 0 && (
                <>
                  <p className="mb-1 text-[10px] uppercase tracking-wider text-[#60776f]">
                    {copy.sources}
                  </p>
                  <div className="mb-4 space-y-1">
                    {result.trace.sources.map((source) => (
                      <p key={source.id} className="text-xs text-green-300">
                        [{source.title}] · cosine {source.score.toFixed(3)}
                      </p>
                    ))}
                  </div>
                </>
              )}

              <p className="mb-1 text-[10px] uppercase tracking-wider text-[#60776f]">
                {copy.verifier}
              </p>
              <div
                className={`mb-4 rounded-lg border p-3 ${!result.trace.verifier.applicable ? "border-white/10 bg-white/[.02]" : result.trace.verifier.grounded ? "border-green-300/20 bg-green-300/5" : "border-amber-300/30 bg-amber-300/10"}`}
              >
                {result.trace.verifier.applicable ? (
                  <>
                    <p className="text-xs text-[#d9e8e2]">
                      Grounded:{" "}
                      <span
                        className={
                          result.trace.verifier.grounded
                            ? "text-green-300"
                            : "text-amber-200"
                        }
                      >
                        {String(result.trace.verifier.grounded)}
                      </span>{" "}
                      · score{" "}
                      {result.trace.verifier.groundednessScore.toFixed(2)}
                    </p>
                    {result.trace.verifier.warning && (
                      <p className="mt-1 text-xs text-amber-200">
                        ⚠ {result.trace.verifier.warning}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-[#718a81]">{copy.notApplicable}</p>
                )}
              </div>

              {result.trace.estimatedUsage ? (
                <p className="font-mono text-[10px] text-[#60776f]">
                  Estimated usage: {result.trace.estimatedUsage.promptTokens}{" "}
                  prompt / {result.trace.estimatedUsage.totalTokens} total
                  tokens (embedding call)
                </p>
              ) : (
                <p className="font-mono text-[10px] text-[#60776f]">
                  Estimated usage: not available (deterministic mode has no
                  provider usage data)
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <form
        onSubmit={submit}
        className="mt-6 flex gap-2 rounded-xl border border-white/10 bg-[#07100f] p-2"
      >
        <input
          aria-label="Support message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={copy.placeholder}
          className="min-w-0 flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-[#456057]"
        />
        <button
          disabled={loading || !message.trim()}
          className="rounded-lg bg-green-300 px-4 py-2 text-sm font-medium text-[#07100f] disabled:opacity-50"
        >
          {loading ? copy.running : copy.run}
        </button>
      </form>
    </div>
  );
}
