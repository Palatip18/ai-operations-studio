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

type Module = "chat" | "overview" | "knowledge" | "workflow" | "agent" | "support" | "analytics" | "impact" | "settings";
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
type SupportResult = { answer: string; customerVerificationRequired?: boolean; slipUploadRequired?: boolean; clarificationRequired?: boolean; transaction?: TransactionResult | null; handoff?: HandoffResult | null; trace: SupportTrace };
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
  "overview",
  "support",
  "knowledge",
  "workflow",
  "agent",
  "analytics",
  "impact",
  "settings",
];
const moduleCopyIndex: Record<"knowledge" | "workflow" | "agent" | "support", number> = {
  knowledge: 0,
  workflow: 1,
  agent: 2,
  support: 3,
};

const interviewUiCopy = {
  en: {
    modules: {
      overview: ["Interview Overview", "JD alignment, guided story, and four iGaming scenarios"],
      impact: ["Business Impact & KPIs", "Projected targets, measurement plan, and honest boundaries"],
    },
    overview: {
      eyebrow: "3-minute interview path",
      title: "From an iGaming operations problem to a measurable AI workflow",
      intro: "This functional prototype demonstrates how I frame requirements, constrain AI decisions, integrate operational systems, and measure business value. All customers, transactions, documents, and integrations are fictional or simulated.",
      privacy: "Domain-policy examples were rewritten from anonymized operational patterns. No real operator names, URLs, user lists, internal IDs, or source values are included.",
      impactButton: "View projected KPIs",
      steps: ["Problem", "Requirements", "AI workflow", "Human control", "Measurement"],
      scenariosEyebrow: "Guided scenarios",
      scenariosTitle: "Four business cases, four controlled outcomes",
      scenariosHint: "Select a scenario to prefill the live workflow",
      functionalDemo: "Functional demo",
      controlledOutcome: "Controlled outcome",
      businessValue: "Business value",
      openScenario: "Open scenario in Support Copilot →",
      jdTitle: "JD alignment",
      jd: [
        ["Requirement Analysis", "Turns CS, payment, KYC, and risk pain points into intents, rules, evidence needs, and escalation criteria."],
        ["End-to-End Integration", "Connects chat, customer verification, hybrid retrieval, bounded tools, back-office adapters, handoff, and analytics."],
        ["AI Agents / RAG", "Uses traceable retrieval, citations, groundedness checks, deterministic safety policy, and capped tool calls."],
        ["Talent Enablement", "Exposes behavior rules, execution traces, scenarios, and improvement owners so Operations can govern and learn."],
        ["Value Delivery & Measurement", "Defines pilot targets and a measurement plan without presenting projected figures as production results."],
      ],
    },
    scenarios: [
      { area: "CS", title: "Promotion eligibility and withdrawal rules", message: "For the fictional Starter Match, I opted in before my first deposit. What eligibility, turnover, game, and withdrawal-cap rules should be checked?", outcome: "Retrieve the fictional eligibility matrix and withdrawal decision table, then explain the applicable checks with citations.", value: "Turns a long, error-prone policy lookup into a consistent answer while preserving exception review." },
      { area: "PAYMENT", title: "Delayed withdrawal", message: "My withdrawal WDL-2001 has been pending for a long time.", outcome: "Verify user, query a scoped back-office adapter, then explain status or escalate.", value: "Reduces system switching and gives agents a complete, auditable case context." },
      { area: "KYC", title: "Identity document update", message: "My passport has expired. How can I update my identity document?", outcome: "Classify as sensitive identity handling and route to human review without collecting documents in chat.", value: "Protects personal data and keeps regulated decisions inside an approved review flow." },
      { area: "RISK", title: "Unauthorized transaction", message: "My gaming account shows a transaction I did not make.", outcome: "High-risk classification triggers a mandatory, bounded handoff instead of an autonomous answer.", value: "Prioritizes possible fraud while preserving evidence, reason, and ownership." },
    ],
    impact: {
      eyebrow: "Projected pilot targets — estimates, not production results",
      title: "Business Impact & Measurement Plan",
      badge: "VALIDATE IN PILOT",
      intro: "These ranges are hypotheses for capacity planning. Baselines must be measured from real traffic, then validated with a controlled pilot before any staffing or ROI decision.",
      metrics: [
        ["Routine inquiry containment", "40–60%", "Start with supported, low-risk intents only"],
        ["First response time", "< 15 sec", "For AI-handled requests during the pilot"],
        ["Knowledge-grounded answers", "> 90%", "On a labeled, in-scope evaluation set"],
        ["High-risk escalation recall", "> 95%", "Prioritize safety over automation coverage"],
        ["Manual search time", "−30–50%", "Compare agent handling time before vs. after copilot"],
        ["Cost per resolved contact", "−15–30%", "Validate after quality and CSAT guardrails pass"],
      ],
      estimate: "Projected estimate",
      confidenceTitle: "AI confidence and escalation flow",
      confidenceIntro: "“Confidence” here is an auditable policy outcome based on evidence quality, intent/risk rules, and required context — not an invented model probability.",
      confidenceSteps: [
        ["Strong evidence", "Answer", "Relevant sources pass the groundedness gate and no policy rule requires review."],
        ["Missing context", "Clarify", "Ask for the minimum safe information; do not guess or create a premature case."],
        ["Weak evidence / high risk", "Escalate", "Create a structured human-review handoff with reason and trace."],
      ],
      step: "STEP",
      rollout: [["1", "Baseline", "Volume, AHT, FCR, CSAT, escalation reasons"], ["2", "Offline evaluation", "Labeled cases for routing, retrieval, and safety"], ["3", "Shadow pilot", "AI recommends; employees retain control"], ["4", "Controlled rollout", "Expand only when quality guardrails pass"]],
    },
    confidencePanel: { title: "Evidence confidence → policy action", intro: "Groundedness is an auditable prototype signal, not a model probability.", evidence: "Evidence", review: "HUMAN REVIEW", clarify: "CLARIFY", respond: "AUTO RESPOND", escalateTag: "ESCALATE" },
  },
  th: {
    modules: {
      overview: ["ภาพรวมสำหรับการสัมภาษณ์", "เชื่อมกับรายละเอียดงาน เส้นทางการนำเสนอ และ 4 สถานการณ์ iGaming"],
      impact: ["ผลกระทบทางธุรกิจและ KPI", "เป้าหมายโดยประมาณ แผนการวัดผล และขอบเขตที่โปร่งใส"],
    },
    overview: {
      eyebrow: "เส้นทางนำเสนอ 3 นาที",
      title: "จากปัญหาหน้างาน iGaming สู่กระบวนการ AI ที่วัดผลได้",
      intro: "ต้นแบบที่ใช้งานได้นี้แสดงวิธีที่ผมวิเคราะห์ความต้องการ กำหนดขอบเขตการตัดสินใจของ AI เชื่อมระบบงาน และวัดคุณค่าทางธุรกิจ ลูกค้า ธุรกรรม เอกสาร และการเชื่อมต่อทั้งหมดเป็นข้อมูลสมมติหรือระบบจำลอง",
      privacy: "ตัวอย่างนโยบายถูกเขียนใหม่จากรูปแบบงานที่ไม่ระบุตัวตน ไม่มีชื่อผู้ให้บริการ URL รายชื่อผู้ใช้ รหัสภายใน หรือตัวเลขจากแหล่งข้อมูลจริง",
      impactButton: "ดู KPI ที่คาดการณ์",
      steps: ["ปัญหา", "ความต้องการ", "กระบวนการ AI", "การควบคุมโดยคน", "การวัดผล"],
      scenariosEyebrow: "สถานการณ์ตัวอย่าง",
      scenariosTitle: "4 เคสธุรกิจ กับ 4 ผลลัพธ์ที่ควบคุมได้",
      scenariosHint: "เลือกสถานการณ์เพื่อเติมโจทย์ลงใน Workflow",
      functionalDemo: "เดโมที่ทำงานได้",
      controlledOutcome: "ผลลัพธ์ที่ควบคุม",
      businessValue: "คุณค่าทางธุรกิจ",
      openScenario: "เปิดสถานการณ์ในผู้ช่วยงานบริการลูกค้า →",
      jdTitle: "ความสอดคล้องกับรายละเอียดงาน",
      jd: [
        ["การวิเคราะห์ความต้องการ", "เปลี่ยนปัญหางานบริการลูกค้า การชำระเงิน การยืนยันตัวตน และความเสี่ยง ให้เป็นประเภทคำขอ กฎ หลักฐานที่ต้องใช้ และเกณฑ์การส่งต่อ"],
        ["การเชื่อมต่อระบบตั้งแต่ต้นจนจบ", "เชื่อมแชต การยืนยันลูกค้า การค้นข้อมูลแบบผสม เครื่องมือที่มีขอบเขต ระบบหลังบ้าน การส่งต่อ และการวิเคราะห์ผล"],
        ["AI Agent และ RAG", "ใช้การค้นข้อมูลที่ตรวจสอบย้อนหลังได้ การอ้างอิง การตรวจว่าคำตอบมีหลักฐาน กฎความปลอดภัย และจำกัดจำนวนครั้งที่เรียกใช้เครื่องมือ"],
        ["การพัฒนาความสามารถทีม", "เปิดให้ทีมเห็นกฎพฤติกรรม ร่องรอยการทำงาน สถานการณ์ และผู้รับผิดชอบ เพื่อให้ฝ่ายปฏิบัติการกำกับและเรียนรู้ได้"],
        ["การส่งมอบคุณค่าและการวัดผล", "กำหนดเป้าหมายโครงการนำร่องและแผนวัดผล โดยไม่อ้างค่าคาดการณ์ว่าเป็นผลลัพธ์จากระบบใช้งานจริง"],
      ],
    },
    scenarios: [
      { area: "CS", title: "ตรวจสิทธิ์โปรโมชันและเงื่อนไขการถอน", message: "สำหรับโปรโมชัน Starter Match แบบจำลอง ผมกดเข้าร่วมก่อนฝากครั้งแรก ต้องตรวจสอบสิทธิ์ Turnover เกมที่ใช้ได้ และเพดานถอนอะไรบ้าง", outcome: "ค้นตารางสิทธิ์และตารางตัดสินใจถอนแบบจำลอง แล้วอธิบายเงื่อนไขที่เกี่ยวข้องพร้อมแหล่งอ้างอิง", value: "เปลี่ยนการค้นนโยบายที่ยาวและผิดพลาดง่ายให้เป็นคำตอบที่สม่ำเสมอ โดยยังส่งข้อยกเว้นให้คนตรวจ" },
      { area: "PAYMENT", title: "รายการถอนล่าช้า", message: "รายการถอน WDL-2001 ของฉันอยู่ระหว่างดำเนินการมานานแล้ว", outcome: "ยืนยันผู้ใช้ ตรวจระบบหลังบ้านตามขอบเขตบัญชี แล้วอธิบายสถานะหรือส่งต่อ", value: "ลดการสลับหลายระบบและให้ทีมได้รับข้อมูลเคสที่ครบและตรวจสอบย้อนหลังได้" },
      { area: "KYC", title: "อัปเดตเอกสารยืนยันตัวตน", message: "หนังสือเดินทางของฉันหมดอายุ ต้องอัปเดตเอกสารยืนยันตัวตนอย่างไร", outcome: "จัดเป็นข้อมูลส่วนบุคคลอ่อนไหวและส่งให้คนตรวจ โดยไม่รับเอกสารผ่านแชต", value: "ปกป้องข้อมูลส่วนบุคคลและคงการตัดสินใจที่มีกฎกำกับไว้กับผู้มีอำนาจ" },
      { area: "RISK", title: "รายการที่ไม่ได้ทำ", message: "บัญชีเกมของฉันมีรายการที่ฉันไม่ได้ทำ", outcome: "จัดเป็นความเสี่ยงสูงและบังคับส่งต่อแบบมีขอบเขต แทนการตอบอัตโนมัติ", value: "เร่งจัดลำดับเคสที่อาจเกี่ยวกับ Fraud พร้อมเก็บหลักฐาน เหตุผล และผู้รับผิดชอบ" },
    ],
    impact: {
      eyebrow: "เป้าหมายโครงการนำร่องโดยประมาณ — ไม่ใช่ผลลัพธ์จากระบบใช้งานจริง",
      title: "ผลกระทบทางธุรกิจและแผนการวัดผล",
      badge: "ต้องพิสูจน์ในโครงการนำร่อง",
      intro: "ช่วงตัวเลขเหล่านี้เป็นสมมติฐานสำหรับวางแผนกำลังงาน ต้องเก็บค่าฐานจากข้อมูลจริงและพิสูจน์ด้วยโครงการนำร่องแบบควบคุม ก่อนตัดสินใจเรื่องจำนวนคนหรือผลตอบแทนจากการลงทุน",
      metrics: [["อัตรารับเคสทั่วไปโดย AI", "40–60%", "เริ่มเฉพาะประเภทคำขอความเสี่ยงต่ำที่มีเอกสารครบ"], ["เวลาตอบครั้งแรก", "< 15 วินาที", "สำหรับเคสที่ AI ดูแลในช่วงโครงการนำร่อง"], ["คำตอบที่มีหลักฐานจากฐานความรู้", "> 90%", "วัดบนชุดทดสอบที่ติดป้ายและอยู่ในขอบเขต"], ["อัตราตรวจจับครบถ้วนของการส่งต่อเคสเสี่ยงสูง", "> 95%", "ให้ความปลอดภัยสำคัญกว่าขอบเขตงานอัตโนมัติ"], ["เวลาค้นหาข้อมูลด้วยคน", "ลด 30–50%", "เปรียบเทียบเวลาจัดการเคสก่อนและหลังใช้ผู้ช่วย AI"], ["ต้นทุนต่อเคสที่แก้ได้", "ลด 15–30%", "ตรวจหลังผ่านเกณฑ์คุณภาพและความพึงพอใจของลูกค้า"]],
      estimate: "ค่าประมาณ",
      confidenceTitle: "ความมั่นใจของ AI และเส้นทางการส่งต่อ",
      confidenceIntro: "ความมั่นใจในที่นี้คือผลจากนโยบายที่ตรวจสอบได้ โดยดูคุณภาพหลักฐาน กฎประเภทคำขอและความเสี่ยง รวมถึงบริบทที่จำเป็น ไม่ใช่เปอร์เซ็นต์ที่โมเดลแต่งขึ้น",
      confidenceSteps: [["หลักฐานชัดเจน", "ตอบ", "เอกสารเกี่ยวข้องผ่านเกณฑ์ตรวจหลักฐาน และไม่มีกฎบังคับให้คนตรวจ"], ["บริบทไม่ครบ", "ถามเพิ่ม", "ขอข้อมูลขั้นต่ำที่ปลอดภัย ไม่เดาหรือสร้างเคสก่อนเวลา"], ["หลักฐานอ่อน / ความเสี่ยงสูง", "ส่งต่อ", "สร้างชุดส่งต่อให้คนตรวจพร้อมเหตุผลและร่องรอยการทำงาน"]],
      step: "ขั้นตอน",
      rollout: [["1", "เก็บค่าฐาน", "ปริมาณเคส เวลาจัดการ อัตราแก้จบ ความพึงพอใจ และเหตุผลการส่งต่อ"], ["2", "ประเมินผลแบบออฟไลน์", "ชุดเคสติดป้ายสำหรับการจัดเส้นทาง การค้นข้อมูล และความปลอดภัย"], ["3", "ทดลองแบบเงา", "AI ให้คำแนะนำ โดยพนักงานยังเป็นผู้ตัดสินใจ"], ["4", "เปิดใช้งานแบบควบคุม", "ขยายเมื่อผ่านเกณฑ์คุณภาพเท่านั้น"]],
    },
    confidencePanel: { title: "ความมั่นใจของหลักฐาน → การตัดสินใจตามนโยบาย", intro: "Groundedness เป็นสัญญาณของ Prototype ที่ตรวจสอบได้ ไม่ใช่ความน่าจะเป็นจากโมเดล", evidence: "หลักฐาน", review: "ส่งให้คนตรวจ", clarify: "ถามเพิ่ม", respond: "ตอบอัตโนมัติ", escalateTag: "ส่งต่อ" },
  },
  zh: {
    modules: {
      overview: ["面试概览", "与岗位要求对齐、讲解路径及四个 iGaming 场景"],
      impact: ["商业价值与 KPI", "预计目标、衡量计划与透明边界"],
    },
    overview: {
      eyebrow: "3 分钟面试讲解路径",
      title: "从 iGaming 运营问题到可衡量的 AI 工作流",
      intro: "此功能原型展示我如何分析需求、约束 AI 决策、集成运营系统并衡量商业价值。所有客户、交易、文档和集成都为虚构或模拟数据。",
      privacy: "领域政策示例由匿名化运营模式重新编写，不包含真实运营商名称、URL、用户列表、内部 ID 或源数据数值。",
      impactButton: "查看预计 KPI",
      steps: ["问题", "需求", "AI 工作流", "人工控制", "衡量"],
      scenariosEyebrow: "场景演示",
      scenariosTitle: "四个业务场景，四种受控结果",
      scenariosHint: "选择场景并预填到实时工作流",
      functionalDemo: "功能演示",
      controlledOutcome: "受控结果",
      businessValue: "商业价值",
      openScenario: "在客服助手中打开场景 →",
      jdTitle: "岗位要求对齐",
      jd: [["需求分析", "将 CS、支付、KYC 和风险痛点转化为意图、规则、证据需求和转人工标准。"], ["端到端集成", "连接聊天、客户验证、混合检索、受限工具、后台适配器、转交和分析。"], ["AI Agents / RAG", "采用可追踪检索、引用、Groundedness 检查、确定性安全策略和工具调用上限。"], ["团队赋能", "公开行为规则、执行轨迹、场景和改进负责人，让运营团队能够治理和学习。"], ["价值交付与衡量", "定义试点目标和衡量计划，不将预计数字描述为生产结果。"]],
    },
    scenarios: [
      { area: "CS", title: "促销资格与提款规则", message: "对于虚构的 Starter Match 活动，我在首次存款前已选择参加。需要检查哪些资格、流水、游戏范围和提款上限规则？", outcome: "检索虚构的资格矩阵和提款决策表，并引用来源说明适用规则。", value: "将冗长且易出错的政策查询转化为一致答案，同时保留例外人工审核。" },
      { area: "PAYMENT", title: "延迟提款", message: "我的提款 WDL-2001 长时间处于处理中。", outcome: "验证用户、查询账户范围内的后台适配器，然后解释状态或转人工。", value: "减少系统切换，并为员工提供完整且可审计的案例上下文。" },
      { area: "KYC", title: "身份文件更新", message: "我的护照已过期，应该如何更新身份文件？", outcome: "将其识别为敏感身份处理并转人工审核，不在聊天中收集文件。", value: "保护个人数据，并将受监管决策保留给授权人员。" },
      { area: "RISK", title: "未经本人操作的交易", message: "我的游戏账户中出现了一笔不是我操作的交易。", outcome: "高风险分类触发强制且有边界的人工转交，而不是自动回答。", value: "优先处理潜在欺诈，同时保留证据、原因和负责人。" },
    ],
    impact: {
      eyebrow: "预计试点目标——估算值，并非生产结果",
      title: "商业价值与衡量计划",
      badge: "需在试点中验证",
      intro: "这些范围仅用于容量规划假设。必须先从真实流量建立基线，再通过受控试点验证，才能用于人员配置或 ROI 决策。",
      metrics: [["常规咨询自动承接率", "40–60%", "仅从文档完整、低风险的意图开始"], ["首次响应时间", "< 15 秒", "适用于试点期间由 AI 处理的请求"], ["知识依据回答率", "> 90%", "在已标注且范围内的评估集上衡量"], ["高风险转人工召回率", "> 95%", "安全优先于自动化覆盖率"], ["人工搜索时间", "减少 30–50%", "比较使用 Copilot 前后的处理时间"], ["每个已解决联系的成本", "减少 15–30%", "仅在质量和 CSAT 护栏通过后验证"]],
      estimate: "预计值",
      confidenceTitle: "AI 置信与转人工流程",
      confidenceIntro: "此处的“置信”是基于证据质量、意图/风险规则和必要上下文的可审计政策结果，而不是虚构的模型概率。",
      confidenceSteps: [["证据充分", "回答", "相关来源通过 Groundedness 检查，且没有政策要求人工审核。"], ["上下文不足", "澄清", "仅请求最少的安全信息；不猜测，也不过早创建案例。"], ["证据不足 / 高风险", "转人工", "创建包含原因和轨迹的结构化人工审核转交。"]],
      step: "步骤",
      rollout: [["1", "基线", "咨询量、AHT、FCR、CSAT 和转交原因"], ["2", "离线评估", "用于路由、检索和安全性的标注案例"], ["3", "影子试点", "AI 提供建议，员工保留控制权"], ["4", "受控上线", "只有在质量护栏通过后才扩大范围"]],
    },
    confidencePanel: { title: "证据置信度 → 政策动作", intro: "Groundedness 是可审计的原型信号，不是模型概率。", evidence: "证据", review: "人工审核", clarify: "澄清", respond: "自动回答", escalateTag: "转人工" },
  },
} as const;

export function Studio() {
  const { locale, setLocale, copy } = useUiLocale();
  const interviewCopy = interviewUiCopy[locale];
  const modules = moduleIds.map((id, index) => ({
    id,
    number: String(index + 1).padStart(2, "0"),
    label: id === "overview" ? interviewCopy.modules.overview[0] : id === "impact" ? interviewCopy.modules.impact[0] : id === "agent" ? locale === "th" ? "ผู้ช่วย AI แบบวางแผน" : locale === "zh" ? "智能代理助手" : copy.modules[moduleCopyIndex[id]][0] : id === "settings" ? locale === "th" ? "ตั้งค่าพฤติกรรม AI" : locale === "zh" ? "AI 行为设置" : "AI Behavior Settings" : id === "analytics" ? locale === "th" ? "วิเคราะห์ปัญหาลูกค้า" : locale === "zh" ? "客户问题分析" : "Support Analytics" : copy.modules[moduleCopyIndex[id]][0],
    description: id === "overview" ? interviewCopy.modules.overview[1] : id === "impact" ? interviewCopy.modules.impact[1] : id === "settings" ? locale === "th" ? "บทบาท น้ำเสียง หลักคิด และกฎความปลอดภัย" : locale === "zh" ? "角色、语气、原则与安全规则" : "Role, tone, principles, and safety rules" : id === "analytics" ? locale === "th" ? "รายวัน รายสัปดาห์ รายเดือน และทีมที่ต้องปรับปรุง" : locale === "zh" ? "每日、每周、每月趋势与改进负责人" : "Daily, weekly, monthly trends and improvement owners" : copy.modules[moduleCopyIndex[id]][1],
  }));
  const [active, setActive] = useState<Module>("overview");
  const [view, setView] = useState<"customer" | "internal">("internal");
  const [supportScenario, setSupportScenario] = useState<{ id: number; message: string } | null>(null);
  const viewLabels = locale === "th"
    ? { customer: "แชตลูกค้าออนไลน์", internal: "ระบบการทำงานภายใน", customerTitle: "บริการลูกค้าออนไลน์", customerIntro: "สอบถามเรื่องฝากเงิน ถอนเงิน โปรโมชั่น หรือปัญหาเกมได้ที่นี่" }
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
            {active === "overview" ? (
              <InterviewOverview
                locale={locale}
                onOpenScenario={(message) => {
                  setSupportScenario({ id: Date.now(), message });
                  setActive("support");
                }}
                onOpenImpact={() => setActive("impact")}
              />
            ) : active === "support" ? (
              <SupportDemo key={supportScenario?.id ?? 0} locale={locale} scenarioRequest={supportScenario} />
            ) : active === "knowledge" ? (
              <KnowledgeDemo locale={locale} />
            ) : active === "workflow" ? (
              <WorkflowDemo locale={locale} />
            ) : active === "agent" ? (
              <AgentDemo locale={locale} />
            ) : active === "analytics" ? (
              <SupportAnalyticsDemo locale={locale} />
            ) : active === "impact" ? (
              <BusinessImpactDemo locale={locale} />
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

function InterviewOverview({
  locale,
  onOpenScenario,
  onOpenImpact,
}: {
  locale: UiLocale;
  onOpenScenario: (message: string) => void;
  onOpenImpact: () => void;
}) {
  const content = interviewUiCopy[locale];
  const overview = content.overview;

  return (
    <div className="space-y-7">
      <section className="rounded-2xl border border-accent/25 bg-gradient-to-br from-accent/10 to-transparent p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <p className="font-mono text-[10px] uppercase tracking-[.2em] text-accent">{overview.eyebrow}</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{overview.title}</h2>
            <p className="mt-3 text-sm leading-6 text-muted">{overview.intro}</p>
            <p className="mt-2 text-xs leading-5 text-accent-secondary">{overview.privacy}</p>
          </div>
          <button type="button" onClick={onOpenImpact} className="kb-focusable min-h-[42px] rounded-lg bg-accent px-4 text-sm font-semibold text-[#07101F]">{overview.impactButton}</button>
        </div>
        <div className="mt-5 grid gap-2 sm:grid-cols-5">
          {overview.steps.map((step, index) => (
            <div key={step} className="rounded-lg border border-white/10 bg-black/15 p-3">
              <p className="font-mono text-[10px] text-accent">0{index + 1}</p>
              <p className="mt-1 text-xs font-medium text-foreground">{step}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between gap-3">
          <div><p className="font-mono text-[10px] uppercase tracking-wider text-accent">{overview.scenariosEyebrow}</p><h3 className="mt-1 text-lg font-semibold text-foreground">{overview.scenariosTitle}</h3></div>
          <p className="hidden text-xs text-muted sm:block">{overview.scenariosHint}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {content.scenarios.map((scenario) => (
            <article key={scenario.area} className="rounded-xl border border-white/10 bg-black/10 p-4">
              <div className="flex items-center justify-between gap-3"><span className="rounded bg-accent/15 px-2 py-1 font-mono text-[10px] font-semibold text-accent">{scenario.area}</span><span className="text-[10px] uppercase tracking-wider text-muted">{overview.functionalDemo}</span></div>
              <h4 className="mt-3 text-sm font-semibold text-foreground">{scenario.title}</h4>
              <p className="mt-2 text-xs leading-5 text-muted"><span className="text-foreground">{overview.controlledOutcome}:</span> {scenario.outcome}</p>
              <p className="mt-2 text-xs leading-5 text-muted"><span className="text-foreground">{overview.businessValue}:</span> {scenario.value}</p>
              <button type="button" onClick={() => onOpenScenario(scenario.message)} className="kb-focusable mt-4 min-h-[38px] w-full rounded-lg border border-accent/25 bg-accent/5 px-3 text-xs font-semibold text-accent transition hover:bg-accent/10">{overview.openScenario}</button>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-white/10 bg-[#07101F] p-5">
        <p className="font-mono text-[10px] uppercase tracking-wider text-accent">{overview.jdTitle}</p>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {overview.jd.map(([title, detail], index) => (
            <div key={title} className={index === overview.jd.length - 1 ? "lg:col-span-2" : ""}>
              <p className="text-sm font-semibold text-foreground">{title}</p>
              <p className="mt-1 text-xs leading-5 text-muted">{detail}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function BusinessImpactDemo({ locale }: { locale: UiLocale }) {
  const content = interviewUiCopy[locale].impact;
  return (
    <div className="space-y-7">
      <section className="rounded-2xl border border-warning/25 bg-warning/5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-mono text-[10px] uppercase tracking-wider text-warning">{content.eyebrow}</p><h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{content.title}</h2></div><span className="rounded-full border border-warning/30 px-3 py-1 text-xs font-semibold text-warning">{content.badge}</span></div>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">{content.intro}</p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {content.metrics.map(([label, value, note]) => (
          <article key={label} className="rounded-xl border border-white/10 bg-black/10 p-4">
            <p className="font-mono text-xl font-semibold text-accent-secondary">{value}</p>
            <p className="mt-2 text-sm font-semibold text-foreground">{label}</p>
            <p className="mt-1 text-xs leading-5 text-muted">{note}</p>
            <p className="mt-3 font-mono text-[9px] uppercase tracking-wider text-warning">{content.estimate}</p>
          </article>
        ))}
      </section>

      <section className="rounded-xl border border-white/10 bg-[#07101F] p-5">
        <p className="font-mono text-[10px] uppercase tracking-wider text-accent">{content.confidenceTitle}</p>
        <p className="mt-2 text-xs leading-5 text-muted">{content.confidenceIntro}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {content.confidenceSteps.map(([signal, action, detail], index) => (
            <div key={signal} className="rounded-xl border border-white/10 bg-black/15 p-4">
              <div className="flex items-center justify-between"><span className="font-mono text-[10px] text-muted">0{index + 1}</span><span className={`rounded px-2 py-1 font-mono text-[10px] font-semibold ${index === 0 ? "bg-success/15 text-success" : index === 1 ? "bg-accent/15 text-accent" : "bg-warning/15 text-warning"}`}>{action}</span></div>
              <p className="mt-3 text-sm font-semibold text-foreground">{signal}</p><p className="mt-1 text-xs leading-5 text-muted">{detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-4">
        {content.rollout.map(([num, title, detail]) => <div key={num} className="rounded-xl border border-white/10 p-4"><p className="font-mono text-[10px] text-accent">{content.step} {num}</p><p className="mt-2 text-sm font-semibold text-foreground">{title}</p><p className="mt-1 text-xs leading-5 text-muted">{detail}</p></div>)}
      </section>
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
  learning: {
    aiResolvedCases: number;
    employeeReviewCases: number;
    recentCases: Array<{ caseId: string; occurredAt: string; issue: string; risk: string; resolutionPath: "AI_RESOLVED" | "EMPLOYEE_REVIEW"; reasonCode: string; destination: string; groundednessScore: number; knowledgeSourceIds: string[]; toolsUsed: string[]; improvementSignal: string }>;
    improvementBacklog: Array<{ intent: string; issue: string; aiResolvedCount: number; employeeReviewCount: number; reviewRate: number; owner: string; recommendation: string }>;
  };
};

type ChatHistoryTurn = {
  id: string;
  occurredAt: string;
  userMessage: string;
  assistantMessage: string;
  intent: string;
  risk: string;
  decision: string;
  language: string;
  groundednessScore: number;
  toolsUsed: string[];
  sourceIds: string[];
  handoffId: string | null;
  transactionStatus: string | null;
};
type ChatHistorySession = {
  id: string;
  startedAt: string;
  updatedAt: string;
  endedAt: string | null;
  status: "OPEN" | "ENDED";
  turnCount: number;
  primaryIntent: string;
  highestRisk: string;
  latestDecision: string;
  languages: string[];
  turns: ChatHistoryTurn[];
};
type ChatHistoryResult = {
  storageMode: "persistent-redis" | "local-memory";
  retentionDays: number;
  containsRedactedChatText: boolean;
  sessions: ChatHistorySession[];
};

function SupportAnalyticsDemo({ locale }: { locale: UiLocale }) {
  const [period, setPeriod] = useState<AnalyticsPeriod>("week");
  const [data, setData] = useState<AnalyticsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dispatchResult, setDispatchResult] = useState<{ reportId: string; recipients: string[]; status: string } | null>(null);
  const [dispatching, setDispatching] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatHistoryResult | null>(null);
  const [chatHistoryLoading, setChatHistoryLoading] = useState(true);
  const [chatHistoryError, setChatHistoryError] = useState("");
  const labels = locale === "th" ? {
    title: "วิเคราะห์ปัญหาลูกค้า", intro: "สรุปเหตุการณ์เพื่อดูแนวโน้ม ตรวจสอบเคสทดสอบ และส่งข้อมูลปรับปรุงให้ทีมที่เกี่ยวข้อง", day: "วันนี้", week: "7 วัน", month: "30 วัน", interactions: "การติดต่อทั้งหมด", auto: "AI แก้ได้เอง", escalated: "ส่งต่อพนักงาน", automation: "อัตราที่ AI แก้ได้", topIssue: "ปัญหาที่พบมากที่สุด", trend: "แนวโน้มจำนวนปัญหา", breakdown: "ปัญหาและสัดส่วน", owner: "ทีมที่เกี่ยวข้อง", action: "ข้อเสนอแนะเพื่อปรับปรุง", learningLog: "ทะเบียนเคสเพื่อพัฒนา AI", resolved: "AI แก้ได้เอง", employee: "ต้องส่งต่อพนักงาน", reason: "เหตุผล/สัญญาณพัฒนา", backlog: "รายการที่ควรนำไปปรับปรุงระบบ", send: "ส่งรายงานจำลอง", sending: "กำลังจัดทำรายงาน...", sent: "สร้างรายงานและเข้าคิวเรียบร้อย", privacy: "สถิติไม่เก็บข้อมูลระบุตัวลูกค้า ส่วนประวัติแชตเก็บเฉพาะข้อความทดสอบที่ผ่านการปิดบังข้อมูลอ่อนไหว", simulated: "ข้อมูลจำลอง + เหตุการณ์จากเดโม", noData: "ยังไม่มีข้อมูลในช่วงเวลานี้",
  } : locale === "zh" ? {
    title: "客户问题分析", intro: "汇总事件趋势、检查测试案例，并将改进信息分派给相关团队", day: "今天", week: "7 天", month: "30 天", interactions: "总咨询量", auto: "AI 已解决", escalated: "转人工审核", automation: "AI 解决率", topIssue: "最常见问题", trend: "问题趋势", breakdown: "问题分布", owner: "负责团队", action: "改进建议", learningLog: "AI 学习案例日志", resolved: "AI 已解决", employee: "需要人工审核", reason: "原因/改进信号", backlog: "系统改进清单", send: "发送模拟报告", sending: "正在生成报告...", sent: "报告已创建并进入队列", privacy: "分析数据不含客户身份；聊天记录仅保存经过敏感信息遮盖的测试消息", simulated: "模拟历史 + 演示事件", noData: "此期间暂无数据",
  } : {
    title: "Support Analytics", intro: "Summarized events for trend analysis, test-case review, and improvement routing to the responsible teams.", day: "Today", week: "7 days", month: "30 days", interactions: "Total interactions", auto: "AI resolved", escalated: "Employee review", automation: "AI resolution rate", topIssue: "Top issue", trend: "Issue-volume trend", breakdown: "Issue mix", owner: "Responsible team", action: "Improvement recommendation", learningLog: "Case-learning log", resolved: "AI resolved", employee: "Employee review", reason: "Reason / learning signal", backlog: "System-improvement backlog", send: "Dispatch simulated report", sending: "Preparing report...", sent: "Report created and queued", privacy: "Analytics excludes customer identifiers; chat history retains only test messages after sensitive-data redaction", simulated: "Demo history + live demo events", noData: "No events in this period",
  };

  const historyLabels = locale === "th" ? {
    title: "ประวัติแชตจากการทดสอบจริง",
    intro: "HR สามารถเปิดดูแต่ละ Session ตามลำดับข้อความ พร้อมผลการจำแนกและเส้นทางตัดสินใจของ AI ได้",
    refresh: "รีเฟรชประวัติ", loading: "กำลังโหลดประวัติแชต...", empty: "ยังไม่มีบทสนทนาที่บันทึกไว้ ลองทดสอบในหน้าแชตลูกค้าแล้วกลับมากดรีเฟรชค่ะ", customer: "ลูกค้า", assistant: "AI แอดมิน", open: "กำลังดำเนินการ", ended: "จบแชตแล้ว", turns: "รอบสนทนา", persistent: "เก็บถาวร", temporary: "เก็บชั่วคราว", retained: "เก็บข้อมูล 30 วัน · ปิดบังข้อมูลอ่อนไหวอัตโนมัติ", loadError: "โหลดประวัติแชตไม่สำเร็จ",
  } : locale === "zh" ? {
    title: "真实测试聊天记录",
    intro: "HR 可按消息顺序查看每个会话，以及 AI 的分类和决策路径",
    refresh: "刷新记录", loading: "正在加载聊天记录...", empty: "尚无已保存的会话。请先在客户聊天页面测试，然后刷新。", customer: "客户", assistant: "AI 客服", open: "进行中", ended: "已结束", turns: "轮对话", persistent: "持久保存", temporary: "临时保存", retained: "保留 30 天 · 自动遮盖敏感信息", loadError: "无法加载聊天记录",
  } : {
    title: "Live test chat history",
    intro: "HR can review each session in message order, including the AI classification and decision path.",
    refresh: "Refresh history", loading: "Loading chat history...", empty: "No saved conversations yet. Run a test in Customer Live Chat, then refresh.", customer: "Customer", assistant: "AI agent", open: "In progress", ended: "Ended", turns: "turns", persistent: "Persistent", temporary: "Temporary", retained: "Retained for 30 days · sensitive data redacted automatically", loadError: "Unable to load chat history",
  };

  async function loadChatHistory() {
    setChatHistoryLoading(true);
    setChatHistoryError("");
    try {
      const response = await fetch("/api/support/history?limit=30", { cache: "no-store" });
      if (!response.ok) throw new Error("History request failed");
      setChatHistory(await response.json() as ChatHistoryResult);
    } catch {
      setChatHistoryError(historyLabels.loadError);
    } finally {
      setChatHistoryLoading(false);
    }
  }

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

  useEffect(() => {
    let cancelled = false;
    fetch("/api/support/history?limit=30", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("History request failed");
        return response.json() as Promise<ChatHistoryResult>;
      })
      .then((result) => { if (!cancelled) setChatHistory(result); })
      .catch(() => { if (!cancelled) setChatHistoryError(historyLabels.loadError); })
      .finally(() => { if (!cancelled) setChatHistoryLoading(false); });
    return () => { cancelled = true; };
    // historyLabels is derived exclusively from locale.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

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

        <section className="overflow-hidden rounded-xl border border-white/10 bg-black/10">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3"><p className="font-mono text-[10px] uppercase tracking-wider text-accent">{labels.learningLog}</p><div className="flex gap-2 text-[10px]"><span className="rounded-full border border-success/20 bg-success/5 px-2 py-1 text-success">{labels.resolved} {data.learning.aiResolvedCases}</span><span className="rounded-full border border-warning/20 bg-warning/5 px-2 py-1 text-warning">{labels.employee} {data.learning.employeeReviewCases}</span></div></div>
          <div className="max-h-72 divide-y divide-white/10 overflow-y-auto">{data.learning.recentCases.map((item) => <div key={item.caseId} className="grid gap-2 px-4 py-3 text-xs md:grid-cols-[1fr_1.2fr_1fr_2fr]"><div><p className="font-mono text-[10px] text-muted">{item.caseId}</p><p className="mt-1 text-foreground">{item.issue}</p></div><span className={item.resolutionPath === "AI_RESOLVED" ? "text-success" : "text-warning"}>{item.resolutionPath === "AI_RESOLVED" ? labels.resolved : labels.employee}</span><span className="font-mono text-[10px] text-muted">{item.reasonCode}<br />grounded {Math.round(item.groundednessScore * 100)}%</span><span className="leading-5 text-muted">{item.improvementSignal}</span></div>)}</div>
        </section>

        <section className="rounded-xl border border-warning/15 bg-warning/5 p-4">
          <p className="font-mono text-[10px] uppercase tracking-wider text-warning">{labels.backlog}</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">{data.learning.improvementBacklog.slice(0, 6).map((item) => <div key={item.intent} className="rounded-lg border border-white/10 bg-black/10 p-3 text-xs"><div className="flex justify-between gap-3"><span className="font-medium text-foreground">{item.issue}</span><span className="font-mono text-warning">{item.employeeReviewCount} / {item.aiResolvedCount + item.employeeReviewCount}</span></div><p className="mt-2 text-accent-secondary">{item.owner}</p><p className="mt-1 leading-5 text-muted">{item.recommendation}</p></div>)}</div>
        </section>

        <section className="overflow-hidden rounded-xl border border-accent/20 bg-black/10">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 p-4">
            <div>
              <p className="font-semibold text-foreground">{historyLabels.title}</p>
              <p className="mt-1 max-w-3xl text-xs leading-5 text-muted">{historyLabels.intro}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {chatHistory && <span className={`rounded-full border px-2.5 py-1 font-mono text-[10px] ${chatHistory.storageMode === "persistent-redis" ? "border-success/25 bg-success/5 text-success" : "border-warning/25 bg-warning/5 text-warning"}`}>{chatHistory.storageMode === "persistent-redis" ? historyLabels.persistent : historyLabels.temporary}</span>}
              <button type="button" onClick={() => void loadChatHistory()} disabled={chatHistoryLoading} className="kb-focusable min-h-[36px] rounded-lg border border-white/10 px-3 text-xs text-muted hover:text-foreground disabled:opacity-50">{historyLabels.refresh}</button>
            </div>
          </div>
          <div className="px-4 py-3 text-[10px] text-muted">{historyLabels.retained}</div>
          {chatHistoryLoading ? <div className="p-6 text-center text-sm text-muted">{historyLabels.loading}</div> : chatHistoryError ? <div className="p-4 text-sm text-error">{chatHistoryError}</div> : !chatHistory?.sessions.length ? <div className="p-6 text-center text-sm text-muted">{historyLabels.empty}</div> : <div className="max-h-[42rem] divide-y divide-white/10 overflow-y-auto">
            {chatHistory.sessions.map((session) => <details key={session.id} className="group p-4" open={chatHistory.sessions.length === 1}>
              <summary className="kb-focusable cursor-pointer list-none rounded-lg text-xs">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div><p className="font-mono text-[11px] text-accent">{session.id}</p><p className="mt-1 text-muted">{new Date(session.startedAt).toLocaleString(locale === "th" ? "th-TH" : locale === "zh" ? "zh-CN" : "en-US")} · {session.turnCount} {historyLabels.turns} · {session.primaryIntent}</p></div>
                  <span className={`rounded-full px-2 py-1 text-[10px] ${session.status === "OPEN" ? "bg-success/10 text-success" : "bg-white/5 text-muted"}`}>{session.status === "OPEN" ? historyLabels.open : historyLabels.ended}</span>
                </div>
              </summary>
              <div className="mt-4 space-y-3">{session.turns.map((turn) => <div key={turn.id} className="rounded-lg border border-white/10 bg-[#07101F] p-3">
                <div className="space-y-3 text-xs leading-5"><div><span className="font-semibold text-accent">{historyLabels.customer}</span><p className="mt-1 whitespace-pre-wrap text-foreground">{turn.userMessage}</p></div><div><span className="font-semibold text-success">{historyLabels.assistant}</span><p className="mt-1 whitespace-pre-wrap text-muted">{turn.assistantMessage}</p></div></div>
                <div className="mt-3 flex flex-wrap gap-1.5 font-mono text-[9px] text-muted"><span className="rounded bg-white/5 px-2 py-1">intent: {turn.intent}</span><span className="rounded bg-white/5 px-2 py-1">risk: {turn.risk}</span><span className="rounded bg-white/5 px-2 py-1">decision: {turn.decision}</span><span className="rounded bg-white/5 px-2 py-1">grounded: {Math.round(turn.groundednessScore * 100)}%</span>{turn.toolsUsed.map((tool) => <span key={tool} className="rounded bg-accent/5 px-2 py-1 text-accent-secondary">{tool}</span>)}</div>
              </div>)}</div>
            </details>)}
          </div>}
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

function SupportDemo({
  locale,
  customerView = false,
  scenarioRequest = null,
}: {
  locale: UiLocale;
  customerView?: boolean;
  scenarioRequest?: { id: number; message: string } | null;
}) {
  const copy = uiCopy[locale];
  const confidenceCopy = interviewUiCopy[locale].confidencePanel;
  const localizedScenarios = copy.scenarios.map(([label, message], index) => ({
    label: `${index + 1} · ${label}`,
    message,
  }));
  const [message, setMessage] = useState(scenarioRequest?.message ?? "");
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
    await Promise.all([
      fetch("/api/support/customer", { method: "DELETE" }).catch(() => null),
      fetch("/api/support/history", { method: "DELETE" }).catch(() => null),
    ]);
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

  async function startNewConversation() {
    await fetch("/api/support/history", { method: "DELETE" }).catch(() => null);
    clearConversation();
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
            onClick={() => void startNewConversation()}
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
                {entry.decision === "ESCALATE" ? confidenceCopy.escalateTag : confidenceCopy.respond}
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
                {result.trace.decision === "ESCALATE" ? confidenceCopy.escalateTag : confidenceCopy.respond}
              </span>}
              {result.answer}
            </div>

            {!customerView && (
              <div className="grid gap-2 rounded-xl border border-white/10 bg-[#07101F] p-3 sm:grid-cols-[1fr_auto_auto] sm:items-center">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-muted">{confidenceCopy.title}</p>
                  <p className="mt-1 text-xs text-muted">{confidenceCopy.intro}</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-black/15 px-3 py-2 text-xs">
                  <span className="text-muted">{confidenceCopy.evidence} </span>
                  <span className={result.trace.verifier.grounded ? "font-semibold text-success" : "font-semibold text-warning"}>
                    {result.trace.verifier.applicable ? `${Math.round(result.trace.verifier.groundednessScore * 100)}%` : "N/A"}
                  </span>
                </div>
                <div className={`rounded-lg px-3 py-2 text-center font-mono text-[10px] font-semibold ${result.trace.decision === "ESCALATE" ? "bg-warning/15 text-warning" : result.clarificationRequired ? "bg-accent/15 text-accent" : "bg-success/15 text-success"}`}>
                  {result.trace.decision === "ESCALATE" ? confidenceCopy.review : result.clarificationRequired ? confidenceCopy.clarify : confidenceCopy.respond}
                </div>
              </div>
            )}

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
