import { isOpenAIConfigured } from "./openai";
import { buildSupportLocalizationInstruction } from "./support-behavior";

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
    [/ฝากเงิน.*(?:เงิน|เครดิต).*(?:ยัง)?ไม่เข้า|ฝากเงินแล้ว(?:เงิน|เครดิต)?ไม่เข้า|ฝากเงินไม่เข้า|เครดิต(?:ยัง)?ไม่เข้า/gi, "deposit not credited financial loss"],
    [/ถอนเงินนาน|ถอนเงินล่าช้า|ถอนเงินยังไม่สำเร็จ/gi, "withdrawal pending delayed status"],
    [/ถอนแล้วเงินไม่เข้า|ถอน(?:เงิน)?สำเร็จ(?:แล้ว)?(?:\s*แต่)?เงิน(?:ยัง)?ไม่เข้า(?:บัญชี)?|เงินถอนยังไม่เข้าบัญชี/gi, "withdrawal completed money not received financial loss"],
    [/โปรโมชั่น|โปรโมชัน|โบนัส|คืนยอดเสีย|เครดิตฟรี|ฟรีสปิน|เทิร์นโอเวอร์|ยอดหมุนเวียน/gi, "promotion bonus cashback free spin turnover wagering requirement"],
    [/เกมค้าง|เกมเข้าไม่ได้|เกมมีปัญหา|รอบเกม|ค่ายเกม|ยอดเงินไม่อัปเดต/gi, "game round provider stuck error balance game support"],
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
    [/存款未到账|充值未到账|存款没有入账/gi, "deposit not credited financial loss"],
    [/提款延迟|提款处理中|提现很慢/gi, "withdrawal pending delayed status"],
    [/提款完成但未到账|提现成功但没收到钱/gi, "withdrawal completed money not received financial loss"],
    [/促销|优惠|奖金|返水|免费旋转|流水要求/gi, "promotion bonus cashback free spin turnover wagering requirement"],
    [/游戏卡住|游戏无法打开|游戏故障|游戏回合|游戏供应商|余额未更新/gi, "game round provider stuck error balance game support"],
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

/**
 * Applies a bounded amount of conversation context without letting a
 * corrected topic keep vocabulary from the rejected topic. The current turn
 * always wins when it explicitly names deposit vs. withdrawal.
 */
export function applyConversationContext(original: string, normalized: string, previousUserMessages: string[] = []): string {
  const depositCorrection = /ฝาก(?:เงิน)?|deposit|top ?up|存款|充值/i.test(original);
  const withdrawalCorrection = /ถอน(?:เงิน)?|withdraw|cash ?out|提款|提现/i.test(original);
  const rejectsWithdrawal = /ไม่ใช่\s*ถอน|not (?:a )?withdrawal|不是提款|不是提现/i.test(original);
  const rejectsDeposit = /ไม่ใช่\s*ฝาก|not (?:a )?deposit|不是存款|不是充值/i.test(original);

  if (depositCorrection && (rejectsWithdrawal || !withdrawalCorrection)) {
    return `${normalized.replace(/withdraw(?:al|ing)?|cash ?out/gi, " ")} deposit transaction deposit not credited`.replace(/\s+/g, " ").trim();
  }
  if (withdrawalCorrection && (rejectsDeposit || !depositCorrection)) {
    return `${normalized.replace(/deposit|top ?up/gi, " ")} withdrawal transaction`.replace(/\s+/g, " ").trim();
  }

  const looksLikeFollowUp = /อันนี้|เมื่อกี้|รายการนี้|แล้วล่ะ|that one|previous|what about|这个|刚才|那笔/i.test(original);
  const previous = previousUserMessages.at(-1);
  if (looksLikeFollowUp && previous) {
    const previousNormalized = normalizeLocally(previous, detectLanguage(previous));
    return `${previousNormalized} Follow-up clarification: ${normalized}`;
  }
  return normalized;
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
  const translated = await translate(text, buildSupportLocalizationInstruction(language));
  if (translated) return translated;
  return language === "th"
    ? `ขณะนี้เดโมแบบออฟไลน์ยังใช้เอกสารอ้างอิงภาษาอังกฤษ: ${text}`
    : `当前离线演示仍使用英文参考资料：${text}`;
}
