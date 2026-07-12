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
  if (intent === "troubleshooting" || intent === "product_usage") return "helpful";
  return "neutral";
}

function localizedEscalation(input: ComposerInput): string {
  const id = input.handoffId;
  if (!id) {
    if (input.locale === "th") return "ขออภัยครับ ระบบยังไม่สามารถสร้างเคสจำลองได้ในขณะนี้ กรุณาลองใหม่อีกครั้งหรือติดต่อทีมบริการลูกค้าโดยตรงครับ";
    if (input.locale === "zh") return "抱歉，系统暂时无法创建模拟客服工单。请稍后重试或直接联系客户服务团队。";
    return "Sorry, the demo support case could not be created right now. Please try again or contact customer support directly.";
  }

  if (input.locale === "th") {
    if (input.intent === "billing_payment") return `เข้าใจครับว่าเรื่องยอดเงินนี้สำคัญและควรได้รับการตรวจสอบอย่างละเอียด ระบบได้สร้างเคสจำลองไว้ในคิวบริการลูกค้าแล้วครับ หมายเลขอ้างอิงสำหรับเดโมคือ ${id}`;
    if (input.intent === "complaint") return `เข้าใจครับว่าเรื่องนี้ทำให้คุณไม่พอใจมาก ระบบได้สร้างเคสจำลองไว้สำหรับการตรวจสอบเพิ่มเติมแล้วครับ หมายเลขอ้างอิงสำหรับเดโมคือ ${id}`;
    if (input.intent === "privacy_security") return `เนื่องจากเรื่องนี้เกี่ยวข้องกับความปลอดภัยของบัญชี ระบบได้สร้างเคสจำลองสำหรับการตรวจสอบเพิ่มเติมแล้วครับ หมายเลขอ้างอิงสำหรับเดโมคือ ${id}`;
    return `เพื่อให้ตรวจสอบรายละเอียดได้รอบคอบ ระบบได้สร้างเคสจำลองไว้ในคิวบริการลูกค้าแล้วครับ หมายเลขอ้างอิงสำหรับเดโมคือ ${id}`;
  }
  if (input.locale === "zh") return `理解您的情况。系统已创建一个模拟客服工单以供进一步审核。演示编号为 ${id}。`;
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
    if (input.locale === "th") return "ขออภัยครับ ตอนนี้ยังไม่พบข้อมูลที่เพียงพอสำหรับตอบคำถามนี้อย่างถูกต้อง";
    if (input.locale === "zh") return "抱歉，目前没有足够的信息可以准确回答这个问题。";
    return "I could not find enough information to answer this accurately.";
  }

  const language = input.locale === "th" ? "th" : input.locale === "zh" ? "zh" : "en";
  const localized = await localizeSupportAnswer(evidence, language);
  if (language === "th") {
    if (input.tone === "empathetic") return `เข้าใจครับว่าเรื่องนี้ทำให้คุณไม่สบายใจ ${localized}`;
    if (input.tone === "urgent") return `เข้าใจครับว่าเรื่องนี้เร่งด่วน ${localized}`;
    return `ได้เลยครับ ${localized}`;
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
