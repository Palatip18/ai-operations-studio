import type { Intent, RiskLevel } from "./support-classification";
import type { SupportDecision } from "./support-agent";
import { localizeSupportAnswer } from "./multilingual";

export type SupportTone = "neutral" | "helpful" | "empathetic" | "urgent" | "apologetic";

type ComposerInput = {
  message: string;
  intent: Intent;
  risk: RiskLevel;
  decision: SupportDecision;
  escalationReason: string | null;
  evidence: string;
  locale: string;
  tone: SupportTone;
  handoffId: string | null;
};

export function deriveTone(message: string, risk: RiskLevel, intent: Intent): SupportTone {
  if (risk === "HIGH" || /urgent|immediately|ด่วน|紧急/i.test(message)) return "urgent";
  if (intent === "complaint" || /furious|unacceptable|ไม่พอใจ|โกรธ|投诉|生气/i.test(message)) return "empathetic";
  if (/sorry|apolog|ขอโทษ|抱歉/i.test(message)) return "apologetic";
  if (intent === "troubleshooting" || intent === "product_usage" || intent === "game_support" || intent === "promotion_bonus") return "helpful";
  return "neutral";
}

export function sanitizeCustomerFacingResponse(text: string): string {
  return text
    // Source IDs belong in the internal trace, never in the customer reply.
    .replace(/\s*\[[^\]\r\n]{1,80}\]\s*/g, " ")
    // Normalize literal or model-translated internal wording into natural Thai.
    .replace(/แผงโปรโมชั่น/g, "รายละเอียดของโปรโมชั่น")
    .replace(/แผงโปรโมชัน/g, "รายละเอียดของโปรโมชัน")
    .replace(/\s+/g, " ")
    .replace(/\s+([.,!?;:])/g, "$1")
    .trim();
}

function localizedEscalation(input: ComposerInput): string {
  const id = input.handoffId;
  if (!id) {
    if (input.locale === "th") return "ขออภัยค่ะ ตอนนี้แอดมินยังเปิดรายการตรวจสอบให้ไม่ได้ รบกวนลูกค้าลองใหม่อีกครั้งสักครู่นะคะ";
    if (input.locale === "zh") return "抱歉，系统暂时无法创建模拟客服工单。请稍后重试或直接联系客户服务团队。";
    return "Sorry, the demo support case could not be created right now. Please try again or contact customer support directly.";
  }

  if (input.locale === "th") {
    if (input.intent === "deposit_withdrawal") return `แอดมินส่งรายการให้ตรวจสอบเพิ่มเติมเรียบร้อยแล้วค่ะ หมายเลขอ้างอิงคือ ${id} รบกวนลูกค้ารอสักครู่นะคะ`;
    if (input.intent === "billing_payment") return `แอดมินเปิดรายการตรวจสอบยอดเงินให้เรียบร้อยแล้วค่ะ หมายเลขอ้างอิงคือ ${id}`;
    if (input.intent === "complaint") return `เข้าใจค่ะว่าเรื่องนี้ทำให้ลูกค้าไม่สบายใจ แอดมินเปิดรายการตรวจสอบเพิ่มเติมให้แล้วนะคะ หมายเลขอ้างอิงคือ ${id}`;
    if (input.intent === "privacy_security") return `เรื่องนี้เกี่ยวข้องกับความปลอดภัยของบัญชี แอดมินเปิดรายการตรวจสอบเพิ่มเติมให้แล้วค่ะ หมายเลขอ้างอิงคือ ${id}`;
    return `แอดมินเปิดรายการตรวจสอบเพิ่มเติมให้เรียบร้อยแล้วค่ะ หมายเลขอ้างอิงคือ ${id}`;
  }
  if (input.locale === "zh") {
    if (input.intent === "deposit_withdrawal") return `理解您对存款或提款状态的担忧。系统已创建一个模拟交易审核工单并加入队列。演示编号为 ${id}。`;
    return `理解您的情况。系统已创建一个模拟客服工单以供进一步审核。演示编号为 ${id}。`;
  }
  if (input.intent === "deposit_withdrawal") return `I understand why the deposit or withdrawal status is concerning. A simulated transaction-review case has been created and queued. Your demo reference is ${id}.`;
  if (input.intent === "billing_payment") return `I understand why this billing issue is concerning. A demo support case has been created and queued for further review. Your demo reference is ${id}.`;
  if (input.intent === "complaint") return `I understand why this is frustrating. A demo support case has been created for further review. Your demo reference is ${id}.`;
  return `This needs additional review, so a demo support case has been created and queued. Your demo reference is ${id}.`;
}

export async function composeCustomerResponse(input: ComposerInput): Promise<string> {
  if (input.decision === "ESCALATE") return localizedEscalation(input);

  const evidence = input.evidence
    .replace(/\[[a-zA-Z0-9_-]+\]\s*/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!evidence) {
    if (input.locale === "th") return "ขออภัยค่ะ ตอนนี้แอดมินยังไม่พบข้อมูลที่เพียงพอ รบกวนลูกค้าแจ้งรายละเอียดเพิ่มเติมอีกนิดนะคะ";
    if (input.locale === "zh") return "抱歉，目前没有足够的信息可以准确回答这个问题。";
    return "I could not find enough information to answer this accurately.";
  }

  const language = input.locale === "th" ? "th" : input.locale === "zh" ? "zh" : "en";
  const localized = sanitizeCustomerFacingResponse(await localizeSupportAnswer(evidence, language));
  if (language === "th") {
    if (input.tone === "empathetic") return `เข้าใจค่ะว่าเรื่องนี้ทำให้ลูกค้าไม่สบายใจ ${localized}`;
    if (input.tone === "urgent") return `รับทราบค่ะ แอดมินจะช่วยตรวจสอบเรื่องนี้ให้นะคะ ${localized}`;
    return `ได้ค่ะ ${localized}`;
  }
  if (language === "zh") {
    if (input.tone === "empathetic") return `理解您的担忧。${localized}`;
    if (input.tone === "urgent") return `理解此事较为紧急。${localized}`;
    return localized;
  }
  if (input.tone === "empathetic") return `I understand your concern. ${localized}`;
  if (input.tone === "urgent") return `I understand this is urgent. ${localized}`;
  return localized;
}
