"use client";

import { useEffect, useState } from "react";

export type UiLocale = "en" | "th" | "zh";

export const uiCopy = {
  en: {
    subtitle: "Personal portfolio prototype",
    live: "Live AI · server-side key",
    safe: "Safe demo · no key required",
    signOut: "Sign out",
    eyebrow: "Applied AI · Operations",
    hero: "From messy work to clear, auditable flow.",
    intro:
      "A privacy-safe demonstration of AI implementation: route tasks to tools, retrieve grounded answers, and automate support decisions.",
    interactive: "Interactive portfolio demo",
    prototype: "Prototype",
    footer:
      "Built as a personal portfolio prototype. No client or employer data.",
    modules: [
      ["AI Chat", "Tool routing"],
      ["Knowledge Base", "Grounded retrieval"],
      ["Workflow", "Policy automation"],
      ["Agentic Copilot", "Plan → act → verify"],
      ["Support Copilot", "Auto-respond or escalate"],
    ],
    stats: [
      ["5", "modules"],
      ["100%", "sample data"],
      ["0", "real records"],
    ],
    chatTitle: "Operations assistant",
    chatDefault: "What is the response target for a high-severity incident?",
    chatIntro:
      "Ask about sample policies, preview a request workflow, or check retrieval evaluation.",
    chatSuggestions: [
      "What is the expense claim deadline?",
      "Create a high-priority equipment workflow",
      "Show the retrieval evaluation score",
    ],
    empty: "Choose an example or enter your own question.",
    documentsFictional: "All documents and requests are fictional.",
    reviewing: "Reviewing the request…",
    traceLink: "View sources and technical trace",
    askPlaceholder: "Ask about a sample policy or workflow…",
    ask: "Ask assistant",
    search: "Search",
    knowledgeQuery: "When should an expense claim be submitted?",
    sampleDocuments: "Sample documents",
    groundedAnswer: "Grounded answer",
    runQuery: "Run a query to retrieve an answer with citations and metrics.",
    citations: "Retrieval citations",
    evaluation: "Evaluation",
    topAccuracy: "Top-1 accuracy",
    itemsReviewed: "items reviewed",
    executionMode: "Execution mode",
    sourceLanguage: "Source documents are in English",
    requester: "Requester",
    requestType: "Request type",
    priority: "Priority",
    justification: "Business justification",
    workflowDetails: "Access required for the sample analytics project.",
    runWorkflow: "Run workflow",
    executionTrace: "Execution trace",
    submitWorkflow:
      "Submit the sample request to view validation, routing, policy, and notification steps.",
    agentTitle: "Bounded Planner → Tool Execution → Verifier",
    agentIntro:
      "The planner selects up to three tools, executes them, and verifies retrieved evidence. It is bounded and deterministic—not an autonomous production agent.",
    agentEmpty: "Choose a scenario or ask your own question.",
    planning: "Planning → executing → verifying…",
    plan: "Plan",
    noTool: "No tool matched; deterministic fallback returned.",
    supportingSources: "Supporting sources",
    notApplicable: "Not applicable to this response.",
    heuristic: "This heuristic does not guarantee factual correctness.",
    agentPlaceholder: "Ask the copilot a question…",
    runCopilot: "Run copilot",
    loginSubtitle: "Password-gated portfolio demo",
    loginTitle: "Enter demo access",
    loginIntro:
      "This prototype uses a shared demo password and contains only fictional, domain-neutral sample content.",
    password: "Demo password",
    passwordPlaceholder: "Enter the demo password",
    checking: "Checking…",
    unlock: "Unlock demo",
    loginFooter: "Portfolio review access — not production authentication.",
    loginError: "Unable to sign in. Please try again.",
    networkError: "Network error. Please try again.",
    supportTitle: "Agentic Customer Support Copilot",
    supportIntro:
      "Designed to target up to 80–90% automation of repetitive, low-risk inquiries when the knowledge base is sufficiently complete, validated, and maintained.",
    supportLimit:
      "A controlled-pilot target, not a production guarantee. Complex, sensitive, disputed, or high-risk cases remain with human agents.",
    supportEmpty: "Choose a scenario or ask your own support question.",
    fictional: "All customers, requests, and documents are fictional.",
    processing: "Classifying → retrieving → verifying → deciding…",
    placeholder: "Ask a customer-support question…",
    run: "Run support copilot",
    running: "Running…",
    trace: "Execution trace",
    intent: "Intent",
    risk: "Risk",
    reason: "Escalation reason",
    tools: "Tool calls",
    sources: "Retrieved sources",
    verifier: "Verifier",
    usage: "Estimated usage",
    language: "Language",
    scenarios: [
      ["FAQ", "How do I create a new account?"],
      ["Troubleshooting", "The product won't load, what should I do?"],
      ["Policy with citations", "Can I get a refund if I cancel this month?"],
      ["Product vision", "Why was this system built?"],
      ["Roadmap", "How far could this platform be developed in the future?"],
      [
        "Insufficient evidence",
        "Do you support hardware security key multi-factor authentication?",
      ],
      [
        "Financial dispute",
        "I was charged twice and want to dispute the unauthorized charge.",
      ],
      [
        "Angry complaint",
        "This is unacceptable and I will report this publicly.",
      ],
    ],
  },
  th: {
    subtitle: "ต้นแบบผลงานส่วนตัว",
    live: "AI ใช้งานจริง · คีย์ฝั่งเซิร์ฟเวอร์",
    safe: "เดโมปลอดภัย · ไม่ต้องใช้คีย์",
    signOut: "ออกจากระบบ",
    eyebrow: "AI ประยุกต์ · งานปฏิบัติการ",
    hero: "เปลี่ยนงานที่ซับซ้อนให้เป็นกระบวนการที่ชัดเจนและตรวจสอบได้",
    intro:
      "เดโมการนำ AI ไปใช้โดยไม่เปิดเผยข้อมูลจริง: เลือกเครื่องมือ ค้นคำตอบที่มีหลักฐาน และตัดสินใจงานบริการลูกค้าอย่างปลอดภัย",
    interactive: "เดโมผลงานแบบโต้ตอบ",
    prototype: "ต้นแบบ",
    footer: "ผลงานต้นแบบส่วนตัว ไม่มีข้อมูลลูกค้าหรือนายจ้าง",
    modules: [
      ["แชต AI", "เลือกใช้เครื่องมือ"],
      ["ฐานความรู้", "ค้นคำตอบพร้อมหลักฐาน"],
      ["เวิร์กโฟลว์", "กฎและระบบอัตโนมัติ"],
      ["Agentic Copilot", "วางแผน → ลงมือ → ตรวจสอบ"],
      ["ผู้ช่วยบริการลูกค้า", "ตอบอัตโนมัติหรือส่งต่อ"],
    ],
    stats: [
      ["5", "โมดูล"],
      ["100%", "ข้อมูลตัวอย่าง"],
      ["0", "ข้อมูลจริง"],
    ],
    chatTitle: "ผู้ช่วยงานปฏิบัติการ",
    chatDefault: "เหตุการณ์รุนแรงต้องได้รับการตอบสนองภายในเวลาเท่าไร",
    chatIntro:
      "ถามนโยบายตัวอย่าง ทดลองเวิร์กโฟลว์ หรือตรวจคะแนนการค้นคืนข้อมูล",
    chatSuggestions: [
      "เบิกค่าใช้จ่ายได้ภายในกี่วัน",
      "สร้างเวิร์กโฟลว์คำขออุปกรณ์เร่งด่วน",
      "แสดงคะแนนประเมินการค้นคืนข้อมูล",
    ],
    empty: "เลือกตัวอย่างหรือพิมพ์คำถามของคุณ",
    documentsFictional: "เอกสารและคำขอทั้งหมดเป็นข้อมูลสมมติ",
    reviewing: "กำลังตรวจสอบคำขอ…",
    traceLink: "ดูแหล่งข้อมูลและรายละเอียดทางเทคนิค",
    askPlaceholder: "ถามเกี่ยวกับนโยบายหรือเวิร์กโฟลว์ตัวอย่าง…",
    ask: "ถามผู้ช่วย",
    search: "ค้นหา",
    knowledgeQuery: "ต้องส่งคำขอเบิกค่าใช้จ่ายภายในเมื่อไร",
    sampleDocuments: "เอกสารตัวอย่าง",
    groundedAnswer: "คำตอบที่มีหลักฐาน",
    runQuery: "ค้นเพื่อรับคำตอบพร้อมแหล่งอ้างอิงและผลประเมิน",
    citations: "แหล่งอ้างอิงจากการค้นคืน",
    evaluation: "ผลประเมิน",
    topAccuracy: "ความแม่นยำอันดับแรก",
    itemsReviewed: "รายการที่ตรวจสอบ",
    executionMode: "โหมดการทำงาน",
    sourceLanguage: "เอกสารต้นฉบับเป็นภาษาอังกฤษ",
    requester: "ผู้ขอ",
    requestType: "ประเภทคำขอ",
    priority: "ความสำคัญ",
    justification: "เหตุผลทางธุรกิจ",
    workflowDetails: "ต้องการสิทธิ์สำหรับโครงการวิเคราะห์ข้อมูลตัวอย่าง",
    runWorkflow: "เรียกใช้เวิร์กโฟลว์",
    executionTrace: "รายละเอียดการทำงาน",
    submitWorkflow:
      "ส่งคำขอตัวอย่างเพื่อดูการตรวจสอบ การจัดเส้นทาง กฎ และการแจ้งเตือน",
    agentTitle: "วางแผนแบบมีขอบเขต → ใช้เครื่องมือ → ตรวจสอบ",
    agentIntro:
      "ระบบเลือกเครื่องมือได้สูงสุดสามรายการ ลงมือทำ และตรวจหลักฐานที่ค้นคืน เป็นกระบวนการแบบมีขอบเขตและกำหนดได้ ไม่ใช่ Agent อิสระระดับ Production",
    agentEmpty: "เลือกสถานการณ์หรือถามคำถามของคุณ",
    planning: "กำลังวางแผน → ดำเนินการ → ตรวจสอบ…",
    plan: "แผน",
    noTool: "ไม่พบเครื่องมือที่ตรง จึงใช้คำตอบสำรองแบบกำหนดได้",
    supportingSources: "แหล่งข้อมูลสนับสนุน",
    notApplicable: "ไม่ใช้กับคำตอบนี้",
    heuristic: "การตรวจแบบ heuristic นี้ไม่รับประกันความถูกต้องของข้อเท็จจริง",
    agentPlaceholder: "ถามคำถามกับ Copilot…",
    runCopilot: "เรียกใช้ Copilot",
    loginSubtitle: "เดโมผลงานที่มีรหัสผ่าน",
    loginTitle: "เข้าสู่เดโม",
    loginIntro:
      "ต้นแบบนี้ใช้รหัสผ่านร่วมและมีเฉพาะข้อมูลตัวอย่างสมมติที่เป็นกลาง",
    password: "รหัสผ่านเดโม",
    passwordPlaceholder: "กรอกรหัสผ่านเดโม",
    checking: "กำลังตรวจสอบ…",
    unlock: "เปิดเดโม",
    loginFooter: "ใช้สำหรับตรวจผลงาน ไม่ใช่ระบบยืนยันตัวตนระดับ Production",
    loginError: "เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่",
    networkError: "เกิดปัญหาเครือข่าย กรุณาลองใหม่",
    supportTitle: "AI ผู้ช่วยบริการลูกค้าแบบ Agentic",
    supportIntro:
      "ออกแบบเพื่อมุ่งรองรับคำถามซ้ำและความเสี่ยงต่ำได้สูงสุด 80–90% เมื่อฐานความรู้ครบถ้วน ถูกตรวจสอบ และได้รับการดูแลต่อเนื่อง",
    supportLimit:
      "เป็นเป้าหมายสำหรับการทดลองแบบควบคุม ไม่ใช่คำรับรอง Production เคสซับซ้อน อ่อนไหว มีข้อพิพาท หรือเสี่ยงสูงยังต้องใช้เจ้าหน้าที่",
    supportEmpty: "เลือกสถานการณ์ตัวอย่างหรือถามคำถามบริการลูกค้า",
    fictional: "ลูกค้า คำขอ และเอกสารทั้งหมดเป็นข้อมูลสมมติ",
    processing: "จำแนก → ค้นข้อมูล → ตรวจสอบ → ตัดสินใจ…",
    placeholder: "ถามคำถามบริการลูกค้า…",
    run: "เรียกใช้ผู้ช่วย CS",
    running: "กำลังทำงาน…",
    trace: "รายละเอียดการทำงาน",
    intent: "เจตนา",
    risk: "ความเสี่ยง",
    reason: "เหตุผลที่ส่งต่อ",
    tools: "เครื่องมือที่ใช้",
    sources: "แหล่งข้อมูล",
    verifier: "ผลตรวจหลักฐาน",
    usage: "การใช้งานโดยประมาณ",
    language: "ภาษา",
    scenarios: [
      ["คำถามทั่วไป", "ฉันสมัครบัญชีอย่างไร"],
      ["แก้ปัญหา", "เข้าใช้งานไม่ได้ ควรทำอย่างไร"],
      ["นโยบายพร้อมอ้างอิง", "ถ้ายกเลิกเดือนนี้ ขอคืนเงินได้ไหม"],
      ["เหตุผลที่สร้างระบบ", "ระบบนี้สร้างมาทำไม"],
      ["แผนพัฒนาต่อ", "ระบบนี้พัฒนาต่อเป็นแพลตฟอร์มองค์กรได้อย่างไร"],
      ["ข้อมูลไม่เพียงพอ", "รองรับกุญแจความปลอดภัยแบบฮาร์ดแวร์หรือไม่"],
      ["ข้อพิพาททางการเงิน", "ฉันต้องการโต้แย้งรายการที่ไม่ได้ทำ"],
      ["ลูกค้าโกรธ", "เรื่องนี้รับไม่ได้ ฉันจะร้องเรียนต่อสาธารณะ"],
    ],
  },
  zh: {
    subtitle: "个人作品集原型",
    live: "实时 AI · 服务端密钥",
    safe: "安全演示 · 无需密钥",
    signOut: "退出",
    eyebrow: "应用 AI · 运营",
    hero: "把复杂工作变成清晰、可审计的流程",
    intro:
      "隐私安全的 AI 实施演示：调用工具、检索有依据的答案，并自动化客服决策。",
    interactive: "交互式作品集演示",
    prototype: "原型",
    footer: "个人作品集原型，不包含客户或雇主数据。",
    modules: [
      ["AI 对话", "工具路由"],
      ["知识库", "有依据的检索"],
      ["工作流", "策略自动化"],
      ["Agentic Copilot", "规划 → 执行 → 验证"],
      ["客服 Copilot", "自动回复或转人工"],
    ],
    stats: [
      ["5", "模块"],
      ["100%", "示例数据"],
      ["0", "真实记录"],
    ],
    chatTitle: "运营助手",
    chatDefault: "高严重性事件的响应目标时间是多少？",
    chatIntro: "询问示例政策、预览请求工作流或查看检索评估。",
    chatSuggestions: [
      "费用报销的截止时间是什么？",
      "创建高优先级设备请求工作流",
      "显示检索评估分数",
    ],
    empty: "请选择示例或输入问题。",
    documentsFictional: "所有文档和请求均为虚构数据。",
    reviewing: "正在审核请求…",
    traceLink: "查看来源和技术轨迹",
    askPlaceholder: "询问示例政策或工作流…",
    ask: "询问助手",
    search: "搜索",
    knowledgeQuery: "费用报销应在何时提交？",
    sampleDocuments: "示例文档",
    groundedAnswer: "有依据的答案",
    runQuery: "运行查询以获取带引用和指标的答案。",
    citations: "检索引用",
    evaluation: "评估",
    topAccuracy: "Top-1 准确率",
    itemsReviewed: "个已审核项目",
    executionMode: "执行模式",
    sourceLanguage: "源文档为英文",
    requester: "请求人",
    requestType: "请求类型",
    priority: "优先级",
    justification: "业务理由",
    workflowDetails: "示例分析项目需要此访问权限。",
    runWorkflow: "运行工作流",
    executionTrace: "执行轨迹",
    submitWorkflow: "提交示例请求以查看验证、路由、策略和通知步骤。",
    agentTitle: "有界规划 → 工具执行 → 验证",
    agentIntro:
      "系统最多选择三个工具，执行后验证检索证据。这是有界且确定性的流程，不是生产级自主 Agent。",
    agentEmpty: "请选择示例或输入问题。",
    planning: "规划 → 执行 → 验证中…",
    plan: "计划",
    noTool: "没有匹配的工具，已返回确定性后备答案。",
    supportingSources: "支持来源",
    notApplicable: "不适用于此响应。",
    heuristic: "此启发式验证不能保证事实正确。",
    agentPlaceholder: "向 Copilot 提问…",
    runCopilot: "运行 Copilot",
    loginSubtitle: "密码保护的作品集演示",
    loginTitle: "进入演示",
    loginIntro: "此原型使用共享演示密码，仅包含虚构且中立的示例内容。",
    password: "演示密码",
    passwordPlaceholder: "请输入演示密码",
    checking: "正在验证…",
    unlock: "解锁演示",
    loginFooter: "仅供作品集评审，不是生产级身份验证。",
    loginError: "登录失败，请重试。",
    networkError: "网络错误，请重试。",
    supportTitle: "Agentic AI 客服 Copilot",
    supportIntro:
      "当知识库足够完整、经过验证并持续维护时，目标是自动处理最多 80–90% 的重复、低风险咨询。",
    supportLimit:
      "这是受控试点目标，不是生产保证。复杂、敏感、有争议或高风险事件仍由人工客服处理。",
    supportEmpty: "请选择示例或输入客服问题。",
    fictional: "所有客户、请求和文档均为虚构数据。",
    processing: "分类 → 检索 → 验证 → 决策…",
    placeholder: "请输入客服问题…",
    run: "运行客服 Copilot",
    running: "运行中…",
    trace: "执行轨迹",
    intent: "意图",
    risk: "风险",
    reason: "转人工原因",
    tools: "工具调用",
    sources: "检索来源",
    verifier: "验证结果",
    usage: "预计用量",
    language: "语言",
    scenarios: [
      ["常见问题", "如何创建账户？"],
      ["故障排除", "页面无法加载，我该怎么办？"],
      ["带引用的政策", "本月取消可以退款吗？"],
      ["产品愿景", "为什么要创建这个系统？"],
      ["发展路线", "这个平台未来可以发展到什么程度？"],
      ["证据不足", "是否支持硬件安全密钥多重验证？"],
      ["财务争议", "这是未经授权的交易，我要提出争议。"],
      ["愤怒投诉", "这不可接受，我会公开投诉。"],
    ],
  },
} as const;

export function useUiLocale() {
  const [locale, setLocaleState] = useState<UiLocale>("en");
  useEffect(() => {
    const saved = window.localStorage.getItem(
      "aios-language",
    ) as UiLocale | null;
    const detected =
      saved && saved in uiCopy
        ? saved
        : navigator.language.startsWith("th")
          ? "th"
          : navigator.language.startsWith("zh")
            ? "zh"
            : "en";
    queueMicrotask(() => {
      setLocaleState(detected);
      document.documentElement.lang = detected === "zh" ? "zh-CN" : detected;
    });
  }, []);
  function setLocale(next: UiLocale) {
    setLocaleState(next);
    window.localStorage.setItem("aios-language", next);
    document.documentElement.lang = next === "zh" ? "zh-CN" : next;
  }
  return { locale, setLocale, copy: uiCopy[locale] };
}

export function LanguageSwitcher({
  locale,
  onChange,
}: {
  locale: UiLocale;
  onChange: (locale: UiLocale) => void;
}) {
  return (
    <div
      className="flex rounded-full border border-white/10 bg-white/[.03] p-0.5"
      aria-label="Language"
    >
      {(["en", "th", "zh"] as UiLocale[]).map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => onChange(item)}
          className={`rounded-full px-2.5 py-1 text-[11px] transition ${locale === item ? "bg-green-300 text-[#07100f]" : "text-[#90a9a0] hover:text-green-200"}`}
        >
          {item === "en" ? "EN" : item === "th" ? "ไทย" : "中文"}
        </button>
      ))}
    </div>
  );
}
