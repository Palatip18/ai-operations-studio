import { executeToolLive, toolDefinitions, type ToolName, type ToolTrace } from "./tools";

type ChatMessage = { role: "system" | "user" | "assistant" | "tool"; content: string; tool_call_id?: string; tool_calls?: unknown[] };

export async function runLiveAssistant(message: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  const baseUrl = (process.env.AI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "");
  const model = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";
  const messages: ChatMessage[] = [
    { role: "system", content: "You are an operations assistant for a portfolio prototype. Use tools for factual document, workflow, or evaluation questions. Never invent company or customer data. State that all content is fictional sample data." },
    { role: "user", content: message },
  ];
  const first = await completion(baseUrl, apiKey, model, messages);
  const assistant = first.choices?.[0]?.message;
  const calls = assistant?.tool_calls ?? [];
  if (!calls.length) return { answer: assistant?.content ?? "No response was generated.", toolCalls: [] as ToolTrace[], mode: "live" };

  messages.push({ role: "assistant", content: assistant?.content ?? "", tool_calls: calls });
  const traces: ToolTrace[] = [];
  for (const call of calls.slice(0, 3)) {
    const name = call.function.name as ToolName;
    if (!toolDefinitions.some((tool) => tool.function.name === name)) continue;
    const args = JSON.parse(call.function.arguments || "{}") as Record<string, unknown>;
    const output = await executeToolLive(name, args);
    traces.push(output.trace);
    messages.push({ role: "tool", tool_call_id: call.id, content: output.answer });
  }
  const final = await completion(baseUrl, apiKey, model, messages);
  return { answer: final.choices?.[0]?.message?.content ?? "Tools ran successfully, but no final response was generated.", toolCalls: traces, mode: "live" };
}

async function completion(baseUrl: string, apiKey: string, model: string, messages: ChatMessage[]) {
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages, tools: toolDefinitions, tool_choice: "auto", temperature: 0.1, max_tokens: 350 }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`Model provider returned ${response.status}`);
  return response.json() as Promise<{ choices?: { message?: { content?: string | null; tool_calls?: { id: string; function: { name: string; arguments: string } }[] } }[] }>;
}
