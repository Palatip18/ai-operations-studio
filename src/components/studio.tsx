"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
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
type HandoffResult = {
  success: boolean;
  simulated: boolean;
  handoffId?: string;
  status: "QUEUED" | "FAILED" | "RETRYABLE";
  destination?: string;
  createdAt?: string;
  idempotent?: boolean;
};
type SupportResult = { answer: string; handoff?: HandoffResult | null; trace: SupportTrace };
type SupportHistoryEntry = {
  id: string;
  user: string;
  answer: string;
  decision: "AUTO_RESPOND" | "ESCALATE";
};

const moduleIds: Module[] = [
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
  const [active, setActive] = useState<Module>("support");
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
      <footer className="flex flex-col gap-2 border-t border-white/10 py-5 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
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
  const [errorText, setErrorText] = useState("");
  const [history, setHistory] = useState<SupportHistoryEntry[]>([]);
  const conversationEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [history, submittedMessage, result, loading, errorText]);

  async function run(prompt: string) {
    const trimmed = prompt.trim();
    if (!trimmed || loading) return;
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

  function clearConversation() {
    setHistory([]);
    setSubmittedMessage("");
    setResult(null);
    setErrorText("");
    setMessage("");
  }

  return (
    <div className="flex min-h-[510px] flex-col">
      <div className="mb-5 rounded-xl border border-white/10 bg-[#07101F] p-4">
        <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-accent">
          {copy.supportTitle}
        </p>
        <p className="text-sm leading-5 text-muted">{copy.supportIntro}</p>
        <p className="mt-2 text-xs text-muted/65 leading-relaxed">{copy.supportLimit}</p>
      </div>

      {/* Guided demo scenarios cards */}
      <div className="mb-6">
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

      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="font-mono text-[10px] uppercase tracking-wider text-muted">
          {copy.conversationHistory}
        </p>
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

      <div
        className="flex-1 max-h-[560px] space-y-4 overflow-y-auto scroll-smooth rounded-xl border border-white/5 bg-black/10 p-3 sm:p-4"
        aria-live="polite"
        aria-label={copy.conversationHistory}
      >
        {history.length === 0 && !submittedMessage && !errorText && (
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
              <span className={`mr-2 rounded px-2 py-0.5 font-mono text-[10px] font-semibold ${entry.decision === "ESCALATE" ? "bg-warning/20 text-warning" : "bg-success/20 text-success"}`}>
                {entry.decision === "ESCALATE" ? "ESCALATE" : "AUTO RESPOND"}
              </span>
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
                result.trace.decision === "ESCALATE"
                  ? "border-warning/30 bg-warning/10 text-warning"
                  : "border-white/10 bg-white/[.04] text-foreground"
              }`}
            >
              <span
                className={`mr-2 rounded px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider font-semibold ${
                  result.trace.decision === "ESCALATE"
                    ? "bg-warning/20 text-warning"
                    : "bg-success/20 text-success"
                }`}
              >
                {result.trace.decision === "ESCALATE" ? "ESCALATE" : "AUTO RESPOND"}
              </span>
              {result.answer}
            </div>

            {/* Simulated Case Handoff UI card */}
            {result.handoff && result.handoff.success && (
              <div className="rounded-xl border border-[#3B82F6]/30 bg-[#3B82F6]/10 p-4 text-sm text-[#93C5FD]">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">{copy.handoffCreated}</span>
                    <span className="rounded bg-accent/20 px-2 py-0.5 font-mono text-[9px] text-accent font-semibold uppercase tracking-wider">
                      {copy.simulated}
                    </span>
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
            <details className="group border border-white/10 bg-[#0B1426] p-4 rounded-xl">
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
            </details>
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
