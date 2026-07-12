"use client";

import { FormEvent, useState } from "react";
import { knowledgeDocuments } from "@/lib/knowledge";

type Module = "chat" | "knowledge" | "workflow";
type WorkflowStep = { step: string; detail: string; status: string };

const modules = [
  { id: "chat" as const, number: "01", label: "AI Chat", description: "Tool routing" },
  { id: "knowledge" as const, number: "02", label: "Knowledge Base", description: "Grounded retrieval" },
  { id: "workflow" as const, number: "03", label: "Workflow", description: "Policy automation" },
];

export function Studio() {
  const [active, setActive] = useState<Module>("chat");
  return (
    <div className="mx-auto min-h-screen max-w-[1500px] px-5 py-5 sm:px-8 lg:px-12">
      <header className="flex items-center justify-between border-b border-white/10 pb-5">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-lg border border-green-300/30 bg-green-300/10 font-mono text-sm text-green-300">AI</div>
          <div><p className="text-sm font-semibold tracking-tight">AI Operations Studio</p><p className="text-xs text-[#90a9a0]">Personal portfolio prototype</p></div>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-green-300/20 bg-green-300/5 px-3 py-1.5 text-xs text-green-200"><span className="h-1.5 w-1.5 rounded-full bg-green-300" />Mock mode · no secrets</div>
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
          <div className="min-h-[570px] p-5 sm:p-7">{active === "chat" ? <ChatDemo /> : active === "knowledge" ? <KnowledgeDemo /> : <WorkflowDemo />}</div>
        </section>
      </main>
      <footer className="flex flex-col gap-2 border-t border-white/10 py-5 text-xs text-[#60776f] sm:flex-row sm:items-center sm:justify-between"><p>Built as a personal portfolio prototype. No client or employer data.</p><p className="font-mono">Next.js · TypeScript · Tailwind CSS</p></footer>
    </div>
  );
}

function ChatDemo() {
  const [message, setMessage] = useState("What is the response target for a high-severity incident?");
  const [result, setResult] = useState<{ answer: string; toolCall?: { name: string; resultCount: number } | null } | null>(null);
  const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent) { event.preventDefault(); setLoading(true); const response = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message }) }); setResult(await response.json()); setLoading(false); }
  return <div className="flex min-h-[510px] flex-col">
    <div className="mb-6 rounded-xl border border-white/10 bg-[#07100f] p-4"><p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-green-300">How it works</p><p className="text-xs leading-5 text-[#90a9a0]">The assistant classifies the request, calls a safe local tool when needed, and exposes the tool trace instead of hiding it.</p></div>
    <div className="flex-1 space-y-4">
      <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-green-300 px-4 py-3 text-sm text-[#07100f]">{message}</div>
      {result && <div className="max-w-[90%] space-y-3"><div className="rounded-2xl rounded-bl-sm border border-white/10 bg-white/[.04] px-4 py-3 text-sm leading-6 text-[#d9e8e2]">{result.answer}</div>{result.toolCall && <div className="rounded-lg border border-green-300/20 bg-green-300/5 p-3 font-mono text-xs"><div className="flex justify-between text-green-300"><span>↳ tool: {result.toolCall.name}</span><span>{result.toolCall.resultCount} result</span></div></div>}</div>}
    </div>
    <form onSubmit={submit} className="mt-6 flex gap-2 rounded-xl border border-white/10 bg-[#07100f] p-2"><input aria-label="Chat message" value={message} onChange={(e) => setMessage(e.target.value)} className="min-w-0 flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-[#456057]" /><button disabled={loading || !message.trim()} className="rounded-lg bg-green-300 px-4 py-2 text-sm font-medium text-[#07100f] disabled:opacity-50">{loading ? "Running…" : "Run demo"}</button></form>
  </div>;
}

function KnowledgeDemo() {
  const [query, setQuery] = useState("When should an expense claim be submitted?");
  const [result, setResult] = useState<{ answer: string; sources: { id: string; title: string; score: number }[] } | null>(null);
  async function submit(event: FormEvent) { event.preventDefault(); const response = await fetch("/api/rag", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query }) }); setResult(await response.json()); }
  return <div>
    <form onSubmit={submit} className="flex gap-2"><input aria-label="Knowledge query" value={query} onChange={(e) => setQuery(e.target.value)} className="min-w-0 flex-1 rounded-lg border border-white/10 bg-[#07100f] px-4 py-3 text-sm outline-none focus:border-green-300/40" /><button className="rounded-lg bg-green-300 px-4 text-sm font-medium text-[#07100f]">Search</button></form>
    <div className="mt-7 grid gap-5 xl:grid-cols-[.9fr_1.1fr]"><div><p className="mb-3 font-mono text-[10px] uppercase tracking-wider text-[#718a81]">Sample documents</p><div className="space-y-2">{knowledgeDocuments.map((doc) => <div key={doc.id} className="rounded-xl border border-white/10 bg-white/[.025] p-4"><div className="flex items-start justify-between gap-3"><p className="text-sm font-medium">{doc.title}</p><span className="text-green-300">◇</span></div><p className="mt-2 text-xs text-[#718a81]">{doc.category} · {doc.updated}</p></div>)}</div></div>
    <div><p className="mb-3 font-mono text-[10px] uppercase tracking-wider text-[#718a81]">Grounded answer</p><div className="min-h-56 rounded-xl border border-white/10 bg-[#07100f] p-5">{result ? <><p className="text-sm leading-6 text-[#d9e8e2]">{result.answer}</p><div className="mt-5 border-t border-white/10 pt-4"><p className="mb-2 text-[10px] uppercase tracking-wider text-[#60776f]">Citations</p>{result.sources.map((source) => <p key={source.id} className="mb-1 text-xs text-green-300">[{source.title}] · relevance {source.score}</p>)}</div></> : <p className="text-sm text-[#60776f]">Run a query to retrieve an answer with visible citations.</p>}</div></div></div>
  </div>;
}

function WorkflowDemo() {
  const [steps, setSteps] = useState<WorkflowStep[]>([]); const [runId, setRunId] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); const response = await fetch("/api/workflow", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(form)) }); const data = await response.json(); setSteps(data.steps); setRunId(data.runId); }
  return <div className="grid gap-7 xl:grid-cols-[.9fr_1.1fr]"><form onSubmit={submit} className="space-y-4"><div><label className="mb-1.5 block text-xs text-[#90a9a0]">Requester</label><input name="requester" required defaultValue="Maya Chen" className="w-full rounded-lg border border-white/10 bg-[#07100f] px-3 py-2.5 text-sm outline-none" /></div><div><label className="mb-1.5 block text-xs text-[#90a9a0]">Request type</label><select name="type" className="w-full rounded-lg border border-white/10 bg-[#07100f] px-3 py-2.5 text-sm"><option>Software access</option><option>Equipment</option><option>Training</option></select></div><div><label className="mb-1.5 block text-xs text-[#90a9a0]">Priority</label><select name="priority" className="w-full rounded-lg border border-white/10 bg-[#07100f] px-3 py-2.5 text-sm"><option>Normal</option><option>High</option></select></div><div><label className="mb-1.5 block text-xs text-[#90a9a0]">Business justification</label><textarea name="details" required defaultValue="Access required for the sample analytics project." rows={4} className="w-full resize-none rounded-lg border border-white/10 bg-[#07100f] px-3 py-2.5 text-sm outline-none" /></div><button className="w-full rounded-lg bg-green-300 py-2.5 text-sm font-medium text-[#07100f]">Run workflow</button></form>
    <div><div className="mb-4 flex items-center justify-between"><p className="font-mono text-[10px] uppercase tracking-wider text-[#718a81]">Execution trace</p>{runId && <span className="font-mono text-[10px] text-green-300">{runId}</span>}</div><div className="space-y-2">{steps.length ? steps.map((item, index) => <div key={item.step} className="flex gap-4 rounded-xl border border-white/10 bg-white/[.025] p-4"><div className={`grid h-7 w-7 shrink-0 place-items-center rounded-full font-mono text-xs ${item.status === "review" ? "bg-amber-300/15 text-amber-200" : "bg-green-300/15 text-green-300"}`}>{index + 1}</div><div><p className="text-sm font-medium">{item.step}</p><p className="mt-1 text-xs text-[#718a81]">{item.detail}</p></div></div>) : <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-[#60776f]">Submit the sample request to view validation, routing, policy, and notification steps.</div>}</div></div></div>;
}
