import { isOpenAIConfigured } from "./openai";

export type SupportedLanguage = "en" | "th" | "zh";

export function detectLanguage(text: string): SupportedLanguage {
  if (/\p{Script=Thai}/u.test(text)) return "th";
  if (/\p{Script=Han}/u.test(text)) return "zh";
  return "en";
}

const LOCAL_NORMALIZATIONS: Record<"th" | "zh", Array<[RegExp, string]>> = {
  th: [
    [/ระบบนี้สร้าง(?:ขึ้น)?มาทำไม|สร้างระบบนี้ทำไม/gi, "why was this system built product purpose"],
    [/สมัครบัญชี|สร้างบัญชี|เปิดบัญชี/gi, "create a new account onboarding"],
    [/ใบแจ้งหนี้|ใบเสร็จ|การชำระเงิน|จ่ายเงิน/gi, "invoice billing payment"],
    [/ยกเลิก|คืนเงิน/gi, "cancel refund"],
    [/เข้า(?:ระบบ)?ไม่ได้|ล็อกอินไม่ได้|ใช้งานไม่ได้|โหลดไม่ได้/gi, "cannot log in not working troubleshooting"],
    [/สถานะคำขอ|ติดตามคำขอ/gi, "request status tracking"],
    [/ข้อมูลส่วนบุคคล|ความเป็นส่วนตัว/gi, "personal data privacy"],
    [/พาสปอร์ต|หนังสือเดินทาง|ยืนยันตัวตน/gi, "passport identity verification"],
    [/โต้แย้ง|ไม่ยอมรับรายการ|รายการที่ไม่ได้ทำ/gi, "dispute unauthorized charge"],
    [/บัญชีถูกเจาะ|บัญชีถูกแฮก|บัญชีอาจถูกบุกรุก/gi, "account hacked compromised security breach"],
    [/ร้องเรียน|โกรธมาก|รับไม่ได้/gi, "complaint furious unacceptable"],
    [/อนาคต|พัฒนาต่อ|แผนต่อไป/gi, "future enterprise roadmap"],
    [/เงื่อนไข.*(?:80|90)|(?:80|90).*เงื่อนไข/gi, "conditions target 80 90 percent automation"],
  ],
  zh: [
    [/为什么(?:要)?(?:创建|开发)这个系统|这个系统是做什么的/gi, "why was this system built product purpose"],
    [/注册账户|创建账户|开设账户/gi, "create a new account onboarding"],
    [/发票|账单|付款|支付/gi, "invoice billing payment"],
    [/取消|退款/gi, "cancel refund"],
    [/无法登录|登录不了|无法使用|无法加载/gi, "cannot log in not working troubleshooting"],
    [/请求状态|查询进度|跟踪请求/gi, "request status tracking"],
    [/个人数据|隐私/gi, "personal data privacy"],
    [/护照|身份证明|身份验证/gi, "passport identity verification"],
    [/争议|拒付|未经授权的交易/gi, "dispute unauthorized charge"],
    [/账户被盗|账户被黑|账户可能被入侵/gi, "account hacked compromised security breach"],
    [/投诉|非常生气|不可接受/gi, "complaint furious unacceptable"],
    [/未来|后续开发|下一步计划/gi, "future enterprise roadmap"],
    [/(?:条件|前提).*(?:80|90)|(?:80|90).*(?:条件|前提)/gi, "conditions target 80 90 percent automation"],
  ],
};

export function normalizeLocally(text: string, language = detectLanguage(text)): string {
  if (language === "en") return text;
  let normalized = text;
  for (const [pattern, replacement] of LOCAL_NORMALIZATIONS[language]) normalized = normalized.replace(pattern, ` ${replacement} `);
  return normalized.replace(/\s+/g, " ").trim();
}

async function translate(text: string, instruction: string): Promise<string | null> {
  if (!isOpenAIConfigured()) return null;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  const baseUrl = (process.env.AI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "");
  const model = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";
  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        temperature: 0,
        max_tokens: 700,
        messages: [
          { role: "system", content: `${instruction} Preserve source identifiers in square brackets exactly. Do not add facts, advice, promises, or policy.` },
          { role: "user", content: text },
        ],
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) return null;
    const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    return payload.choices?.[0]?.message?.content?.trim() || null;
  } catch {
    return null;
  }
}

export async function normalizeSupportInput(text: string): Promise<{ language: SupportedLanguage; normalized: string; mode: "original" | "local-map" | "live-translation" }> {
  const language = detectLanguage(text);
  if (language === "en") return { language, normalized: text, mode: "original" };
  const local = normalizeLocally(text, language);
  const translated = await translate(text, "Translate this customer-support request into concise English for intent, risk, and retrieval processing.");
  return translated
    // Preserve generic, testable topic/risk hints from the local adapter alongside
    // the natural translation. This avoids a provider paraphrase accidentally
    // dropping the vocabulary used by deterministic safety and retrieval gates.
    ? { language, normalized: local === text ? translated : `${translated} ${local}`, mode: "live-translation" }
    : { language, normalized: local, mode: "local-map" };
}

export async function localizeSupportAnswer(text: string, language: SupportedLanguage): Promise<string> {
  if (language === "en") return text;
  const translated = await translate(text, language === "th" ? "Translate this grounded support response into natural Thai." : "Translate this grounded support response into Simplified Chinese.");
  if (translated) return translated;
  return language === "th" ? `คำตอบอ้างอิงภาษาอังกฤษ: ${text}` : `英文参考答复：${text}`;
}

export function localizedEscalation(language: SupportedLanguage, reason: string): string {
  if (language === "th") return `คำขอนี้ถูกส่งต่อให้เจ้าหน้าที่ตรวจสอบ เหตุผล: ${reason}`;
  if (language === "zh") return `此请求已转交人工客服审核。原因：${reason}`;
  return `This request has been escalated to a human agent. ${reason}`;
}
