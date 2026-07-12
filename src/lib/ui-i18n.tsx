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
      ["Knowledge Base", "Grounded retrieval"],
      ["Workflow", "Policy automation"],
      ["Agentic Copilot", "Plan → act → verify"],
      ["AI Support Chat", "Conversation, tools, and safe escalation"],
    ],
    stats: [
      ["4", "modules"],
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
    supportTitle: "AI Gaming Support Chat",
    supportIntro:
      "Handles fictional online-gaming questions about deposits, withdrawals, games, and promotions, while routing missing-funds and high-risk cases for simulated review.",
    supportLimit:
      "A controlled-pilot target, not a production guarantee. Complex, sensitive, disputed, or high-risk cases remain with customer-support specialists.",
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
      ["Deposit missing", "I made a deposit, but the credit has not arrived."],
      ["Withdrawal delayed", "My withdrawal has been pending for a long time."],
      ["Withdrawal missing", "The withdrawal says completed, but the money has not reached my account."],
      ["Game issue", "The game froze and my balance did not update. What information do you need?"],
      ["Promotion details", "What are the conditions for the welcome promotion?"],
      ["Bonus withdrawal", "I accepted a bonus but cannot withdraw yet. What should I check?"],
      ["Payment dispute", "My gaming account shows a transaction I did not make."],
      ["Responsible support", "I am worried about spending too much. What controls should be available?"],
    ],
    sourceCatalog: "Source catalog",
    ofWord: "of",
    emptySearch: "Run a query to search 26 sample documents and retrieve a grounded, cited answer.",
    insufficientAlert: "No document meets the relevance threshold for this query. Showing the closest matches for review — this would escalate rather than auto-respond.",
    errorAlert: "Couldn't reach the retrieval service. This is a safe, non-technical error message — no internals are shown.",
    retry: "Retry",
    mobileCatalogNote: "On mobile, the source catalog collapses into an accordion above the answer panel — the answer is never pushed below all 26 documents.",
    scoreComponentsWord: "Score components",
    technicalTrace: "Technical execution trace",
    guidedScenarios: "Guided demo scenarios",
    vector: "vector",
    lexical: "lexical",
    topic: "topic",
    hybrid: "hybrid",
    noDocsMatch: "No documents match this filter.",
    sessionExpired: "Session expired. Redirecting to login...",
    rateLimitError: "Too many requests. Please try again later.",
    documentPreview: "Document preview",
    handoffCreated: "Demo case created",
    simulated: "Simulated",
    handoffStatus: "Status",
    reference: "Demo reference",
    destination: "Destination",
    createdAt: "Created at",
    customerSupportQueue: "Customer Support Queue",
    conversationHistory: "Conversation",
    newConversation: "New conversation",
    categoriesList: {
      "all": "All",
      "People Operations": "People Ops",
      "Finance Operations": "Finance",
      "IT Operations": "IT Ops",
      "Customer Support Copilot": "Support Copilot",
        "Customer Support FAQ": "FAQ",
        "Online Gaming Support": "Gaming Support"
    }
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
      ["ฐานความรู้", "ค้นคำตอบพร้อมหลักฐาน"],
      ["เวิร์กโฟลว์", "กฎและระบบอัตโนมัติ"],
      ["Agentic Copilot", "วางแผน → ลงมือ → ตรวจสอบ"],
      ["AI แชตบริการลูกค้า", "สนทนา ใช้เครื่องมือ และส่งตรวจอย่างปลอดภัย"],
    ],
    stats: [
      ["4", "โมดูล"],
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
    supportTitle: "AI แชตบริการลูกค้าเกมออนไลน์",
    supportIntro:
      "ตอบคำถามตัวอย่างเกี่ยวกับฝากเงิน ถอนเงิน ปัญหาเกม และโปรโมชั่น พร้อมส่งเคสเงินไม่เข้าและเคสเสี่ยงเข้าสู่การตรวจสอบแบบจำลอง",
    supportLimit:
      "เป็นเป้าหมายสำหรับการทดลองแบบควบคุม ไม่ใช่คำรับรอง Production เคสซับซ้อน อ่อนไหว มีข้อพิพาท หรือเสี่ยงสูงยังต้องใช้เจ้าหน้าที่",
    supportEmpty: "เลือกสถานการณ์ตัวอย่างหรือถามคำถามบริการลูกค้า",
    fictional: "ลูกค้า คำขอ และเอกสารทั้งหมดเป็นข้อมูลสมมติ",
    processing: "จำแนก → ค้นข้อมูล → ตรวจสอบ → ตัดสินใจ…",
    placeholder: "ถามคำถามบริการลูกค้า…",
    run: "ส่งข้อความ",
    running: "กำลังทำงาน…",
    trace: "รายละเอียดการทำงาน",
    intent: "ประเภทคำถาม",
    risk: "ความเสี่ยง",
    reason: "เหตุผลที่ต้องตรวจสอบเพิ่มเติม",
    tools: "เครื่องมือที่ใช้",
    sources: "แหล่งข้อมูล",
    verifier: "ผลตรวจหลักฐาน",
    usage: "การใช้งานโดยประมาณ",
    language: "ภาษา",
    scenarios: [
      ["ฝากเงินไม่เข้า", "ฝากเงินแล้วเครดิตไม่เข้า ต้องทำอย่างไร"],
      ["ถอนเงินล่าช้า", "ถอนเงินนานมาก สถานะยังอยู่ระหว่างดำเนินการ"],
      ["ถอนแล้วเงินไม่เข้า", "สถานะถอนเงินสำเร็จแล้ว แต่เงินยังไม่เข้าบัญชี"],
      ["ปัญหาเกม", "เกมค้างและยอดเงินไม่อัปเดต ต้องใช้ข้อมูลอะไรตรวจสอบ"],
      ["ข้อมูลโปรโมชั่น", "โปรโมชั่นสมาชิกใหม่มีเงื่อนไขอะไรบ้าง"],
      ["ติดเงื่อนไขโบนัส", "รับโบนัสแล้วถอนเงินไม่ได้ ต้องตรวจสอบอะไร"],
      ["รายการที่ไม่ได้ทำ", "บัญชีเกมมีรายการที่ฉันไม่ได้ทำ ต้องการให้ตรวจสอบ"],
      ["ควบคุมการใช้งาน", "ฉันกังวลว่าใช้เงินมากเกินไป ควรมีเครื่องมืออะไรช่วยควบคุม"],
    ],
    sourceCatalog: "รายการเอกสาร",
    ofWord: "จาก",
    emptySearch: "พิมพ์คำค้นหาเพื่อค้นหาจากเอกสารตัวอย่าง 26 ฉบับและรับคำตอบที่มีหลักฐานอ้างอิง",
    insufficientAlert: "ไม่มีเอกสารใดผ่านเกณฑ์ความเกี่ยวข้องสำหรับคำค้นหานี้ กำลังแสดงเอกสารที่ใกล้เคียงที่สุดเพื่อตรวจสอบ — กรณีนี้จะส่งต่อให้เจ้าหน้าที่แทนการตอบอัตโนมัติ",
    errorAlert: "ไม่สามารถเชื่อมต่อบริการค้นคืนข้อมูลได้ นี่คือข้อความแจ้งเตือนที่ปลอดภัยและไม่แสดงรายละเอียดทางเทคนิคใดๆ",
    retry: "ลองใหม่",
    mobileCatalogNote: "บนมือถือ แคตตาล็อกแหล่งข้อมูลจะย่อลงเป็นแถบพับด้านบนกล่องคำตอบ เพื่อไม่ให้กล่องคำตอบถูกเบียดลงไปอยู่ล่างสุด",
    scoreComponentsWord: "รายละเอียดคะแนน",
    technicalTrace: "รายละเอียดการทำงานทางเทคนิค",
    guidedScenarios: "ทดลองสถานการณ์ตัวอย่าง",
    vector: "เวกเตอร์",
    lexical: "คะแนนเชิงคำศัพท์",
    topic: "หัวข้อ",
    hybrid: "ไฮบริด",
    noDocsMatch: "ไม่พบเอกสารที่ตรงกับตัวกรองนี้",
    sessionExpired: "เซสชันหมดอายุ กำลังนำคุณไปยังหน้าเข้าสู่ระบบ...",
    rateLimitError: "ทำรายการบ่อยเกินไป กรุณาลองใหม่ในภายหลัง",
    documentPreview: "ตัวอย่างเอกสาร",
    handoffCreated: "สร้างเคสจำลองแล้ว",
    simulated: "ระบบจำลอง",
    handoffStatus: "สถานะ",
    reference: "หมายเลขอ้างอิงสำหรับเดโม",
    destination: "คิวปลายทาง",
    createdAt: "เวลาที่สร้าง",
    customerSupportQueue: "คิวบริการลูกค้า",
    conversationHistory: "บทสนทนา",
    newConversation: "เริ่มบทสนทนาใหม่",
    categoriesList: {
      "all": "ทั้งหมด",
      "People Operations": "ฝ่ายบุคคล",
      "Finance Operations": "การเงิน",
      "IT Operations": "ฝ่ายไอที",
      "Customer Support Copilot": "ผู้ช่วย CS",
        "Customer Support FAQ": "คำถามพบบ่อย",
        "Online Gaming Support": "บริการลูกค้าเกมออนไลน์"
    }
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
      ["知识库", "有依据的检索"],
      ["工作流", "策略自动化"],
      ["Agentic Copilot", "规划 → 执行 → 验证"],
      ["AI 客服对话", "对话、工具调用与安全升级"],
    ],
    stats: [
      ["4", "模块"],
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
    supportTitle: "AI 在线游戏客服对话",
    supportIntro:
      "处理虚构的在线游戏存款、提款、游戏故障与促销问题，并将资金未到账及高风险事件送入模拟审核流程。",
    supportLimit:
      "这是受控试点目标，不是生产保证。复杂、敏感、有争议或高风险事件仍由人工客服处理。",
    supportEmpty: "请选择示例或输入客服问题。",
    fictional: "所有客户、请求和文档均为虚构数据。",
    processing: "分类 → 检索 → 验证 → 决策…",
    placeholder: "请输入客服问题…",
    run: "发送消息",
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
      ["存款未到账", "我已存款，但游戏账户余额还没有增加。"],
      ["提款延迟", "我的提款长时间处于处理中。"],
      ["提款未到账", "提款显示已完成，但银行账户还没收到钱。"],
      ["游戏故障", "游戏卡住且余额没有更新，需要提供哪些信息？"],
      ["促销详情", "新会员促销有哪些条件？"],
      ["奖金提款", "领取奖金后暂时无法提款，我应该检查什么？"],
      ["异常交易", "游戏账户中出现了一笔不是我操作的交易。"],
      ["负责任使用", "我担心花费过多，平台应提供哪些控制工具？"],
    ],
    sourceCatalog: "源文档目录",
    ofWord: "的",
    emptySearch: "运行查询以检索 26 份示例文档并获取有依据且引用的回答。",
    insufficientAlert: "没有符合该查询相关性阈值的文档。显示最接近的匹配项以供人工审核 — 此操作将转人工，而非自动回复。",
    errorAlert: "无法连接到检索服务。这是经过脱敏的安全错误信息，不包含系统内部细节。",
    retry: "重试",
    mobileCatalogNote: "在移动端，源文档目录会折叠到回答面板上方，以保证回答面板不会被推到底部。",
    scoreComponentsWord: "评分细则",
    technicalTrace: "技术执行轨迹",
    guidedScenarios: "引导式演示场景",
    vector: "向量",
    lexical: "词法",
    topic: "主题",
    hybrid: "混合",
    noDocsMatch: "没有符合该过滤条件的文档。",
    sessionExpired: "会话已过期。正在跳转至登录页面...",
    rateLimitError: "请求过多。请稍后重试。",
    documentPreview: "文档预览",
    handoffCreated: "已创建模拟客服工单",
    simulated: "模拟",
    handoffStatus: "状态",
    reference: "演示编号",
    destination: "目标队列",
    createdAt: "创建时间",
    customerSupportQueue: "客户服务队列",
    conversationHistory: "对话记录",
    newConversation: "新建对话",
    categoriesList: {
      "all": "全部",
      "People Operations": "人事运营",
      "Finance Operations": "财务运营",
      "IT Operations": "IT运营",
      "Customer Support Copilot": "客服助手",
        "Customer Support FAQ": "常见问题",
        "Online Gaming Support": "在线游戏客服"
    }
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
      role="radiogroup"
      aria-label="Language"
    >
      {(["en", "th", "zh"] as UiLocale[]).map((item) => (
        <button
          key={item}
          type="button"
          role="radio"
          aria-checked={locale === item}
          onClick={() => onChange(item)}
          className={`kb-focusable rounded-full px-2.5 py-1 text-[11px] transition min-h-[28px] ${locale === item ? "bg-accent text-[#07101F] font-semibold" : "text-[#90a9a0] hover:text-accent"}`}
        >
          {item === "en" ? "EN" : item === "th" ? "ไทย" : "中文"}
        </button>
      ))}
    </div>
  );
}
