"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { knowledgeDocuments } from "@/lib/knowledge";
import { supportBehaviorConfig } from "@/lib/support-behavior";
import {
  LanguageSwitcher,
  uiCopy,
  useUiLocale,
  type UiLocale,
} from "@/lib/ui-i18n";

type Module = "chat" | "knowledge" | "workflow" | "agent" | "support" | "analytics" | "settings";
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
  customerScope?: string | null;
};
type HandoffResult = {
  success: boolean;
  simulated: boolean;
  handoffId?: string;
  status: "QUEUED" | "FAILED" | "RETRYABLE";
  destination?: string;
  createdAt?: string;
  idempotent?: boolean;
};
type TransactionResult = {
  simulated: true;
  found: boolean;
  reference: string | null;
  kind: "DEPOSIT" | "WITHDRAWAL" | null;
  status: "PENDING" | "PROCESSING" | "CREDITED" | "COMPLETED" | "REJECTED" | "NOT_FOUND" | "NEEDS_REFERENCE";
  amount?: number;
  currency?: "THB";
  updatedAt?: string;
  safeReason?: string;
  reviewRequired: boolean;
};
type SupportResult = { answer: string; customerVerificationRequired?: boolean; slipUploadRequired?: boolean; transaction?: TransactionResult | null; handoff?: HandoffResult | null; trace: SupportTrace };
type SlipApiResult = {
  verification: { simulated: true; status: "VERIFIED" | "REJECTED" | "DUPLICATE"; slipReference: string; extracted: { amount: number | null; currency: "THB"; transferReference: string | null; destinationAccount: string | null }; confidence: number; reason: string };
  reconciliation: { simulated: true; accepted: boolean; status: "MATCHED_PENDING_CREDIT" | "NOT_SENT"; backofficeReference?: string; idempotent: boolean };
  trace: Array<{ tool: string; status: string }>;
};
type SupportHistoryEntry = {
  id: string;
  user: string;
  answer: string;
  decision: "AUTO_RESPOND" | "ESCALATE";
};
type DemoCustomer = { userId: string; displayName: string; tier: "STANDARD" | "PLUS"; status: "ACTIVE" };

const moduleIds: Exclude<Module, "chat">[] = [
  "support",
  "knowledge",
  "workflow",
  "agent",
  "analytics",
  "settings",
];
const moduleCopyIndex: Record<Exclude<Module, "chat" | "settings" | "analytics">, number> = {
  knowledge: 0,
  workflow: 1,
  agent: 2,
  support: 3,
};

export function Studio() {
  const { locale, setLocale, copy } = useUiLocale();
  const modules = moduleIds.map((id, index) => ({
    id,
    number: String(index + 1).padStart(2, "0"),
    label: id === "settings" ? locale === "th" ? "ตั้งค่าพฤติกรรม AI" : locale === "zh" ? "AI 行为设置" : "AI Behavior Settings" : id === "analytics" ? locale === "th" ? "วิเคราะห์ปัญหาลูกค้า" : locale === "zh" ? "客户问题分析" : "Support Analytics" : copy.modules[moduleCopyIndex[id]][0],
    description: id === "settings" ? locale === "th" ? "บทบาท น้ำเสียง หลักคิด และกฎความปลอดภัย" : locale === "zh" ? "角色、语气、原则与安全规则" : "Role, tone, principles, and safety rules" : id === "analytics" ? locale === "th" ? "รายวัน รายสัปดาห์ รายเดือน และทีมที่ต้องปรับปรุง" : locale === "zh" ? "每日、每周、每月趋势与改进负责人" : "Daily, weekly, monthly trends and improvement owners" : copy.modules[moduleCopyIndex[id]][1],
  }));
  const [active, setActive] = useState<Module>("support");
  const [view, setView] = useState<"customer" | "internal">("customer");
  const viewLabels = locale === "th"
    ? { customer: "Live Chat", internal: "ระบบการทำงานภายใน", customerTitle: "บริการลูกค้าออนไลน์", customerIntro: "สอบถามเรื่องฝากเงิน ถอนเงิน โปรโมชั่น หรือปัญหาเกมได้ที่นี่" }
    : locale === "zh"
      ? { customer: "在线客服", internal: "内部 AI 系统", customerTitle: "在线客户服务", customerIntro: "可在此咨询存款、提款、促销或游戏问题" }
      : { customer: "Live Chat", internal: "Internal AI Operations", customerTitle: "Online customer support", customerIntro: "Ask about deposits, withdrawals, promotions, or game issues." };
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
          <div className="grid h-9 w-9 place-items-center rounded-lg border border-accent/35 bg-accent/10 font-mono text-sm text-accent">
            AI
          </div>
          <div>
            <p className="text-sm font-semibold tracking-tight">
              AI Operations Studio
            </p>
            <p className="text-xs text-muted">{copy.subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden rounded-full border border-white/10 bg-white/[.03] p-1 md:flex">
            <button
              type="button"
              onClick={() => setView("customer")}
              className={`kb-focusable min-h-[32px] rounded-full px-3 text-xs transition ${view === "customer" ? "bg-accent text-[#07101F] font-semibold" : "text-muted hover:text-foreground"}`}
            >
              {viewLabels.customer}
            </button>
            <button
              type="button"
              onClick={() => setView("internal")}
              className={`kb-focusable min-h-[32px] rounded-full px-3 text-xs transition ${view === "internal" ? "bg-accent text-[#07101F] font-semibold" : "text-muted hover:text-foreground"}`}
            >
              {viewLabels.internal}
            </button>
          </div>
          <LanguageSwitcher locale={locale} onChange={setLocale} />
          <div className="hidden items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-3 py-1.5 text-xs text-accent-secondary sm:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            {liveAI ? copy.live : copy.safe}
          </div>
          <button
            type="button"
            onClick={signOut}
            className="kb-focusable rounded-full border border-white/10 bg-white/[.03] px-3 py-1.5 text-xs text-muted transition hover:border-accent/30 hover:text-accent min-h-[32px]"
          >
            {copy.signOut}
          </button>
        </div>
      </header>

      <div className="mt-4 grid grid-cols-2 gap-2 md:hidden">
        <button type="button" onClick={() => setView("customer")} className={`kb-focusable min-h-[44px] rounded-xl border px-3 text-sm ${view === "customer" ? "border-accent/40 bg-accent/10 text-accent" : "border-white/10 text-muted"}`}>{viewLabels.customer}</button>
        <button type="button" onClick={() => setView("internal")} className={`kb-focusable min-h-[44px] rounded-xl border px-3 text-sm ${view === "internal" ? "border-accent/40 bg-accent/10 text-accent" : "border-white/10 text-muted"}`}>{viewLabels.internal}</button>
      </div>

      {view === "customer" ? (
        <main className="mx-auto max-w-4xl py-8 sm:py-12">
          <div className="mb-5 text-center">
            <div className="mx-auto mb-3 flex w-fit items-center gap-2 rounded-full border border-success/20 bg-success/5 px-3 py-1.5 text-xs text-success">
              <span className="h-2 w-2 rounded-full bg-success" />
              {liveAI ? copy.live : copy.safe}
            </div>
            <h1 className="text-3xl font-semibold tracking-[-.04em] text-foreground sm:text-4xl">{viewLabels.customerTitle}</h1>
            <p className="mt-2 text-sm text-muted">{viewLabels.customerIntro}</p>
          </div>
          <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#0B1426]/90 shadow-2xl shadow-black/35">
            <SupportDemo locale={locale} customerView />
          </section>
        </main>
      ) : (
      <main className="grid gap-10 py-10 lg:grid-cols-[340px_1fr] lg:py-16">
        <section>
          <p className="mb-4 font-mono text-xs uppercase tracking-[.22em] text-accent">
            {copy.eyebrow}
          </p>
          <h1 className="max-w-sm text-4xl font-semibold leading-[1.05] tracking-[-.05em] sm:text-5xl text-foreground">
            {copy.hero}
          </h1>
          <p className="mt-5 max-w-sm text-sm leading-6 text-muted">
            {copy.intro}
          </p>
          <div className="mt-9 space-y-2">
            {modules.map((module) => (
              <button
                key={module.id}
                type="button"
                onClick={() => setActive(module.id)}
                className={`kb-focusable group flex w-full items-center gap-4 rounded-xl border px-4 py-3 text-left transition min-h-[56px] ${
                  active === module.id
                    ? "border-accent/30 bg-accent/10"
                    : "border-transparent hover:border-white/10 hover:bg-white/[.03]"
                }`}
              >
                <span
                  className={`font-mono text-xs ${
                    active === module.id ? "text-accent font-semibold" : "text-muted/60"
                  }`}
                >
                  {module.number}
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-medium text-foreground">
                    {module.label}
                  </span>
                  <span className="block text-xs text-muted">
                    {module.description}
                  </span>
                </span>
                <span
                  className={`text-lg transition ${
                    active === module.id ? "text-accent translate-x-1" : "text-muted/40"
                  }`}
                >
                  →
                </span>
              </button>
            ))}
          </div>
          <div className="mt-9 grid grid-cols-3 gap-2 border-t border-white/10 pt-5 text-center">
            {copy.stats.map(([value, label]) => (
              <div key={label}>
                <p className="font-mono text-lg text-accent-secondary font-semibold">{value}</p>
                <p className="text-[10px] uppercase tracking-wider text-muted">
                  {label}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-[#0B1426]/90 shadow-2xl shadow-black/35">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <div>
              <p className="text-sm font-medium text-foreground">
                {modules.find((m) => m.id === active)?.label}
              </p>
              <p className="text-xs text-muted">{copy.interactive}</p>
            </div>
            <span className="rounded-md bg-white/5 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-muted">
              {copy.prototype}
            </span>
          </div>
          <div className="min-h-[570px] p-5 sm:p-7">
            {active === "support" ? (
              <SupportDemo locale={locale} />
            ) : active === "knowledge" ? (
              <KnowledgeDemo locale={locale} />
            ) : active === "workflow" ? (
              <WorkflowDemo locale={locale} />
            ) : active === "agent" ? (
              <AgentDemo locale={locale} />
            ) : active === "analytics" ? (
              <SupportAnalyticsDemo locale={locale} />
            ) : <BehaviorSettingsDemo locale={locale} />}
          </div>
        </section>
      </main>
      )}
      <footer className="flex flex-col gap-2 border-t border-white/10 py-5 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>{copy.footer}</p>
        <p className="font-mono">Next.js · TypeScript · Tailwind CSS</p>
      </footer>
    </div>
  );
}

export function ChatDemo({ locale }: { locale: UiLocale }) {
  const copy = uiCopy[locale];
  const [message, setMessage] = useState<string>(copy.chatDefault);
  const [submittedMessage, setSubmittedMessage] = useState("");
  const [result, setResult] = useState<{
    answer: string;
    toolCalls: { name: string; resultCount: number; summary: string }[];
    mode: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState("");
  const suggestions = copy.chatSuggestions;

  useEffect(() => {
    if (!submittedMessage) queueMicrotask(() => setMessage(copy.chatDefault));
  }, [copy.chatDefault, submittedMessage]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const prompt = message.trim();
    if (!prompt || loading) return;
    setSubmittedMessage(prompt);
    setMessage("");
    setLoading(true);
    setResult(null);
    setErrorText("");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: prompt }),
      });

      if (response.status === 401) {
        setErrorText(copy.sessionExpired);
        setTimeout(() => {
          window.location.href = "/login";
        }, 1500);
        return;
      }

      if (response.status === 429) {
        const retryAfter = response.headers.get("Retry-After");
        setErrorText(copy.rateLimitError + (retryAfter ? ` (${retryAfter}s)` : ""));
        return;
      }

      if (!response.ok) {
        throw new Error();
      }

      setResult(await response.json());
    } catch {
      setErrorText(copy.errorAlert || "An error occurred.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[510px] flex-col">
      <div className="mb-5 rounded-xl border border-white/10 bg-[#07101F] p-4">
        <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-accent">
          {copy.chatTitle}
        </p>
        <p className="text-sm leading-5 text-muted">{copy.chatIntro}</p>
      </div>
      <div className="mb-6 flex flex-wrap gap-2">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            disabled={loading}
            onClick={() => setMessage(suggestion)}
            className="kb-focusable rounded-full border border-white/10 bg-white/[.025] px-3 py-1.5 text-left text-xs text-muted transition hover:border-accent/30 hover:text-accent hover:bg-accent/5 disabled:opacity-50 min-h-[32px]"
          >
            {suggestion}
          </button>
        ))}
      </div>
      <div className="flex-1 space-y-4" aria-live="polite">
        {!submittedMessage && !errorText && (
          <div className="rounded-xl border border-dashed border-white/10 px-5 py-10 text-center">
            <p className="text-sm text-muted">{copy.empty}</p>
            <p className="mt-2 text-xs text-muted/60">
              {copy.documentsFictional}
            </p>
          </div>
        )}
        {submittedMessage && (
          <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-accent px-4 py-3 text-sm text-[#07101F] font-medium">
            {submittedMessage}
          </div>
        )}
        {loading && (
          <div className="max-w-[90%] rounded-2xl rounded-bl-sm border border-white/10 bg-white/[.04] px-4 py-3 text-sm text-muted">
            {copy.reviewing}
          </div>
        )}
        {errorText && (
          <div className="max-w-[90%] rounded-2xl rounded-bl-sm border border-error/35 bg-error/5 px-4 py-3 text-sm text-error">
            {errorText}
          </div>
        )}
        {result && (
          <div className="max-w-[90%] space-y-3">
            <div className="rounded-2xl rounded-bl-sm border border-white/10 bg-white/[.04] px-4 py-3 text-sm leading-6 text-foreground">
              {result.answer}
            </div>
            {result.toolCalls.length > 0 && (
              <details className="group rounded-xl border border-white/10 bg-[#0B1426] p-3">
                <summary className="kb-focusable cursor-pointer text-xs font-semibold text-accent select-none list-none outline-none focus-visible:ring-1 focus-visible:ring-accent">
                  ▸ {copy.traceLink}
                </summary>
                <div className="mt-3 space-y-2 border-t border-white/10 pt-3">
                  {result.toolCalls.map((tool, index) => (
                    <div
                      key={`${tool.name}-${index}`}
                      className="font-mono text-xs"
                    >
                      <div className="flex flex-wrap justify-between gap-2 text-[#E6EEF8]/80 font-medium">
                        <span>{tool.name}</span>
                        <span className="text-accent-secondary">
                          {tool.resultCount} {copy.itemsReviewed}
                        </span>
                      </div>
                      <p className="mt-1 text-muted">{tool.summary}</p>
                    </div>
                  ))}
                  <p className="font-mono text-[10px] uppercase tracking-wider text-muted/60">
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
        className="mt-6 flex gap-2 rounded-xl border border-white/10 bg-[#07101F] p-2"
      >
        <input
          aria-label="Chat message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={copy.askPlaceholder}
          disabled={loading}
          className="kb-focusable min-w-0 flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-muted/50 text-foreground"
        />
        <button
          type="submit"
          disabled={loading || !message.trim()}
          className="kb-focusable rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-[#07101F] hover:bg-accent-strong disabled:opacity-50 min-h-[36px]"
        >
          {loading ? copy.running : copy.ask}
        </button>
      </form>
    </div>
  );
}

function KnowledgeDemo({ locale }: { locale: UiLocale }) {
  const copy = uiCopy[locale];
  const [query, setQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [demoState, setDemoState] = useState<"empty" | "loading" | "success" | "insufficient" | "error">("empty");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const [result, setResult] = useState<{
    answer: string;
    sources: {
      id: string;
      title: string;
      score: number;
      scoreComponents?: {
        vectorScore: number;
        lexicalScore: number;
        topicScore: number;
        hybridScore: number;
        matchedTopics: string[];
        matchedKeywords: string[];
      };
    }[];
    retrievalMode: string;
    embeddingModel: string;
  } | null>(null);

  const [metrics, setMetrics] = useState<{
    passed: number;
    total: number;
    top1Accuracy: number;
  } | null>(null);

  // Set default query placeholder on load/locale change
  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      setQuery(copy.knowledgeQuery);
      setDemoState("empty");
      setResult(null);
      setSelectedDocId(null);
    });
    return () => {
      active = false;
    };
  }, [copy.knowledgeQuery]);

  // Dynamic category calculations
  const categories = ["all", ...Array.from(new Set(knowledgeDocuments.map((d) => d.category)))];

  // Client-side filtering of source catalog
  const q = query.trim().toLowerCase();
  const filteredDocs = knowledgeDocuments.filter((d) => {
    const matchesCat = selectedCategory === "all" || d.category === selectedCategory;
    const matchesQuery =
      !q ||
      d.title.toLowerCase().includes(q) ||
      d.category.toLowerCase().includes(q);
    return matchesCat && matchesQuery;
  });

  const toggleDocSelect = (docId: string) => {
    setSelectedDocId((prev) => (prev === docId ? null : docId));
  };

  const handleDocKeyDown = (e: React.KeyboardEvent, docId: string) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleDocSelect(docId);
    }
  };

  async function submit(event?: FormEvent) {
    if (event) event.preventDefault();
    const prompt = query.trim();
    if (!prompt) return;

    setDemoState("loading");
    setResult(null);
    setErrorMessage("");

    try {
      const [response, evaluation] = await Promise.all([
        fetch("/api/rag", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: prompt }),
        }),
        fetch("/api/evaluation"),
      ]);

      if (response.status === 401) {
        setErrorMessage(copy.sessionExpired);
        setDemoState("error");
        setTimeout(() => {
          window.location.href = "/login";
        }, 2000);
        return;
      }

      if (response.status === 429) {
        const retryAfter = response.headers.get("Retry-After");
        setErrorMessage(copy.rateLimitError + (retryAfter ? ` (${retryAfter}s)` : ""));
        setDemoState("error");
        return;
      }

      if (!response.ok) {
        throw new Error();
      }

      const data = await response.json();
      const evalData = await evaluation.json();

      // Check threshold for insufficient evidence state
      const threshold = data.retrievalMode?.includes("local") ? 0.22 : 0.30;
      const isInsufficient =
        !data.sources || data.sources.length === 0 || data.sources[0].score < threshold;

      setResult(data);
      setMetrics(evalData);
      setDemoState(isInsufficient ? "insufficient" : "success");
    } catch {
      setErrorMessage(copy.errorAlert);
      setDemoState("error");
    }
  }

  const selectedDoc = knowledgeDocuments.find((d) => d.id === selectedDocId);

  // Render Category Label helper
  const getCategoryLabel = (cat: string) => {
    return copy.categoriesList[cat as keyof typeof copy.categoriesList] || cat;
  };

  const getDocCount = (cat: string) => {
    if (cat === "all") return knowledgeDocuments.length;
    return knowledgeDocuments.filter((d) => d.category === cat).length;
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Full-width Search query */}
      <form onSubmit={submit} className="flex gap-2 w-full">
        <input
          aria-label="Knowledge query"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={copy.askPlaceholder}
          disabled={demoState === "loading"}
          className="kb-focusable min-w-0 flex-1 rounded-xl border border-white/10 bg-[#07101F] px-4 py-3 text-sm outline-none placeholder:text-muted focus:border-accent/40"
        />
        <button
          type="submit"
          disabled={demoState === "loading"}
          className="kb-focusable rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-[#07101F] transition hover:bg-accent-strong disabled:opacity-50 min-h-[44px]"
        >
          {demoState === "loading" ? copy.running : copy.search}
        </button>
      </form>

      {/* Category Chips Scrollbar */}
      <div
        className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin"
        role="group"
        aria-label="Filter by category"
      >
        {categories.map((cat) => {
          const active = selectedCategory === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`kb-focusable shrink-0 rounded-full border px-4 py-1.5 text-xs transition min-h-[36px] ${
                active
                  ? "border-accent/40 bg-accent text-[#07101F] font-semibold"
                  : "border-white/10 bg-white/[.02] text-muted hover:text-[#E6EEF8]"
              }`}
            >
              {getCategoryLabel(cat)}{" "}
              <span className="opacity-60 font-mono text-[10px] ml-1">
                {getDocCount(cat)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Responsive two-column catalog + answer layout */}
      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        
        {/* Source Catalog Accordion (on mobile) / Static Panel (on desktop) */}
        <div className="block lg:hidden">
          <details className="group border border-white/10 bg-[#0B1426] rounded-xl p-3">
            <summary className="kb-focusable cursor-pointer text-xs font-semibold text-accent uppercase select-none list-none outline-none">
              {copy.sourceCatalog} ({filteredDocs.length} {copy.ofWord} {knowledgeDocuments.length})
            </summary>
            <div className="mt-3 max-h-[300px] overflow-y-auto border border-white/10 bg-[#07101F] rounded-lg">
              {filteredDocs.map((doc) => {
                const selected = doc.id === selectedDocId;
                return (
                  <div
                    key={doc.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => toggleDocSelect(doc.id)}
                    onKeyDown={(e) => handleDocKeyDown(e, doc.id)}
                    className={`kb-focusable flex items-center justify-between border-b border-white/5 p-3 text-left transition ${
                      selected ? "bg-accent/10" : "hover:bg-white/[.02]"
                    }`}
                  >
                    <div>
                      <p className="text-xs font-medium text-foreground">{doc.title}</p>
                      <p className="mt-1 text-[10px] text-muted">
                        {getCategoryLabel(doc.category)} · {doc.updated}
                      </p>
                    </div>
                    <span
                      className={`h-1.5 w-1.5 shrink-0 rounded-full ml-2 ${
                        selected ? "bg-accent" : "bg-white/20"
                      }`}
                    />
                  </div>
                );
              })}
              {filteredDocs.length === 0 && (
                <p className="p-4 text-center text-xs text-muted">{copy.noDocsMatch}</p>
              )}
            </div>
          </details>
        </div>

        {/* Source Catalog (Desktop static layout) */}
        <div className="hidden lg:flex flex-col">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted">
            {copy.sourceCatalog} · {filteredDocs.length} {copy.ofWord} {knowledgeDocuments.length}
          </p>
          <div className="flex-1 max-h-[440px] overflow-y-auto rounded-xl border border-white/10 bg-[#07101F]">
            {filteredDocs.map((doc) => {
              const selected = doc.id === selectedDocId;
              return (
                <div
                  key={doc.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleDocSelect(doc.id)}
                  onKeyDown={(e) => handleDocKeyDown(e, doc.id)}
                  className={`kb-focusable flex items-start justify-between border-b border-white/5 p-3 text-left transition ${
                    selected ? "bg-accent/10" : "hover:bg-white/[.02]"
                  }`}
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="text-xs font-medium text-foreground leading-normal line-clamp-2">
                      {doc.title}
                    </p>
                    <p className="mt-1.5 text-[10px] text-muted">
                      {getCategoryLabel(doc.category)} · {doc.updated}
                    </p>
                  </div>
                  <span
                    className={`h-1.5 w-1.5 shrink-0 rounded-full mt-1.5 ${
                      selected ? "bg-accent" : "bg-white/20"
                    }`}
                  />
                </div>
              );
            })}
            {filteredDocs.length === 0 && (
              <p className="p-4 text-center text-xs text-muted">{copy.noDocsMatch}</p>
            )}
          </div>
        </div>

        {/* Answer panel column */}
        <div className="flex flex-col">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted">
            {copy.groundedAnswer}
          </p>
          <div className="flex-grow min-h-[300px] lg:min-h-[440px] rounded-xl border border-white/10 bg-[#07101F] p-5 flex flex-col justify-start">
            
            {/* Empty state */}
            {demoState === "empty" && (
              <div className="my-auto text-center max-w-[320px] mx-auto">
                <p className="text-xs leading-5 text-muted">{copy.emptySearch}</p>
              </div>
            )}

            {/* Loading state */}
            {demoState === "loading" && (
              <div className="my-auto w-full flex flex-col gap-3 animate-pulse-slow">
                <div className="h-4 w-[75%] rounded bg-white/10" />
                <div className="h-4 w-[90%] rounded bg-white/10" />
                <div className="h-4 w-[60%] rounded bg-white/10" />
              </div>
            )}

            {/* Error state */}
            {demoState === "error" && (
              <div className="rounded-xl border border-error/30 bg-error/5 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-error">
                <p className="text-xs">{errorMessage || copy.errorAlert}</p>
                {errorMessage !== copy.sessionExpired && (
                  <button
                    type="button"
                    onClick={() => submit()}
                    className="kb-focusable shrink-0 rounded-lg border border-error/40 bg-transparent px-3 py-1 text-xs text-error font-medium transition hover:bg-error/10 min-h-[32px]"
                  >
                    {copy.retry}
                  </button>
                )}
              </div>
            )}

            {/* Insufficient Evidence state */}
            {demoState === "insufficient" && (
              <div className="mb-4 rounded-xl border border-warning/30 bg-warning/5 p-4 text-warning">
                <p className="text-xs leading-relaxed">
                  ⚠ {copy.insufficientAlert}
                </p>
              </div>
            )}

            {/* Answer text & Citations */}
            {(demoState === "success" || demoState === "insufficient") && result && (
              <div className="space-y-4">
                <div className="rounded-xl border border-white/10 bg-white/[.015] p-4">
                  <p className="text-sm leading-6 text-foreground">
                    {result.answer}
                  </p>
                </div>

                {/* Citations bars */}
                {result.sources.length > 0 && (
                  <div className="pt-3 border-t border-white/10">
                    <p className="mb-3 font-mono text-[10px] uppercase tracking-wider text-muted">
                      {copy.citations}
                    </p>
                    <div className="space-y-3">
                      {result.sources.map((source) => {
                        const pct = Math.max(0, Math.min(100, Math.round(source.score * 100)));
                        return (
                          <div key={source.id} className="text-xs">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium text-accent-secondary">
                                [{source.title}]
                              </span>
                              <span className="font-mono text-[10px] text-muted">
                                {copy.hybrid}: {source.score.toFixed(3)}
                              </span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-white/5 mt-1.5 overflow-hidden">
                              <div
                                style={{ width: `${pct}%` }}
                                className="h-full bg-accent-secondary rounded-full transition-all duration-500"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Collapsible Technical execution trace */}
                <details className="group mt-4 border border-white/10 bg-[#0B1426] p-4 rounded-xl">
                  <summary className="kb-focusable cursor-pointer font-mono text-xs text-accent select-none list-none outline-none focus-visible:ring-1 focus-visible:ring-accent">
                    ▸ {copy.technicalTrace}
                  </summary>
                  <div className="mt-4 border-t border-white/10 pt-4 space-y-3">
                    <p className="font-mono text-[10px] uppercase tracking-wider text-muted">
                      {copy.scoreComponentsWord}
                    </p>
                    <div className="space-y-2">
                      {result.sources.map((source) => {
                        const sc = source.scoreComponents;
                        return (
                          <div
                            key={source.id}
                            className="font-mono text-xs text-accent-secondary/90 leading-relaxed bg-black/20 p-2.5 rounded-lg border border-white/5"
                          >
                            <p className="font-sans font-semibold text-foreground mb-1">
                              {source.title}
                            </p>
                            {sc ? (
                              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
                                <span>
                                  {copy.vector}: {sc.vectorScore.toFixed(3)}
                                </span>
                                <span>
                                  {copy.lexical}: {sc.lexicalScore.toFixed(3)}
                                </span>
                                <span>
                                  {copy.topic}: {sc.topicScore.toFixed(3)}
                                </span>
                                <span className="text-accent font-semibold">
                                  {copy.hybrid}: {sc.hybridScore.toFixed(3)}
                                </span>
                                {sc.matchedTopics.length > 0 && (
                                  <span className="col-span-2 text-muted">
                                    Topics: {sc.matchedTopics.join(", ")}
                                  </span>
                                )}
                                {sc.matchedKeywords.length > 0 && (
                                  <span className="col-span-2 text-muted">
                                    Keywords: {sc.matchedKeywords.slice(0, 4).join(", ")}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-[10px] text-muted">
                                {copy.hybrid}: {source.score.toFixed(3)} (Components N/A)
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-muted font-mono pt-2 border-t border-white/5">
                      <span>
                        {copy.executionMode}: {result.retrievalMode}
                      </span>
                      <span>
                        Model: {result.embeddingModel}
                      </span>
                    </div>
                  </div>
                </details>

                {metrics && (
                  <div className="rounded-xl border border-success/20 bg-success/5 p-3.5 text-xs text-foreground">
                    <p className="font-mono text-[10px] uppercase tracking-wider text-success font-semibold">
                      {copy.evaluation}
                    </p>
                    <p className="mt-1 text-muted">
                      {copy.topAccuracy}:{" "}
                      <span className="text-success font-semibold">
                        {Math.round(metrics.top1Accuracy * 100)}%
                      </span>{" "}
                      ({metrics.passed}/{metrics.total} {copy.itemsReviewed})
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Selected Document Preview Panel */}
      {selectedDoc && (
        <div className="rounded-xl border border-accent/30 bg-accent/5 p-4 text-xs transition duration-300">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-accent leading-relaxed text-sm">
              {copy.documentPreview}: {selectedDoc.title}
            </h4>
            <button
              type="button"
              onClick={() => setSelectedDocId(null)}
              aria-label="Close document preview"
              className="kb-focusable h-6 w-6 rounded-full flex items-center justify-center bg-white/5 text-muted hover:text-foreground text-sm"
            >
              ×
            </button>
          </div>
          <p className="text-[10px] text-muted mb-3">
            {getCategoryLabel(selectedDoc.category)} · updated {selectedDoc.updated}
          </p>
          <div className="text-foreground leading-relaxed text-sm bg-black/25 p-3 rounded-lg border border-white/5 whitespace-pre-wrap">
            {selectedDoc.content}
          </div>
        </div>
      )}

      {/* Mobile note */}
      <p className="font-mono text-[10px] text-muted mt-2 leading-relaxed">
        * {copy.mobileCatalogNote}
      </p>
    </div>
  );
}

function WorkflowDemo({ locale }: { locale: UiLocale }) {
  const copy = uiCopy[locale];
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [runId, setRunId] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setErrorText("");
    setSteps([]);
    setRunId("");

    try {
      const form = new FormData(event.currentTarget);
      const response = await fetch("/api/workflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(form)),
      });

      if (response.status === 401) {
        setErrorText(copy.sessionExpired);
        setTimeout(() => {
          window.location.href = "/login";
        }, 1500);
        return;
      }

      if (response.status === 429) {
        const retryAfter = response.headers.get("Retry-After");
        setErrorText(copy.rateLimitError + (retryAfter ? ` (${retryAfter}s)` : ""));
        return;
      }

      if (!response.ok) {
        throw new Error();
      }

      const data = await response.json();
      setSteps(data.steps);
      setRunId(data.runId);
    } catch {
      setErrorText(copy.errorAlert || "An error occurred.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-7 xl:grid-cols-[.9fr_1.1fr]">
      <form key={locale} onSubmit={submit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs text-muted">
            {copy.requester}
          </label>
          <input
            name="requester"
            required
            disabled={loading}
            defaultValue="Maya Chen"
            className="kb-focusable w-full rounded-lg border border-white/10 bg-[#07101F] px-3 py-2.5 text-sm outline-none text-foreground focus:border-accent/40 focus:ring-1 focus:ring-accent min-h-[44px]"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs text-muted">
            {copy.requestType}
          </label>
          <select
            name="type"
            disabled={loading}
            className="kb-focusable w-full rounded-lg border border-white/10 bg-[#07101F] px-3 py-2.5 text-sm text-foreground focus:border-accent/40 focus:ring-1 focus:ring-accent min-h-[44px]"
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
          <label className="mb-1.5 block text-xs text-muted">
            {copy.priority}
          </label>
          <select
            name="priority"
            disabled={loading}
            className="kb-focusable w-full rounded-lg border border-white/10 bg-[#07101F] px-3 py-2.5 text-sm text-foreground focus:border-accent/40 focus:ring-1 focus:ring-accent min-h-[44px]"
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
          <label className="mb-1.5 block text-xs text-muted">
            {copy.justification}
          </label>
          <textarea
            name="details"
            required
            disabled={loading}
            defaultValue={copy.workflowDetails}
            rows={4}
            className="kb-focusable w-full resize-none rounded-lg border border-white/10 bg-[#07101F] px-3 py-2.5 text-sm outline-none text-foreground focus:border-accent/40 focus:ring-1 focus:ring-accent"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="kb-focusable w-full rounded-lg bg-accent py-2.5 text-sm font-semibold text-[#07101F] hover:bg-accent-strong disabled:opacity-50 min-h-[44px]"
        >
          {loading ? copy.running : copy.runWorkflow}
        </button>
      </form>
      <div aria-live="polite">
        <div className="mb-4 flex items-center justify-between">
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted">
            {copy.executionTrace}
          </p>
          {runId && (
            <span className="font-mono text-[10px] text-accent font-semibold">
              {runId}
            </span>
          )}
        </div>
        <div className="space-y-2">
          {errorText && (
            <div className="rounded-xl border border-error/35 bg-error/5 px-4 py-3 text-sm text-error">
              {errorText}
            </div>
          )}
          {steps.length ? (
            steps.map((item, index) => {
              const isReview = item.status === "review";
              return (
                <div
                  key={item.step}
                  className="flex gap-4 rounded-xl border border-white/10 bg-white/[.015] p-4"
                >
                  <div
                    className={`grid h-7 w-7 shrink-0 place-items-center rounded-full font-mono text-xs font-semibold ${
                      isReview
                        ? "bg-warning/10 text-warning"
                        : "bg-success/10 text-success"
                    }`}
                  >
                    {index + 1}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.step}</p>
                    <p className="mt-1 text-xs text-muted">{item.detail}</p>
                  </div>
                </div>
              );
            })
          ) : (
            !errorText && (
              <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-muted/60">
                {copy.submitWorkflow}
              </div>
            )
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
  const [errorText, setErrorText] = useState("");

  async function run(prompt: string) {
    const trimmed = prompt.trim();
    if (!trimmed || loading) return;
    setSubmittedMessage(trimmed);
    setMessage("");
    setLoading(true);
    setResult(null);
    setErrorText("");

    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });

      if (response.status === 401) {
        setErrorText(copy.sessionExpired);
        setTimeout(() => {
          window.location.href = "/login";
        }, 1500);
        return;
      }

      if (response.status === 429) {
        const retryAfter = response.headers.get("Retry-After");
        setErrorText(copy.rateLimitError + (retryAfter ? ` (${retryAfter}s)` : ""));
        return;
      }

      if (!response.ok) {
        throw new Error();
      }

      setResult(await response.json());
    } catch {
      setErrorText(copy.errorAlert || "An error occurred.");
    } finally {
      setLoading(false);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    await run(message);
  }

  return (
    <div className="flex min-h-[510px] flex-col">
      <div className="mb-5 rounded-xl border border-white/10 bg-[#07101F] p-4">
        <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-accent">
          {copy.agentTitle}
        </p>
        <p className="text-sm leading-5 text-muted">{copy.agentIntro}</p>
      </div>

      {/* Guided demo scenarios cards */}
      <div className="mb-6">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
          {copy.guidedScenarios}
        </h3>
        <div className="grid gap-2.5 sm:grid-cols-3">
          {scenarios.map((scenario) => {
            const parts = scenario.label.split(" · ");
            const num = parts[0];
            const desc = parts[1];
            return (
              <button
                key={scenario.label}
                type="button"
                disabled={loading}
                onClick={() => run(scenario.message)}
                className="kb-focusable flex flex-col items-start rounded-xl border border-white/5 bg-[#0B1426] p-3 text-left transition hover:border-accent/40 disabled:opacity-50 min-h-[72px]"
              >
                <span className="mb-1 font-mono text-[10px] text-accent font-semibold">
                  {num}
                </span>
                <span className="text-xs font-medium text-foreground leading-snug line-clamp-2">
                  {desc}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 space-y-4" aria-live="polite">
        {!submittedMessage && !errorText && (
          <div className="rounded-xl border border-dashed border-white/10 px-5 py-10 text-center">
            <p className="text-sm text-muted">{copy.agentEmpty}</p>
            <p className="mt-2 text-xs text-muted/60">
              {copy.documentsFictional}
            </p>
          </div>
        )}
        {submittedMessage && (
          <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-accent px-4 py-3 text-sm text-[#07101F] font-medium">
            {submittedMessage}
          </div>
        )}
        {loading && (
          <div className="max-w-[90%] rounded-2xl rounded-bl-sm border border-white/10 bg-white/[.04] px-4 py-3 text-sm text-muted">
            {copy.planning}
          </div>
        )}
        {errorText && (
          <div className="max-w-[90%] rounded-2xl rounded-bl-sm border border-error/35 bg-error/5 px-4 py-3 text-sm text-error">
            {errorText}
          </div>
        )}
        {result && (
          <div className="max-w-full space-y-3">
            <div className="rounded-2xl rounded-bl-sm border border-white/10 bg-white/[.04] px-4 py-3 text-sm leading-6 text-foreground">
              {result.answer}
            </div>

            {/* Bounded agent trace - Collapsed by default */}
            <details className="group border border-white/10 bg-[#0B1426] p-4 rounded-xl">
              <summary className="kb-focusable cursor-pointer font-mono text-xs text-accent select-none list-none outline-none focus-visible:ring-1 focus-visible:ring-accent">
                ▸ {copy.technicalTrace}
              </summary>
              <div className="mt-4 border-t border-white/10 pt-4 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-muted">
                    {copy.trace}
                  </p>
                  <span className="rounded bg-accent/15 px-2 py-1 font-mono text-[9px] text-accent font-semibold">
                    {result.trace.mode} · {result.trace.latencyMs}ms ·{" "}
                    {result.trace.toolCallCount} tool call
                    {result.trace.toolCallCount === 1 ? "" : "s"} ·{" "}
                    {result.trace.modelCallCount} model call
                    {result.trace.modelCallCount === 1 ? "" : "s"}
                  </span>
                </div>

                <div>
                  <p className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-muted">
                    {copy.plan}
                  </p>
                  {result.trace.plan.length ? (
                    <div className="space-y-1 bg-black/20 p-2.5 rounded-lg border border-white/5">
                      {result.trace.plan.map((step, index) => (
                        <p
                          key={`${step.tool}-${index}`}
                          className="font-mono text-xs text-[#E6EEF8]/80 leading-relaxed"
                        >
                          {index + 1}.{" "}
                          <span className="text-accent font-semibold">{step.tool}</span> —{" "}
                          {step.reason}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted/60">{copy.noTool}</p>
                  )}
                </div>

                <div>
                  <p className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-muted">
                    {copy.tools}
                  </p>
                  <div className="space-y-2">
                    {result.trace.steps.map((step, index) => (
                      <div
                        key={`${step.tool}-${index}`}
                        className="font-mono text-[11px] bg-black/20 p-2.5 rounded-lg border border-white/5 leading-relaxed"
                      >
                        <div className="flex flex-wrap justify-between gap-2 text-foreground font-medium mb-1">
                          <span>{step.tool}</span>
                          <span className="text-accent-secondary">
                            {step.resultCount}{" "}
                            {step.resultCount === 1 ? "item" : "items"}
                          </span>
                        </div>
                        <p className="text-muted">
                          in: <span className="text-muted/80">{JSON.stringify(step.input)}</span>
                        </p>
                        <p className="text-muted">
                          out: <span className="text-muted/80">{step.outputSummary}</span>
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {result.trace.sources.length > 0 && (
                  <div>
                    <p className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-muted">
                      {copy.sources}
                    </p>
                    <div className="space-y-1 bg-black/20 p-2.5 rounded-lg border border-white/5">
                      {result.trace.sources.map((source) => (
                        <p key={source.id} className="font-mono text-xs text-accent-secondary">
                          [{source.title}] · cosine {source.score.toFixed(3)}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <p className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-muted">
                    {copy.verifier}
                  </p>
                  <div
                    className={`rounded-lg border p-3 ${
                      !result.trace.verifier.applicable
                        ? "border-white/10 bg-white/[.02]"
                        : result.trace.verifier.grounded
                          ? "border-success/20 bg-success/5 text-foreground"
                          : "border-warning/30 bg-warning/10 text-foreground"
                    }`}
                  >
                    {result.trace.verifier.applicable ? (
                      <div className="text-xs space-y-1">
                        <p className="font-semibold">
                          Grounded:{" "}
                          <span
                            className={
                              result.trace.verifier.grounded
                                ? "text-success"
                                : "text-warning"
                            }
                          >
                            {String(result.trace.verifier.grounded)}
                          </span>{" "}
                          · score{" "}
                          {result.trace.verifier.groundednessScore.toFixed(2)}
                        </p>
                        {result.trace.verifier.supportingSourceIds.length > 0 && (
                          <p className="text-muted">
                            {copy.supportingSources}:{" "}
                            {result.trace.verifier.supportingSourceIds.join(", ")}
                          </p>
                        )}
                        {result.trace.verifier.warning && (
                          <p className="text-warning">
                            ⚠ {result.trace.verifier.warning}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-muted/60">{copy.notApplicable}</p>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-white/5 flex flex-wrap justify-between gap-2">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-muted/60">
                    {copy.heuristic}
                  </p>
                  {result.trace.estimatedUsage ? (
                    <p className="font-mono text-[10px] text-muted/60">
                      Usage: {result.trace.estimatedUsage.promptTokens} prompt /{" "}
                      {result.trace.estimatedUsage.totalTokens} total tokens
                    </p>
                  ) : (
                    <p className="font-mono text-[10px] text-muted/60 font-semibold">
                      Usage: not available (deterministic mode)
                    </p>
                  )}
                </div>
              </div>
            </details>
          </div>
        )}
      </div>

      <form
        onSubmit={submit}
        className="mt-6 flex gap-2 rounded-xl border border-white/10 bg-[#07101F] p-2"
      >
        <input
          aria-label="Agent message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={copy.agentPlaceholder}
          disabled={loading}
          className="kb-focusable min-w-0 flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-muted/50 text-foreground"
        />
        <button
          type="submit"
          disabled={loading || !message.trim()}
          className="kb-focusable rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-[#07101F] hover:bg-accent-strong disabled:opacity-50 min-h-[36px]"
        >
          {loading ? copy.running : copy.runCopilot}
        </button>
      </form>
    </div>
  );
}

type AnalyticsPeriod = "day" | "week" | "month";
type AnalyticsResult = {
  simulated: true;
  period: AnalyticsPeriod;
  generatedAt: string;
  source: { type: string; retainedEvents: number; containsCustomerText: boolean; containsCustomerIdentifiers: boolean };
  metrics: { totalInteractions: number; autoResponded: number; escalated: number; automationRate: number; topIssue: string };
  issues: Array<{ intent: string; label: string; count: number; share: number; previousCount: number; change: number; destination: string; recommendation: string }>;
  trend: Array<{ date: string; count: number }>;
};

function SupportAnalyticsDemo({ locale }: { locale: UiLocale }) {
  const [period, setPeriod] = useState<AnalyticsPeriod>("week");
  const [data, setData] = useState<AnalyticsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dispatchResult, setDispatchResult] = useState<{ reportId: string; recipients: string[]; status: string } | null>(null);
  const [dispatching, setDispatching] = useState(false);
  const labels = locale === "th" ? {
    title: "วิเคราะห์ปัญหาลูกค้า", intro: "บันทึกเหตุการณ์แบบไม่เก็บข้อความหรือข้อมูลระบุตัวลูกค้า เพื่อดูแนวโน้มและส่งรายงานให้ทีมที่เกี่ยวข้อง", day: "วันนี้", week: "7 วัน", month: "30 วัน", interactions: "การติดต่อทั้งหมด", auto: "ตอบอัตโนมัติ", escalated: "ส่งตรวจสอบ", automation: "อัตราตอบอัตโนมัติ", topIssue: "ปัญหาที่พบมากที่สุด", trend: "แนวโน้มจำนวนปัญหา", breakdown: "ปัญหาและสัดส่วน", owner: "ทีมที่เกี่ยวข้อง", action: "ข้อเสนอแนะเพื่อปรับปรุง", send: "ส่งรายงานจำลอง", sending: "กำลังจัดทำรายงาน...", sent: "สร้างรายงานและเข้าคิวเรียบร้อย", privacy: "ไม่เก็บข้อความ User ID เบอร์โทร หรือข้อมูลธุรกรรมของลูกค้า", simulated: "ข้อมูลจำลอง + เหตุการณ์จากเดโม", noData: "ยังไม่มีข้อมูลในช่วงเวลานี้",
  } : locale === "zh" ? {
    title: "客户问题分析", intro: "记录不含客户文本或身份信息的事件，用于趋势分析和改进分派", day: "今天", week: "7 天", month: "30 天", interactions: "总咨询量", auto: "自动回复", escalated: "转交审核", automation: "自动回复率", topIssue: "最常见问题", trend: "问题趋势", breakdown: "问题分布", owner: "负责团队", action: "改进建议", send: "发送模拟报告", sending: "正在生成报告...", sent: "报告已创建并进入队列", privacy: "不保存客户消息、User ID、电话或交易资料", simulated: "模拟历史 + 演示事件", noData: "此期间暂无数据",
  } : {
    title: "Support Analytics", intro: "Privacy-safe event logging for trend analysis and routing improvement reports to the responsible teams.", day: "Today", week: "7 days", month: "30 days", interactions: "Total interactions", auto: "Auto-responded", escalated: "Escalated", automation: "Automation rate", topIssue: "Top issue", trend: "Issue-volume trend", breakdown: "Issue mix", owner: "Responsible team", action: "Improvement recommendation", send: "Dispatch simulated report", sending: "Preparing report...", sent: "Report created and queued", privacy: "No customer message, User ID, phone number, or transaction data is stored", simulated: "Demo history + live demo events", noData: "No events in this period",
  };

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/support/analytics?period=${period}`)
      .then(async (response) => {
        if (!response.ok) throw new Error("Analytics request failed");
        return response.json() as Promise<AnalyticsResult>;
      })
      .then((result) => { if (!cancelled) setData(result); })
      .catch(() => { if (!cancelled) setError(locale === "th" ? "โหลดรายงานไม่สำเร็จ กรุณาลองใหม่ค่ะ" : "Unable to load analytics."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [period, locale]);

  async function dispatchReport() {
    setDispatching(true);
    setError("");
    try {
      const response = await fetch("/api/support/analytics", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ period }) });
      if (!response.ok) throw new Error("Dispatch failed");
      setDispatchResult(await response.json() as { reportId: string; recipients: string[]; status: string });
    } catch {
      setError(locale === "th" ? "สร้างรายงานไม่สำเร็จ กรุณาลองใหม่ค่ะ" : "Unable to dispatch the report.");
    } finally {
      setDispatching(false);
    }
  }

  const maxTrend = Math.max(1, ...(data?.trend.map((item) => item.count) ?? [1]));
  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-accent/20 bg-accent/5 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><p className="text-lg font-semibold text-foreground">{labels.title}</p><p className="mt-1 max-w-3xl text-sm leading-6 text-muted">{labels.intro}</p></div>
          <span className="rounded-full border border-accent/20 bg-black/10 px-3 py-1 font-mono text-[10px] text-accent-secondary">{labels.simulated}</span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">{(["day", "week", "month"] as const).map((value) => <button key={value} type="button" onClick={() => { setLoading(true); setError(""); setDispatchResult(null); setPeriod(value); }} className={`kb-focusable min-h-[38px] rounded-lg px-4 text-xs ${period === value ? "bg-accent font-semibold text-[#07101F]" : "border border-white/10 text-muted"}`}>{labels[value]}</button>)}</div>
      </div>

      {loading ? <div className="rounded-xl border border-white/10 p-8 text-center text-sm text-muted">Loading analytics...</div> : error && !data ? <div className="rounded-xl border border-error/20 bg-error/5 p-4 text-sm text-error">{error}</div> : data ? <>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            [labels.interactions, data.metrics.totalInteractions, "text-accent"],
            [labels.auto, data.metrics.autoResponded, "text-success"],
            [labels.escalated, data.metrics.escalated, "text-warning"],
            [labels.automation, `${data.metrics.automationRate}%`, "text-accent-secondary"],
          ].map(([label, value, color]) => <div key={String(label)} className="rounded-xl border border-white/10 bg-black/10 p-4"><p className="text-xs text-muted">{label}</p><p className={`mt-2 font-mono text-2xl font-semibold ${color}`}>{value}</p></div>)}
        </div>

        <div className="grid gap-4 xl:grid-cols-[1fr_1.3fr]">
          <section className="rounded-xl border border-white/10 bg-black/10 p-4">
            <p className="text-xs text-muted">{labels.topIssue}</p><p className="mt-2 text-xl font-semibold text-foreground">{data.metrics.topIssue}</p>
            <p className="mt-5 font-mono text-[10px] uppercase tracking-wider text-accent">{labels.trend}</p>
            <div className="mt-4 flex h-32 items-end gap-1" aria-label={labels.trend}>{data.trend.map((item) => <div key={item.date} className="group flex min-w-0 flex-1 flex-col items-center justify-end gap-1"><span className="text-[9px] text-muted opacity-0 transition group-hover:opacity-100">{item.count}</span><div className="w-full rounded-t bg-accent/70" style={{ height: `${Math.max(5, (item.count / maxTrend) * 100)}%` }} title={`${item.date}: ${item.count}`} /></div>)}</div>
          </section>
          <section className="rounded-xl border border-white/10 bg-black/10 p-4">
            <p className="font-mono text-[10px] uppercase tracking-wider text-accent">{labels.breakdown}</p>
            <div className="mt-4 space-y-3">{data.issues.slice(0, 7).map((issue) => <div key={issue.intent}><div className="flex items-center justify-between gap-3 text-xs"><span className="truncate text-foreground">{issue.label}</span><span className="font-mono text-muted">{issue.count} · {issue.share}%</span></div><div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-accent-secondary" style={{ width: `${issue.share}%` }} /></div></div>)}</div>
          </section>
        </div>

        <section className="overflow-hidden rounded-xl border border-white/10 bg-black/10">
          <div className="border-b border-white/10 px-4 py-3"><p className="font-mono text-[10px] uppercase tracking-wider text-accent">{labels.owner} · {labels.action}</p></div>
          <div className="divide-y divide-white/10">{data.issues.slice(0, 6).map((issue) => <div key={issue.intent} className="grid gap-2 px-4 py-3 text-xs md:grid-cols-[1fr_1fr_2fr]"><span className="font-medium text-foreground">{issue.label} ({issue.count})</span><span className="text-accent-secondary">{issue.destination}</span><span className="leading-5 text-muted">{issue.recommendation}</span></div>)}</div>
        </section>

        <div className="rounded-xl border border-success/15 bg-success/5 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-medium text-success">Privacy-safe analytics</p><p className="mt-1 text-xs leading-5 text-muted">{labels.privacy} · {data.source.retainedEvents} events retained in this demo instance.</p></div><button type="button" onClick={dispatchReport} disabled={dispatching} className="kb-focusable min-h-[40px] rounded-lg bg-accent px-4 text-xs font-semibold text-[#07101F] disabled:opacity-50">{dispatching ? labels.sending : labels.send}</button></div>
          {dispatchResult && <div className="mt-3 rounded-lg border border-success/20 bg-black/10 p-3 text-xs text-muted"><span className="font-semibold text-success">{labels.sent}</span> · {dispatchResult.reportId} · {dispatchResult.status}<div className="mt-1">{dispatchResult.recipients.join(" · ")}</div></div>}
          {error && <p className="mt-3 text-xs text-error">{error}</p>}
        </div>
      </> : <p className="text-sm text-muted">{labels.noData}</p>}
    </div>
  );
}

function BehaviorSettingsDemo({ locale }: { locale: UiLocale }) {
  const [preview, setPreview] = useState<"general" | "delay" | "escalate">("general");
  const previews = {
    th: {
      general: "สวัสดีค่ะ ลูกค้ามีอะไรให้แอดมินช่วย แจ้งได้เลยนะคะ",
      delay: "จากการตรวจสอบ รายการถอนเงินของลูกค้าอยู่ในคิวแล้วนะคะ รายการอาจใช้เวลาสักครู่ ลูกค้าไม่ต้องกังวลค่ะ",
      escalate: "แอดมินส่งรายการให้ตรวจสอบเพิ่มเติมเรียบร้อยแล้วค่ะ รบกวนลูกค้ารอสักครู่นะคะ",
    },
    en: {
      general: "Hello. How can I help you today?",
      delay: "Your withdrawal is already in the processing queue. It may take a little time, but no further action is needed right now.",
      escalate: "I’ve submitted the transaction for additional review. Please allow a little time for the check.",
    },
    zh: {
      general: "您好，请问有什么可以帮您？",
      delay: "您的提款已进入处理队列，可能需要一点时间，请不用担心。",
      escalate: "该交易已提交进一步审核，请稍候。",
    },
  } as const;
  const labels = locale === "th"
    ? { title: "การตั้งค่าพฤติกรรม AI", intro: "Control plane ภายในสำหรับกำหนดบทบาท น้ำเสียง หลักคิด และขอบเขตการตอบลูกค้า", role: "บทบาทที่ใช้งาน", principles: "หลักคิดก่อนตอบ", data: "กฎการใช้ข้อมูลลูกค้า", escalation: "กฎการส่งตรวจสอบ", prohibited: "คำที่ห้ามแสดงกับลูกค้า", preview: "ตัวอย่างคำตอบ", active: "ใช้งานอยู่" }
    : locale === "zh"
      ? { title: "AI 行为设置", intro: "用于定义角色、语气、响应原则和安全边界的内部控制面板", role: "当前角色", principles: "响应原则", data: "客户数据规则", escalation: "审核规则", prohibited: "客户不可见术语", preview: "响应预览", active: "启用" }
      : { title: "AI Behavior Settings", intro: "Internal control plane for role, tone, response principles, and safety boundaries.", role: "Active role", principles: "Response principles", data: "Customer data rules", escalation: "Escalation rules", prohibited: "Customer-hidden terms", preview: "Response preview", active: "Active" };

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-accent/20 bg-accent/5 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><p className="text-lg font-semibold text-foreground">{labels.title}</p><p className="mt-1 text-sm leading-6 text-muted">{labels.intro}</p></div>
          <span className="rounded-full border border-success/25 bg-success/10 px-3 py-1 font-mono text-[10px] font-semibold text-success">{supportBehaviorConfig.status} · {supportBehaviorConfig.version}</span>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-white/10 bg-black/10 p-4">
          <p className="font-mono text-[10px] uppercase tracking-wider text-accent">{labels.role}</p>
          <p className="mt-2 font-semibold text-foreground">{supportBehaviorConfig.role}</p>
          <p className="mt-2 text-sm leading-6 text-muted">{supportBehaviorConfig.persona[locale]}</p>
          <div className="mt-3 flex flex-wrap gap-2">{supportBehaviorConfig.tone.map((tone) => <span key={tone} className="rounded-full border border-white/10 bg-white/[.03] px-2.5 py-1 text-xs text-muted">{tone}</span>)}</div>
        </section>
        <section className="rounded-xl border border-white/10 bg-black/10 p-4">
          <p className="font-mono text-[10px] uppercase tracking-wider text-accent">{labels.principles}</p>
          <ul className="mt-3 space-y-2 text-xs leading-5 text-muted">{supportBehaviorConfig.responsePrinciples.map((item) => <li key={item} className="flex gap-2"><span className="text-success">✓</span><span>{item}</span></li>)}</ul>
        </section>
        <section className="rounded-xl border border-white/10 bg-black/10 p-4">
          <p className="font-mono text-[10px] uppercase tracking-wider text-accent">{labels.data}</p>
          <ul className="mt-3 space-y-2 text-xs leading-5 text-muted">{supportBehaviorConfig.customerDataRules.map((item) => <li key={item} className="flex gap-2"><span className="text-accent-secondary">•</span><span>{item}</span></li>)}</ul>
        </section>
        <section className="rounded-xl border border-white/10 bg-black/10 p-4">
          <p className="font-mono text-[10px] uppercase tracking-wider text-accent">{labels.escalation}</p>
          <ul className="mt-3 space-y-2 text-xs leading-5 text-muted">{supportBehaviorConfig.escalationRules.map((item) => <li key={item} className="flex gap-2"><span className="text-warning">→</span><span>{item}</span></li>)}</ul>
        </section>
      </div>

      <section className="rounded-xl border border-error/20 bg-error/5 p-4">
        <p className="font-mono text-[10px] uppercase tracking-wider text-error">{labels.prohibited}</p>
        <div className="mt-3 flex flex-wrap gap-2">{supportBehaviorConfig.prohibitedCustomerTerms.map((term) => <span key={term} className="rounded border border-error/20 bg-black/15 px-2 py-1 font-mono text-[10px] text-error">{term}</span>)}</div>
      </section>

      <section className="rounded-xl border border-white/10 bg-[#07101F] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3"><p className="font-mono text-[10px] uppercase tracking-wider text-accent">{labels.preview}</p><div className="flex gap-1">{(["general", "delay", "escalate"] as const).map((item) => <button key={item} type="button" onClick={() => setPreview(item)} className={`kb-focusable min-h-[34px] rounded-lg px-3 text-xs ${preview === item ? "bg-accent text-[#07101F] font-semibold" : "border border-white/10 text-muted"}`}>{item}</button>)}</div></div>
        <div className="mt-4 max-w-xl rounded-2xl rounded-bl-sm border border-white/10 bg-white/[.04] px-4 py-3 text-sm leading-6 text-foreground">{previews[locale][preview]}</div>
      </section>
    </div>
  );
}

function SupportDemo({ locale, customerView = false }: { locale: UiLocale; customerView?: boolean }) {
  const copy = uiCopy[locale];
  const localizedScenarios = copy.scenarios.map(([label, message], index) => ({
    label: `${index + 1} · ${label}`,
    message,
  }));
  const [message, setMessage] = useState("");
  const [submittedMessage, setSubmittedMessage] = useState("");
  const [result, setResult] = useState<SupportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [history, setHistory] = useState<SupportHistoryEntry[]>([]);
  const conversationEndRef = useRef<HTMLDivElement | null>(null);
  const [customer, setCustomer] = useState<DemoCustomer | null>(null);
  const [verificationLoading, setVerificationLoading] = useState(true);
  const [quickTopicsOpen, setQuickTopicsOpen] = useState(false);
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipLoading, setSlipLoading] = useState(false);
  const [slipError, setSlipError] = useState("");
  const [slipResult, setSlipResult] = useState<SlipApiResult | null>(null);

  useEffect(() => {
    fetch("/api/support/customer")
      .then((response) => response.ok ? response.json() : { verified: false })
      .then((data: { verified?: boolean; customer?: DemoCustomer }) => {
        if (data.verified && data.customer) setCustomer(data.customer);
      })
      .catch(() => {})
      .finally(() => setVerificationLoading(false));
  }, []);

  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [history, submittedMessage, result, loading, errorText]);

  async function run(prompt: string) {
    const trimmed = prompt.trim();
    if (!trimmed || loading) return;
    const previousUserMessages = [
      ...history.map((entry) => entry.user),
      ...(submittedMessage ? [submittedMessage] : []),
    ].slice(-4);
    if (submittedMessage && result) {
      setHistory((current) => [
        ...current,
        {
          id: `${Date.now()}-${current.length}`,
          user: submittedMessage,
          answer: result.answer,
          decision: result.trace.decision,
        },
      ]);
    }
    setSubmittedMessage(trimmed);
    setMessage("");
    setLoading(true);
    setResult(null);
    setErrorText("");

    try {
      const response = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, previousUserMessages }),
      });

      if (response.status === 401) {
        setErrorText(copy.sessionExpired);
        setTimeout(() => {
          window.location.href = "/login";
        }, 1500);
        return;
      }

      if (response.status === 403) {
        setCustomer(null);
        setErrorText(locale === "th" ? "การยืนยันผู้ใช้หมดอายุ กรุณายืนยัน User ID ใหม่" : locale === "zh" ? "用户验证已过期，请重新验证 User ID。" : "Customer verification expired. Please verify the User ID again.");
        return;
      }

      if (response.status === 429) {
        const retryAfter = response.headers.get("Retry-After");
        setErrorText(copy.rateLimitError + (retryAfter ? ` (${retryAfter}s)` : ""));
        return;
      }

      if (!response.ok) {
        throw new Error();
      }

      const data = await response.json() as SupportResult;
      setResult(data);
      if (!customer && data.trace.customerScope) {
        fetch("/api/support/customer")
          .then((profileResponse) => profileResponse.json())
          .then((profile: { verified?: boolean; customer?: DemoCustomer }) => {
            if (profile.verified && profile.customer) setCustomer(profile.customer);
          })
          .catch(() => {});
      }
    } catch {
      setErrorText(copy.errorAlert || "An error occurred.");
    } finally {
      setLoading(false);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    await run(message);
  }

  async function selectScenario(prompt: string) {
    setQuickTopicsOpen(false);
    await run(prompt);
  }

  async function changeCustomer() {
    await fetch("/api/support/customer", { method: "DELETE" }).catch(() => {});
    setCustomer(null);
    clearConversation();
  }

  async function uploadSlip(event: FormEvent) {
    event.preventDefault();
    if (!slipFile || slipLoading || !customer) return;
    setSlipLoading(true);
    setSlipError("");
    setSlipResult(null);
    try {
      const form = new FormData();
      form.set("slip", slipFile);
      const response = await fetch("/api/support/slip/verify", { method: "POST", body: form });
      const data = await response.json() as SlipApiResult & { error?: string };
      if (!response.ok) throw new Error(data.error || "Slip verification failed");
      setSlipResult(data);
    } catch (error) {
      setSlipError(error instanceof Error ? error.message : "Slip verification failed");
    } finally {
      setSlipLoading(false);
    }
  }

  function clearConversation() {
    setHistory([]);
    setSubmittedMessage("");
    setResult(null);
    setErrorText("");
    setMessage("");
    setSlipFile(null);
    setSlipError("");
    setSlipResult(null);
  }

  return (
    <div className={`flex min-h-[610px] flex-col ${customerView ? "p-4 sm:p-6" : ""}`}>
      {customer && <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-success/20 bg-success/5 px-4 py-3 text-xs">
        <div><span className="font-semibold text-success">{customer.displayName}</span><span className="ml-2 font-mono text-muted">{customer.userId} · {customer.tier}</span></div>
        <button type="button" onClick={changeCustomer} className="kb-focusable min-h-[34px] rounded-lg border border-white/10 px-3 text-muted hover:text-foreground">{locale === "th" ? "จบแชต / เปลี่ยนผู้ใช้" : locale === "zh" ? "结束对话 / 切换用户" : "End chat / change user"}</button>
      </div>}
      {!customerView && <div className="mb-5 rounded-xl border border-white/10 bg-[#07101F] p-4">
        <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-accent">
          {copy.supportTitle}
        </p>
        <p className="text-sm leading-5 text-muted">{copy.supportIntro}</p>
        <p className="mt-2 text-xs text-muted/65 leading-relaxed">{copy.supportLimit}</p>
      </div>}

      {/* Full scenario grid remains an internal reviewer tool. */}
      {!customerView && <div className="mb-6">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
          {copy.guidedScenarios}
        </h3>
        <div className="grid gap-2 sm:grid-cols-4">
          {localizedScenarios.map((scenario) => {
            const parts = scenario.label.split(" · ");
            const num = parts[0];
            const desc = parts[1];
            return (
              <button
                key={scenario.label}
                type="button"
                disabled={loading}
                onClick={() => selectScenario(scenario.message)}
                className="kb-focusable flex flex-col items-start rounded-xl border border-white/5 bg-[#0B1426] p-3 text-left transition hover:border-accent/40 disabled:opacity-50 min-h-[72px]"
              >
                <span className="mb-1 font-mono text-[10px] text-accent font-semibold">
                  {num}
                </span>
                <span className="text-xs font-medium text-foreground leading-snug line-clamp-2">
                  {desc}
                </span>
              </button>
            );
          })}
        </div>
      </div>}

      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="font-mono text-[10px] uppercase tracking-wider text-muted">
          {copy.conversationHistory}
        </p>
        <div className="flex items-center gap-2">
        {customerView && <button
          type="button"
          aria-expanded={quickTopicsOpen}
          aria-controls="support-quick-topics"
          onClick={() => setQuickTopicsOpen((open) => !open)}
          className="kb-focusable min-h-[36px] rounded-lg border border-white/10 px-3 py-1.5 text-xs text-muted transition hover:border-accent/35 hover:text-accent"
        >
          {locale === "th" ? "คำถามที่พบบ่อย" : locale === "zh" ? "常见问题" : "Common questions"} {quickTopicsOpen ? "↑" : "↓"}
        </button>}
        {(history.length > 0 || submittedMessage) && (
          <button
            type="button"
            onClick={clearConversation}
            disabled={loading}
            className="kb-focusable min-h-[36px] rounded-lg border border-white/10 px-3 py-1.5 text-xs text-muted transition hover:border-accent/35 hover:text-accent disabled:opacity-50"
          >
            {copy.newConversation}
          </button>
        )}
        </div>
      </div>

      {customerView && quickTopicsOpen && (
        <div id="support-quick-topics" className="mb-3 rounded-xl border border-white/10 bg-[#07101F] p-3">
          <div className="grid gap-2 sm:grid-cols-2">
            {localizedScenarios.map((scenario) => (
              <button
                key={scenario.label}
                type="button"
                disabled={loading}
                onClick={() => selectScenario(scenario.message)}
                className="kb-focusable min-h-[44px] rounded-lg border border-white/5 bg-white/[.03] px-3 py-2 text-left text-xs text-foreground transition hover:border-accent/35 hover:bg-accent/5 disabled:opacity-50"
              >
                {scenario.label.split(" · ")[1]}
              </button>
            ))}
          </div>
        </div>
      )}

      <div
        className="flex-1 max-h-[560px] space-y-4 overflow-y-auto scroll-smooth rounded-xl border border-white/5 bg-black/10 p-3 sm:p-4"
        aria-live="polite"
        aria-label={copy.conversationHistory}
      >
        {!customer && verificationLoading && (
          <div className="max-w-[90%] rounded-2xl rounded-bl-sm border border-white/10 bg-white/[.04] px-4 py-3 text-sm text-muted">
            {copy.checking}
          </div>
        )}
        {!customer && !verificationLoading && !submittedMessage && history.length === 0 && (
          <div className="max-w-[95%] rounded-2xl rounded-bl-sm border border-white/10 bg-white/[.04] p-4 sm:max-w-[85%]">
            <div className="text-sm leading-6 text-foreground">
              {locale === "th" ? "สวัสดีค่ะ ลูกค้ามีอะไรให้แอดมินช่วย แจ้งได้เลยนะคะ" : locale === "zh" ? "您好，请问有什么可以帮您？" : "Hello. How can I help you today?"}
            </div>
          </div>
        )}
        {customer && history.length === 0 && !submittedMessage && !errorText && (
          <div className="rounded-xl border border-dashed border-white/10 px-5 py-10 text-center">
            <p className="text-sm text-muted">{copy.supportEmpty}</p>
            <p className="mt-2 text-xs text-muted/60">{copy.fictional}</p>
          </div>
        )}
        {history.map((entry) => (
          <div key={entry.id} className="space-y-3 border-b border-white/5 pb-4 last:border-b-0">
            <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-accent px-4 py-3 text-sm text-[#07101F] font-medium">
              {entry.user}
            </div>
            <div className="max-w-[90%] rounded-2xl rounded-bl-sm border border-white/10 bg-white/[.04] px-4 py-3 text-sm leading-6 text-foreground">
              {!customerView && <span className={`mr-2 rounded px-2 py-0.5 font-mono text-[10px] font-semibold ${entry.decision === "ESCALATE" ? "bg-warning/20 text-warning" : "bg-success/20 text-success"}`}>
                {entry.decision === "ESCALATE" ? "ESCALATE" : "AUTO RESPOND"}
              </span>}
              {entry.answer}
            </div>
          </div>
        ))}
        {submittedMessage && (
          <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-accent px-4 py-3 text-sm text-[#07101F] font-medium">
            {submittedMessage}
          </div>
        )}
        {loading && (
          <div className="max-w-[90%] rounded-2xl rounded-bl-sm border border-white/10 bg-white/[.04] px-4 py-3 text-sm text-muted">
            {copy.processing}
          </div>
        )}
        {errorText && (
          <div className="max-w-[90%] rounded-2xl rounded-bl-sm border border-error/35 bg-error/5 px-4 py-3 text-sm text-error">
            {errorText}
          </div>
        )}
        {result && (
          <div className="max-w-full space-y-3">
            <div
              className={`rounded-2xl rounded-bl-sm border px-4 py-3 text-sm leading-6 ${
                !customerView && result.trace.decision === "ESCALATE"
                  ? "border-warning/30 bg-warning/10 text-warning"
                  : "border-white/10 bg-white/[.04] text-foreground"
              }`}
            >
              {!customerView && <span
                className={`mr-2 rounded px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider font-semibold ${
                  result.trace.decision === "ESCALATE"
                    ? "bg-warning/20 text-warning"
                    : "bg-success/20 text-success"
                }`}
              >
                {result.trace.decision === "ESCALATE" ? "ESCALATE" : "AUTO RESPOND"}
              </span>}
              {result.answer}
            </div>

            {customer && result.slipUploadRequired && !slipResult && (
              <form onSubmit={uploadSlip} className="rounded-xl border border-accent/20 bg-accent/5 p-3">
                <label className="block text-xs font-medium text-foreground" htmlFor={`support-slip-${customerView ? "customer" : "internal"}`}>
                  {locale === "th" ? "อัปโหลดสลิปฝากเงิน" : locale === "zh" ? "上传存款凭证" : "Upload deposit slip"}
                </label>
                <input
                  id={`support-slip-${customerView ? "customer" : "internal"}`}
                  type="file"
                  accept="image/png,image/jpeg"
                  onChange={(event) => setSlipFile(event.target.files?.[0] ?? null)}
                  className="kb-focusable mt-2 block min-h-[44px] w-full rounded-lg border border-white/10 bg-black/20 p-2 text-xs text-muted file:mr-3 file:rounded-md file:border-0 file:bg-accent file:px-3 file:py-2 file:font-semibold file:text-[#07101F]"
                />
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[11px] text-muted/55">{customerView ? "PNG/JPEG · ไม่เกิน 3 MB" : "PNG/JPEG · max 3 MB · simulated OCR · not stored"}</p>
                  <button type="submit" disabled={!slipFile || slipLoading} className="kb-focusable min-h-[40px] rounded-lg bg-accent px-4 text-xs font-semibold text-[#07101F] disabled:opacity-50">
                    {slipLoading ? copy.checking : locale === "th" ? "สแกนและตรวจสลิป" : locale === "zh" ? "扫描并验证" : "Scan and verify"}
                  </button>
                </div>
                {slipError && <p className="mt-2 text-xs text-error">{slipError}</p>}
              </form>
            )}

            {slipResult && (
              <div className={`rounded-xl border p-4 text-sm ${slipResult.verification.status === "VERIFIED" ? "border-success/25 bg-success/5" : "border-warning/25 bg-warning/5"}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-foreground">{locale === "th" ? "ผลตรวจสอบสลิป" : locale === "zh" ? "凭证验证结果" : "Slip verification result"}</p>
                  <span className={`rounded px-2 py-1 font-mono text-[10px] font-semibold ${slipResult.verification.status === "VERIFIED" ? "bg-success/15 text-success" : "bg-warning/15 text-warning"}`}>{customerView && locale === "th" ? slipResult.verification.status === "VERIFIED" ? "ตรวจสอบผ่าน" : slipResult.verification.status === "DUPLICATE" ? "สลิปซ้ำ" : "ตรวจสอบไม่ผ่าน" : slipResult.verification.status}</span>
                </div>
                <div className="mt-3 grid gap-2 text-xs text-muted sm:grid-cols-2">
                  <p>Slip: <span className="font-mono text-foreground">{slipResult.verification.slipReference}</span></p>
                  <p>{locale === "th" ? "ยอดที่สกัดได้" : locale === "zh" ? "识别金额" : "Extracted amount"}: <span className="text-foreground">{slipResult.verification.extracted.amount?.toLocaleString() ?? "—"} THB</span></p>
                  {!customerView && <p>{locale === "th" ? "ความมั่นใจ" : locale === "zh" ? "置信度" : "Confidence"}: <span className="text-foreground">{Math.round(slipResult.verification.confidence * 100)}%</span></p>}
                  {!customerView && <p>Back office: <span className="font-mono text-foreground">{slipResult.reconciliation.status}</span></p>}
                </div>
                {slipResult.reconciliation.backofficeReference && <p className="mt-3 text-xs text-muted">{copy.reference}: <span className="font-mono text-accent-secondary">{slipResult.reconciliation.backofficeReference}</span></p>}
                <p className="mt-3 text-[11px] leading-5 text-muted/55">{slipResult.verification.reason}</p>
              </div>
            )}

            {result.transaction && result.transaction.status !== "NEEDS_REFERENCE" && (
              <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-foreground">
                    {customerView && locale === "th" ? "สถานะรายการ" : locale === "th" ? "สถานะรายการจากระบบหลังบ้าน" : locale === "zh" ? "后台交易状态" : "Back-office transaction status"}
                  </p>
                  <span className={`rounded px-2 py-1 font-mono text-[10px] font-semibold ${result.transaction.reviewRequired ? "bg-warning/15 text-warning" : "bg-success/15 text-success"}`}>
                    {result.transaction.status}
                  </span>
                </div>
                <div className="grid gap-2 text-xs text-muted sm:grid-cols-3">
                  <p>{copy.reference}: <span className="font-mono text-foreground">{result.transaction.reference}</span></p>
                  <p>{locale === "th" ? "ประเภท" : locale === "zh" ? "类型" : "Type"}: <span className="text-foreground">{result.transaction.kind}</span></p>
                  {result.transaction.amount !== undefined && <p>{locale === "th" ? "ยอดเงิน" : locale === "zh" ? "金额" : "Amount"}: <span className="text-foreground">{result.transaction.amount.toLocaleString()} {result.transaction.currency}</span></p>}
                </div>
                {!customerView && <p className="mt-3 text-[11px] text-muted/60">{copy.simulated} · API response</p>}
              </div>
            )}

            {/* Simulated Case Handoff UI card */}
            {result.handoff && result.handoff.success && (
              <div className="rounded-xl border border-[#3B82F6]/30 bg-[#3B82F6]/10 p-4 text-sm text-[#93C5FD]">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">{copy.handoffCreated}</span>
                    {!customerView && <span className="rounded bg-accent/20 px-2 py-0.5 font-mono text-[9px] text-accent font-semibold uppercase tracking-wider">
                      {copy.simulated}
                    </span>}
                  </div>
                  <span className="font-mono text-xs bg-success/20 text-success px-2 py-0.5 rounded font-semibold">
                    {result.handoff.status}
                  </span>
                </div>
                <div className="space-y-1.5 text-xs text-muted leading-relaxed">
                  <p>
                    {copy.reference}:{" "}
                    <span className="font-mono text-foreground font-semibold">
                      {result.handoff.handoffId || "DEMO-CS-QUEUED"}
                    </span>
                  </p>
                  <p>
                    {copy.destination}: <span className="text-foreground font-semibold">{copy.customerSupportQueue}</span>
                  </p>
                  <p>
                    {copy.createdAt}:{" "}
                    <span className="text-foreground font-semibold">
                      {result.handoff.createdAt || new Date().toISOString()}
                    </span>
                  </p>
                </div>
              </div>
            )}

            {/* Support Copilot Trace - Collapsed by default */}
            {!customerView && <details className="group border border-white/10 bg-[#0B1426] p-4 rounded-xl">
              <summary className="kb-focusable cursor-pointer font-mono text-xs text-accent select-none list-none outline-none focus-visible:ring-1 focus-visible:ring-accent">
                ▸ {copy.technicalTrace}
              </summary>
              <div className="mt-4 border-t border-white/10 pt-4 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-muted">
                    Execution trace
                  </p>
                  <span className="rounded bg-accent/15 px-2 py-1 font-mono text-[9px] text-accent font-semibold">
                    {result.trace.mode} · {result.trace.latencyMs}ms ·{" "}
                    {result.trace.toolCallCount} tool call
                    {result.trace.toolCallCount === 1 ? "" : "s"} ·{" "}
                    {result.trace.modelCallCount} model call
                    {result.trace.modelCallCount === 1 ? "" : "s"}
                  </span>
                </div>

                <div className="mb-4 grid grid-cols-2 gap-2 text-xs bg-black/20 p-2.5 rounded-lg border border-white/5">
                  <p className="text-muted">
                    {copy.intent}:{" "}
                    <span className="text-accent font-semibold">{result.trace.intent}</span>
                  </p>
                  <p className="text-muted">
                    {copy.risk}:{" "}
                    <span
                      className={`font-semibold ${
                        result.trace.risk === "HIGH" ? "text-error" : "text-success"
                      }`}
                    >
                      {result.trace.risk}
                    </span>
                  </p>
                  {result.trace.customerScope && <p className="col-span-2 text-muted">Customer scope: <span className="font-mono text-accent-secondary">{result.trace.customerScope}</span></p>}
                </div>

                {result.trace.escalationReason && (
                  <p className="mb-4 rounded-lg border border-warning/30 bg-warning/5 p-3 text-xs text-warning leading-relaxed font-semibold">
                    {copy.reason}: {result.trace.escalationReason}
                  </p>
                )}

                <div>
                  <p className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-muted">
                    {copy.tools}
                  </p>
                  <div className="space-y-2">
                    {result.trace.steps.map((step, index) => (
                      <div
                        key={`${step.tool}-${index}`}
                        className="font-mono text-[11px] bg-black/20 p-2.5 rounded-lg border border-white/5 leading-relaxed"
                      >
                        <div className="flex flex-wrap justify-between gap-2 text-foreground font-semibold mb-1">
                          <span>{step.tool}</span>
                          <span className="text-accent-secondary">
                            {step.resultCount}{" "}
                            {step.resultCount === 1 ? "item" : "items"}
                          </span>
                        </div>
                        <p className="text-muted">
                          out: <span className="text-muted/80">{step.outputSummary}</span>
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {result.trace.sources.length > 0 && (
                  <div>
                    <p className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-muted">
                      {copy.sources}
                    </p>
                    <div className="space-y-1 bg-black/20 p-2.5 rounded-lg border border-white/5">
                      {result.trace.sources.map((source) => (
                        <p key={source.id} className="font-mono text-xs text-accent-secondary leading-normal">
                          [{source.title}] · cosine {source.score.toFixed(3)}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <p className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-muted">
                    {copy.verifier}
                  </p>
                  <div
                    className={`rounded-lg border p-3 ${
                      !result.trace.verifier.applicable
                        ? "border-white/10 bg-white/[.02]"
                        : result.trace.verifier.grounded
                          ? "border-success/20 bg-success/5 text-foreground"
                          : "border-warning/30 bg-warning/10 text-foreground"
                    }`}
                  >
                    {result.trace.verifier.applicable ? (
                      <div className="text-xs space-y-1">
                        <p className="font-semibold">
                          Grounded:{" "}
                          <span
                            className={
                              result.trace.verifier.grounded
                                ? "text-success"
                                : "text-warning"
                            }
                          >
                            {String(result.trace.verifier.grounded)}
                          </span>{" "}
                          · score{" "}
                          {result.trace.verifier.groundednessScore.toFixed(2)}
                        </p>
                        {result.trace.verifier.warning && (
                          <p className="text-warning">
                            ⚠ {result.trace.verifier.warning}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-muted/60">{copy.notApplicable}</p>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-white/5 flex justify-end">
                  {result.trace.estimatedUsage ? (
                    <p className="font-mono text-[10px] text-muted/60">
                      Usage: {result.trace.estimatedUsage.promptTokens} prompt /{" "}
                      {result.trace.estimatedUsage.totalTokens} total tokens
                    </p>
                  ) : (
                    <p className="font-mono text-[10px] text-muted/60 font-semibold">
                      Usage: not available (deterministic mode)
                    </p>
                  )}
                </div>
              </div>
            </details>}
          </div>
        )}
        <div ref={conversationEndRef} aria-hidden="true" />
      </div>

      <form
        onSubmit={submit}
        className="mt-6 flex gap-2 rounded-xl border border-white/10 bg-[#07101F] p-2"
      >
        <input
          aria-label="Support message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={copy.placeholder}
          disabled={loading}
          className="kb-focusable min-w-0 flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-muted/50 text-foreground"
        />
        <button
          type="submit"
          disabled={loading || !message.trim()}
          className="kb-focusable rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-[#07101F] hover:bg-accent-strong disabled:opacity-50 min-h-[36px]"
        >
          {loading ? copy.running : copy.run}
        </button>
      </form>
    </div>
  );
}
