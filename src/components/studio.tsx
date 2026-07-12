"use client";

import { FormEvent, useEffect, useState } from "react";
import { knowledgeDocuments } from "@/lib/knowledge";

type Module = "chat" | "knowledge" | "workflow" | "agent" | "support";
type WorkflowStep = { step: string; detail: string; status: string };
type AgentPlanStep = { tool: string; reason: string };
type AgentStepTrace = { tool: string; input: Record<string, unknown>; outputSummary: string; resultCount: number };
type AgentSource = { id: string; title: string; score: number };
type AgentVerifier = { applicable: boolean; grounded: boolean; groundednessScore: number; supportingSourceIds: string[]; warning: string | null };
type AgentTrace = { plan: AgentPlanStep[]; steps: AgentStepTrace[]; sources: AgentSource[]; verifier: AgentVerifier; latencyMs: number; toolCallCount: number; modelCallCount: number; estimatedUsage: { promptTokens: number; totalTokens: number } | null; mode: string };
type AgentResult = { answer: string; trace: AgentTrace };
type SupportTrace = { intent: string; risk: string; steps: AgentStepTrace[]; sources: AgentSource[]; verifier: AgentVerifier; decision: "AUTO_RESPOND" | "ESCALATE"; escalationReason: string | null; latencyMs: number; toolCallCount: number; modelCallCount: number; estimatedUsage: { promptTokens: number; totalTokens: number } | null; mode: string };
type SupportResult = { answer: string; trace: SupportTrace };

const modules = [
  { id: "chat" as const, number: "01", label: "AI Chat", description: "Tool routing" },
  { id: "knowledge" as const, number: "02", label: "Knowledge Base", description: "Grounded retrieval" },
  { id: "workflow" as const, number: "03", label: "Workflow", description: "Policy automation" },
  { id: "agent" as const, number: "04", label: "Agentic Copilot", description: "Plan → act → verify" },
  { id: "support" as const, number: "05", label: "Support Copilot", description: "Auto-respond or escalate" },
];

export function Studio() {
  const [active, setActive] = useState<Module>("chat");
  const [liveAI, setLiveAI] = useState(false);
  useEffect(() => { fetch("/api/status").then((response) => response.json()).then((data: { liveAI: boolean }) => setLiveAI(data.liveAI)).catch(() => setLiveAI(false)); }, []);
  async function signOut() { await fetch("/api/logout", { method: "POST" }).catch(() => {}); window.location.href = "/login"; }
  return (
    <div className="mx-auto min-h-screen max-w-[1500px] px-5 py-5 sm:px-8 lg:px-12">
      <header className="flex items-center justify-between border-b border-white/10 pb-5">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-lg border border-green-300/30 bg-green-300/10 font-mono text-sm text-green-300">AI</div>
          <div><p className="text-sm font-semibold tracking-tight">AI Operations Studio</p><p className="text-xs text-[#90a9a0]">Personal portfolio prototype</p></div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2 rounded-full border border-green-300/20 bg-green-300/5 px-3 py-1.5 text-xs text-green-200"><span className="h-1.5 w-1.5 rounded-full bg-green-300" />{liveAI ? "Live AI · server-side key" : "Safe demo · no key required"}</div>
          <button type="button" onClick={signOut} className="rounded-full border border-white/10 bg-white/[.03] px-3 py-1.5 text-xs text-[#90a9a0] transition hover:border-green-300/30 hover:text-green-200">Sign out</button>
        </div>
      </header>

      <main className="grid gap-10 py-10 lg:grid-cols-[340px_1fr] lg:py-16">
        <section>
          <p className="mb-4 font-mono text-xs uppercase tracking-[.22em] text-green-300">Applied AI · Operations</p>
          <h1 className="max-w-sm text-4xl font-semibold leading-[1.05] tracking-[-.05em] sm:text-5xl">From messy work to clear, auditable flow.</h1>
          <p className="mt-5 max-w-sm text-sm leading-6 text-[#90a9a0]">A privacy-safe demonstration of AI implementation: route tasks to tools, retrieve answers from sample documents, and automate a policy-driven request.</p>
          <div className="mt-9 space-y-2">
            {modules.map((module) => (
              <button key={module.id} onClick={() => setActive(module.id)} className={`group flex w-full items-center gap-4 rounded-xl border px-4 py-3 text-left transition ${active === module.id ? "border-green-300/30 bg-green-300/10" : "border-transparent hover:border-white/10 hover:bg-white/[.03]"}`}>
                <span className={`font-mono text-xs ${active === module.id ? "text-green-300" : "text-[#60776f]"}`}>{module.number}</span>
                <span className="flex-1"><span className="block text-sm font-medium">{module.label}</span><span className="block text-xs text-[#718a81]">{module.description}</span></span>
                <span className={`text-lg ${active === module.id ? "text-green-300" : "text-[#456057]"}`}>→</span>
              </button>
            ))}
          </div>
          <div className="mt-9 grid grid-cols-3 gap-2 border-t border-white/10 pt-5 text-center">
            {[['3','modules'],['100%','sample data'],['0','real records']].map(([value,label]) => <div key={label}><p className="font-mono text-lg text-green-200">{value}</p><p className="text-[10px] uppercase tracking-wider text-[#60776f]">{label}</p></div>)}
          </div>
        </section>

        <section className="min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-[#0c1917]/90 shadow-2xl shadow-black/30">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <div><p className="text-sm font-medium">{modules.find((m) => m.id === active)?.label}</p><p className="text-xs text-[#718a81]">Interactive portfolio demo</p></div>
            <span className="rounded-md bg-white/5 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-[#718a81]">Prototype</span>
          </div>
          <div className="min-h-[570px] p-5 sm:p-7">{active === "chat" ? <ChatDemo /> : active === "knowledge" ? <KnowledgeDemo /> : active === "workflow" ? <WorkflowDemo /> : active === "agent" ? <AgentDemo /> : <SupportDemo />}</div>
        </section>
      </main>
      <footer className="flex flex-col gap-2 border-t border-white/10 py-5 text-xs text-[#60776f] sm:flex-row sm:items-center sm:justify-between"><p>Built as a personal portfolio prototype. No client or employer data.</p><p className="font-mono">Next.js · TypeScript · Tailwind CSS</p></footer>
    </div>
  );
}

function ChatDemo() {
  const [message, setMessage] = useState("What is the response target for a high-severity incident?");
  const [submittedMessage, setSubmittedMessage] = useState("");
  const [result, setResult] = useState<{ answer: string; toolCalls: { name: string; resultCount: number; summary: string }[]; mode: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const suggestions = ["What is the expense claim deadline?", "Create a high-priority equipment workflow", "Show the retrieval evaluation score"];
  async function submit(event: FormEvent) { event.preventDefault(); const prompt = message.trim(); if (!prompt) return; setSubmittedMessage(prompt); setMessage(""); setLoading(true); setResult(null); const response = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: prompt }) }); setResult(await response.json()); setLoading(false); }
  return <div className="flex min-h-[510px] flex-col">
    <div className="mb-5 rounded-xl border border-white/10 bg-[#07100f] p-4"><p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-green-300">Operations assistant</p><p className="text-sm leading-5 text-[#b7cbc3]">Ask a question about the sample policies, preview a request workflow, or check the retrieval evaluation score.</p></div>
    <div className="mb-6 flex flex-wrap gap-2">{suggestions.map((suggestion) => <button key={suggestion} type="button" onClick={() => setMessage(suggestion)} className="rounded-full border border-white/10 bg-white/[.025] px-3 py-1.5 text-left text-xs text-[#90a9a0] transition hover:border-green-300/30 hover:text-green-200">{suggestion}</button>)}</div>
    <div className="flex-1 space-y-4" aria-live="polite">
      {!submittedMessage && <div className="rounded-xl border border-dashed border-white/10 px-5 py-10 text-center"><p className="text-sm text-[#90a9a0]">Choose an example above or enter your own question.</p><p className="mt-2 text-xs text-[#60776f]">All documents and requests in this demo are fictional.</p></div>}
      {submittedMessage && <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-green-300 px-4 py-3 text-sm text-[#07100f]">{submittedMessage}</div>}
      {loading && <div className="max-w-[90%] rounded-2xl rounded-bl-sm border border-white/10 bg-white/[.04] px-4 py-3 text-sm text-[#90a9a0]">Reviewing the request…</div>}
      {result && <div className="max-w-[90%] space-y-3"><div className="rounded-2xl rounded-bl-sm border border-white/10 bg-white/[.04] px-4 py-3 text-sm leading-6 text-[#d9e8e2]">{result.answer}</div>{result.toolCalls.length > 0 && <details className="rounded-xl border border-white/10 bg-[#07100f] p-3"><summary className="cursor-pointer text-xs font-medium text-green-300">View sources and technical trace</summary><div className="mt-3 space-y-2 border-t border-white/10 pt-3">{result.toolCalls.map((tool, index) => <div key={`${tool.name}-${index}`} className="font-mono text-xs"><div className="flex flex-wrap justify-between gap-2 text-[#b7cbc3]"><span>{tool.name}</span><span>{tool.resultCount} {tool.resultCount === 1 ? "item" : "items"} reviewed</span></div><p className="mt-1 text-[#718a81]">{tool.summary}</p></div>)}<p className="font-mono text-[10px] uppercase tracking-wider text-[#60776f]">Execution mode: {result.mode}</p></div></details>}</div>}
    </div>
    <form onSubmit={submit} className="mt-6 flex gap-2 rounded-xl border border-white/10 bg-[#07100f] p-2"><input aria-label="Chat message" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Ask about a sample policy or workflow…" className="min-w-0 flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-[#456057]" /><button disabled={loading || !message.trim()} className="rounded-lg bg-green-300 px-4 py-2 text-sm font-medium text-[#07100f] disabled:opacity-50">{loading ? "Running…" : "Ask assistant"}</button></form>
  </div>;
}

function KnowledgeDemo() {
  const [query, setQuery] = useState("When should an expense claim be submitted?");
  const [result, setResult] = useState<{ answer: string; sources: { id: string; title: string; score: number }[]; retrievalMode: string; embeddingModel: string } | null>(null);
  const [metrics, setMetrics] = useState<{ passed: number; total: number; top1Accuracy: number } | null>(null);
  async function submit(event: FormEvent) { event.preventDefault(); const [response, evaluation] = await Promise.all([fetch("/api/rag", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query }) }), fetch("/api/evaluation")]); setResult(await response.json()); setMetrics(await evaluation.json()); }
  return <div>
    <form onSubmit={submit} className="flex gap-2"><input aria-label="Knowledge query" value={query} onChange={(e) => setQuery(e.target.value)} className="min-w-0 flex-1 rounded-lg border border-white/10 bg-[#07100f] px-4 py-3 text-sm outline-none focus:border-green-300/40" /><button className="rounded-lg bg-green-300 px-4 text-sm font-medium text-[#07100f]">Search</button></form>
    <div className="mt-7 grid gap-5 xl:grid-cols-[.9fr_1.1fr]"><div><p className="mb-3 font-mono text-[10px] uppercase tracking-wider text-[#718a81]">Sample documents</p><div className="space-y-2">{knowledgeDocuments.map((doc) => <div key={doc.id} className="rounded-xl border border-white/10 bg-white/[.025] p-4"><div className="flex items-start justify-between gap-3"><p className="text-sm font-medium">{doc.title}</p><span className="text-green-300">◇</span></div><p className="mt-2 text-xs text-[#718a81]">{doc.category} · {doc.updated}</p></div>)}</div></div>
    <div><p className="mb-3 font-mono text-[10px] uppercase tracking-wider text-[#718a81]">Grounded answer</p><div className="min-h-56 rounded-xl border border-white/10 bg-[#07100f] p-5">{result ? <><p className="text-sm leading-6 text-[#d9e8e2]">{result.answer}</p><div className="mt-5 border-t border-white/10 pt-4"><div className="mb-2 flex flex-wrap items-center justify-between gap-2"><p className="text-[10px] uppercase tracking-wider text-[#60776f]">Semantic retrieval citations</p><span className="rounded bg-green-300/10 px-2 py-1 font-mono text-[9px] text-green-300">{result.retrievalMode} · {result.embeddingModel}</span></div>{result.sources.map((source) => <p key={source.id} className="mb-1 text-xs text-green-300">[{source.title}] · cosine {source.score.toFixed(3)}</p>)}</div>{metrics && <div className="mt-4 rounded-lg border border-green-300/20 bg-green-300/5 p-3"><p className="font-mono text-[10px] uppercase tracking-wider text-green-300">Evaluation</p><p className="mt-1 text-xs text-[#d9e8e2]">Top-1 accuracy: {Math.round(metrics.top1Accuracy * 100)}% ({metrics.passed}/{metrics.total} documented cases)</p></div>}</> : <p className="text-sm text-[#60776f]">Run a query to retrieve an answer with visible citations and evaluation metrics.</p>}</div></div></div>
  </div>;
}

function WorkflowDemo() {
  const [steps, setSteps] = useState<WorkflowStep[]>([]); const [runId, setRunId] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); const response = await fetch("/api/workflow", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(form)) }); const data = await response.json(); setSteps(data.steps); setRunId(data.runId); }
  return <div className="grid gap-7 xl:grid-cols-[.9fr_1.1fr]"><form onSubmit={submit} className="space-y-4"><div><label className="mb-1.5 block text-xs text-[#90a9a0]">Requester</label><input name="requester" required defaultValue="Maya Chen" className="w-full rounded-lg border border-white/10 bg-[#07100f] px-3 py-2.5 text-sm outline-none" /></div><div><label className="mb-1.5 block text-xs text-[#90a9a0]">Request type</label><select name="type" className="w-full rounded-lg border border-white/10 bg-[#07100f] px-3 py-2.5 text-sm"><option>Software access</option><option>Equipment</option><option>Training</option></select></div><div><label className="mb-1.5 block text-xs text-[#90a9a0]">Priority</label><select name="priority" className="w-full rounded-lg border border-white/10 bg-[#07100f] px-3 py-2.5 text-sm"><option>Normal</option><option>High</option></select></div><div><label className="mb-1.5 block text-xs text-[#90a9a0]">Business justification</label><textarea name="details" required defaultValue="Access required for the sample analytics project." rows={4} className="w-full resize-none rounded-lg border border-white/10 bg-[#07100f] px-3 py-2.5 text-sm outline-none" /></div><button className="w-full rounded-lg bg-green-300 py-2.5 text-sm font-medium text-[#07100f]">Run workflow</button></form>
    <div><div className="mb-4 flex items-center justify-between"><p className="font-mono text-[10px] uppercase tracking-wider text-[#718a81]">Execution trace</p>{runId && <span className="font-mono text-[10px] text-green-300">{runId}</span>}</div><div className="space-y-2">{steps.length ? steps.map((item, index) => <div key={item.step} className="flex gap-4 rounded-xl border border-white/10 bg-white/[.025] p-4"><div className={`grid h-7 w-7 shrink-0 place-items-center rounded-full font-mono text-xs ${item.status === "review" ? "bg-amber-300/15 text-amber-200" : "bg-green-300/15 text-green-300"}`}>{index + 1}</div><div><p className="text-sm font-medium">{item.step}</p><p className="mt-1 text-xs text-[#718a81]">{item.detail}</p></div></div>) : <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-[#60776f]">Submit the sample request to view validation, routing, policy, and notification steps.</div>}</div></div></div>;
}

const agentScenarios = [
  { label: "1 · Policy question (RAG)", message: "What is the deadline for submitting an expense claim, and what proof is required?" },
  { label: "2 · Workflow analysis", message: "Analyze this request and run workflow rules: a high priority equipment request for Maya Chen who needs a new laptop." },
  { label: "3 · Insufficient evidence", message: "How many annual leave days does an employee receive?" },
];

function AgentDemo() {
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
    const response = await fetch("/api/agent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: trimmed }) });
    setResult(await response.json());
    setLoading(false);
  }
  async function submit(event: FormEvent) { event.preventDefault(); await run(message); }

  return <div className="flex min-h-[510px] flex-col">
    <div className="mb-5 rounded-xl border border-white/10 bg-[#07100f] p-4">
      <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-green-300">Bounded Planner → Tool Execution → Verifier</p>
      <p className="text-sm leading-5 text-[#b7cbc3]">The planner picks up to 3 tools (knowledge retrieval, workflow policy, evaluation metrics), executes them, then a verifier checks whether the answer is supported by retrieved evidence. This is a bounded, deterministic agent flow — not an autonomous production agent.</p>
    </div>
    <div className="mb-6 flex flex-wrap gap-2">{agentScenarios.map((scenario) => <button key={scenario.label} type="button" disabled={loading} onClick={() => run(scenario.message)} className="rounded-full border border-green-300/20 bg-green-300/5 px-3 py-1.5 text-left text-xs text-green-200 transition hover:border-green-300/40 disabled:opacity-50">{scenario.label}</button>)}</div>

    <div className="flex-1 space-y-4" aria-live="polite">
      {!submittedMessage && <div className="rounded-xl border border-dashed border-white/10 px-5 py-10 text-center"><p className="text-sm text-[#90a9a0]">Run a recruiter scenario above, or ask your own question.</p><p className="mt-2 text-xs text-[#60776f]">All documents and requests in this demo are fictional.</p></div>}
      {submittedMessage && <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-green-300 px-4 py-3 text-sm text-[#07100f]">{submittedMessage}</div>}
      {loading && <div className="max-w-[90%] rounded-2xl rounded-bl-sm border border-white/10 bg-white/[.04] px-4 py-3 text-sm text-[#90a9a0]">Planning → executing → verifying…</div>}
      {result && <div className="max-w-full space-y-3">
        <div className="rounded-2xl rounded-bl-sm border border-white/10 bg-white/[.04] px-4 py-3 text-sm leading-6 text-[#d9e8e2]">{result.answer}</div>

        <div className="rounded-xl border border-white/10 bg-[#07100f] p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="font-mono text-[10px] uppercase tracking-wider text-green-300">Execution trace</p>
            <span className="rounded bg-green-300/10 px-2 py-1 font-mono text-[9px] text-green-300">{result.trace.mode} · {result.trace.latencyMs}ms · {result.trace.toolCallCount} tool call{result.trace.toolCallCount === 1 ? "" : "s"} · {result.trace.modelCallCount} model call{result.trace.modelCallCount === 1 ? "" : "s"}</span>
          </div>

          <p className="mb-1 text-[10px] uppercase tracking-wider text-[#60776f]">Plan</p>
          {result.trace.plan.length ? <div className="mb-4 space-y-1">{result.trace.plan.map((step, index) => <p key={`${step.tool}-${index}`} className="font-mono text-xs text-[#b7cbc3]">{index + 1}. <span className="text-green-300">{step.tool}</span> — {step.reason}</p>)}</div> : <p className="mb-4 text-xs text-[#718a81]">No tool matched this request; deterministic fallback answer returned.</p>}

          <p className="mb-1 text-[10px] uppercase tracking-wider text-[#60776f]">Tool calls</p>
          <div className="mb-4 space-y-2">{result.trace.steps.map((step, index) => <div key={`${step.tool}-${index}`} className="font-mono text-xs"><div className="flex flex-wrap justify-between gap-2 text-[#b7cbc3]"><span>{step.tool}</span><span>{step.resultCount} {step.resultCount === 1 ? "item" : "items"}</span></div><p className="mt-1 text-[#718a81]">in: {JSON.stringify(step.input)}</p><p className="text-[#718a81]">out: {step.outputSummary}</p></div>)}</div>

          {result.trace.sources.length > 0 && <><p className="mb-1 text-[10px] uppercase tracking-wider text-[#60776f]">Retrieved sources</p><div className="mb-4 space-y-1">{result.trace.sources.map((source) => <p key={source.id} className="text-xs text-green-300">[{source.title}] · cosine {source.score.toFixed(3)}</p>)}</div></>}

          <p className="mb-1 text-[10px] uppercase tracking-wider text-[#60776f]">Verifier</p>
          <div className={`mb-4 rounded-lg border p-3 ${!result.trace.verifier.applicable ? "border-white/10 bg-white/[.02]" : result.trace.verifier.grounded ? "border-green-300/20 bg-green-300/5" : "border-amber-300/30 bg-amber-300/10"}`}>
            {result.trace.verifier.applicable ? <>
              <p className="text-xs text-[#d9e8e2]">Grounded: <span className={result.trace.verifier.grounded ? "text-green-300" : "text-amber-200"}>{String(result.trace.verifier.grounded)}</span> · score {result.trace.verifier.groundednessScore.toFixed(2)}</p>
              {result.trace.verifier.supportingSourceIds.length > 0 && <p className="mt-1 text-xs text-[#90a9a0]">Supporting sources: {result.trace.verifier.supportingSourceIds.join(", ")}</p>}
              {result.trace.verifier.warning && <p className="mt-1 text-xs text-amber-200">⚠ {result.trace.verifier.warning}</p>}
            </> : <p className="text-xs text-[#718a81]">Not applicable — this response is a deterministic workflow/metrics result, not a retrieved-knowledge claim.</p>}
          </div>

          <p className="text-[10px] uppercase tracking-wider text-[#60776f]">This heuristic estimates lexical overlap with retrieved evidence. It does not guarantee factual correctness.</p>
          {result.trace.estimatedUsage ? <p className="mt-2 font-mono text-[10px] text-[#60776f]">Estimated usage: {result.trace.estimatedUsage.promptTokens} prompt / {result.trace.estimatedUsage.totalTokens} total tokens (embedding call)</p> : <p className="mt-2 font-mono text-[10px] text-[#60776f]">Estimated usage: not available (deterministic mode has no provider usage data)</p>}
        </div>
      </div>}
    </div>

    <form onSubmit={submit} className="mt-6 flex gap-2 rounded-xl border border-white/10 bg-[#07100f] p-2"><input aria-label="Agent message" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Ask the copilot a question…" className="min-w-0 flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-[#456057]" /><button disabled={loading || !message.trim()} className="rounded-lg bg-green-300 px-4 py-2 text-sm font-medium text-[#07100f] disabled:opacity-50">{loading ? "Running…" : "Run copilot"}</button></form>
  </div>;
}

const supportScenarios = [
  { label: "1 · FAQ (auto-respond)", message: "How do I create a new account?" },
  { label: "2 · Troubleshooting (auto-respond)", message: "The product won't load, what should I do?" },
  { label: "3 · Policy w/ citations", message: "Can I get a refund if I cancel this month?" },
  { label: "4 · Product vision", message: "Why was this system built?" },
  { label: "5 · Roadmap", message: "How far could this platform be developed in the future?" },
  { label: "6 · Insufficient evidence", message: "Do you support hardware security key multi-factor authentication?" },
  { label: "7 · Financial dispute (mandatory escalation)", message: "I was charged twice, this is an unauthorized charge and I want it disputed immediately." },
  { label: "8 · Angry complaint (escalation)", message: "This is unacceptable, I'm furious and I will report you online if this isn't fixed." },
];

function SupportDemo() {
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
    const response = await fetch("/api/support", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: trimmed }) });
    setResult(await response.json());
    setLoading(false);
  }
  async function submit(event: FormEvent) { event.preventDefault(); await run(message); }

  return <div className="flex min-h-[510px] flex-col">
    <div className="mb-5 rounded-xl border border-white/10 bg-[#07100f] p-4">
      <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-green-300">Agentic Customer Support Copilot</p>
      <p className="text-sm leading-5 text-[#b7cbc3]">Designed to target up to 80-90% automation of repetitive, low-risk customer inquiries when supported by a sufficiently comprehensive, validated, and continuously maintained knowledge base.</p>
      <p className="mt-2 text-xs text-[#718a81]">This is a controlled-pilot target, not a guaranteed production result. Human agents remain responsible for complex, sensitive, exceptional, disputed, or high-risk cases. Combines RAG, a bounded agent, deterministic policy rules, a groundedness verifier, human escalation, and evaluation/observability — see the README for why each piece exists.</p>
    </div>
    <div className="mb-6 flex flex-wrap gap-2">{supportScenarios.map((scenario) => <button key={scenario.label} type="button" disabled={loading} onClick={() => run(scenario.message)} className="rounded-full border border-green-300/20 bg-green-300/5 px-3 py-1.5 text-left text-xs text-green-200 transition hover:border-green-300/40 disabled:opacity-50">{scenario.label}</button>)}</div>

    <div className="flex-1 space-y-4" aria-live="polite">
      {!submittedMessage && <div className="rounded-xl border border-dashed border-white/10 px-5 py-10 text-center"><p className="text-sm text-[#90a9a0]">Run a recruiter scenario above, or ask your own support question.</p><p className="mt-2 text-xs text-[#60776f]">All customers, requests, and documents in this demo are fictional.</p></div>}
      {submittedMessage && <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-green-300 px-4 py-3 text-sm text-[#07100f]">{submittedMessage}</div>}
      {loading && <div className="max-w-[90%] rounded-2xl rounded-bl-sm border border-white/10 bg-white/[.04] px-4 py-3 text-sm text-[#90a9a0]">Classifying → retrieving → verifying → deciding…</div>}
      {result && <div className="max-w-full space-y-3">
        <div className={`rounded-2xl rounded-bl-sm border px-4 py-3 text-sm leading-6 ${result.trace.decision === "ESCALATE" ? "border-amber-300/30 bg-amber-300/10 text-amber-100" : "border-white/10 bg-white/[.04] text-[#d9e8e2]"}`}>
          <span className="mr-2 rounded bg-black/20 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider">{result.trace.decision}</span>
          {result.answer}
        </div>

        <div className="rounded-xl border border-white/10 bg-[#07100f] p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="font-mono text-[10px] uppercase tracking-wider text-green-300">Execution trace</p>
            <span className="rounded bg-green-300/10 px-2 py-1 font-mono text-[9px] text-green-300">{result.trace.mode} · {result.trace.latencyMs}ms · {result.trace.toolCallCount} tool call{result.trace.toolCallCount === 1 ? "" : "s"} · {result.trace.modelCallCount} model call{result.trace.modelCallCount === 1 ? "" : "s"}</span>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-2 text-xs">
            <p className="text-[#b7cbc3]">Intent: <span className="text-green-300">{result.trace.intent}</span></p>
            <p className="text-[#b7cbc3]">Risk: <span className={result.trace.risk === "HIGH" ? "text-amber-200" : "text-green-300"}>{result.trace.risk}</span></p>
          </div>

          {result.trace.escalationReason && <p className="mb-4 rounded-lg border border-amber-300/30 bg-amber-300/10 p-3 text-xs text-amber-100">Escalation reason: {result.trace.escalationReason}</p>}

          <p className="mb-1 text-[10px] uppercase tracking-wider text-[#60776f]">Tool calls</p>
          <div className="mb-4 space-y-2">{result.trace.steps.map((step, index) => <div key={`${step.tool}-${index}`} className="font-mono text-xs"><div className="flex flex-wrap justify-between gap-2 text-[#b7cbc3]"><span>{step.tool}</span><span>{step.resultCount} {step.resultCount === 1 ? "item" : "items"}</span></div><p className="mt-1 text-[#718a81]">out: {step.outputSummary}</p></div>)}</div>

          {result.trace.sources.length > 0 && <><p className="mb-1 text-[10px] uppercase tracking-wider text-[#60776f]">Retrieved sources</p><div className="mb-4 space-y-1">{result.trace.sources.map((source) => <p key={source.id} className="text-xs text-green-300">[{source.title}] · cosine {source.score.toFixed(3)}</p>)}</div></>}

          <p className="mb-1 text-[10px] uppercase tracking-wider text-[#60776f]">Verifier</p>
          <div className={`mb-4 rounded-lg border p-3 ${!result.trace.verifier.applicable ? "border-white/10 bg-white/[.02]" : result.trace.verifier.grounded ? "border-green-300/20 bg-green-300/5" : "border-amber-300/30 bg-amber-300/10"}`}>
            {result.trace.verifier.applicable ? <>
              <p className="text-xs text-[#d9e8e2]">Grounded: <span className={result.trace.verifier.grounded ? "text-green-300" : "text-amber-200"}>{String(result.trace.verifier.grounded)}</span> · score {result.trace.verifier.groundednessScore.toFixed(2)}</p>
              {result.trace.verifier.warning && <p className="mt-1 text-xs text-amber-200">⚠ {result.trace.verifier.warning}</p>}
            </> : <p className="text-xs text-[#718a81]">Not applicable to this response.</p>}
          </div>

          {result.trace.estimatedUsage ? <p className="font-mono text-[10px] text-[#60776f]">Estimated usage: {result.trace.estimatedUsage.promptTokens} prompt / {result.trace.estimatedUsage.totalTokens} total tokens (embedding call)</p> : <p className="font-mono text-[10px] text-[#60776f]">Estimated usage: not available (deterministic mode has no provider usage data)</p>}
        </div>
      </div>}
    </div>

    <form onSubmit={submit} className="mt-6 flex gap-2 rounded-xl border border-white/10 bg-[#07100f] p-2"><input aria-label="Support message" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Ask a support question…" className="min-w-0 flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-[#456057]" /><button disabled={loading || !message.trim()} className="rounded-lg bg-green-300 px-4 py-2 text-sm font-medium text-[#07100f] disabled:opacity-50">{loading ? "Running…" : "Ask copilot"}</button></form>
  </div>;
}
