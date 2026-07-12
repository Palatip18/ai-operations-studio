export type TransactionKind = "DEPOSIT" | "WITHDRAWAL";
export type TransactionStatus = "PENDING" | "PROCESSING" | "CREDITED" | "COMPLETED" | "REJECTED" | "NOT_FOUND" | "NEEDS_REFERENCE";

export type BackofficeTransactionResult = {
  simulated: true;
  found: boolean;
  reference: string | null;
  kind: TransactionKind | null;
  status: TransactionStatus;
  amount?: number;
  currency?: "THB";
  updatedAt?: string;
  safeReason?: string;
  reviewRequired: boolean;
};

type TransactionRecord = Omit<BackofficeTransactionResult, "simulated" | "found" | "reviewRequired"> & { ownerUserId: string };

const transactions = new Map<string, TransactionRecord>([
  ["DEP-1001", { ownerUserId: "USER-RAY01", reference: "DEP-1001", kind: "DEPOSIT", status: "PENDING", amount: 500, currency: "THB", updatedAt: "2026-07-13T01:05:00.000Z", safeReason: "Payment gateway verification is still in progress." }],
  ["DEP-1002", { ownerUserId: "USER-RAY01", reference: "DEP-1002", kind: "DEPOSIT", status: "CREDITED", amount: 1_000, currency: "THB", updatedAt: "2026-07-13T01:12:00.000Z", safeReason: "The back-office ledger shows the deposit as credited." }],
  ["WDL-2001", { ownerUserId: "USER-RAY01", reference: "WDL-2001", kind: "WITHDRAWAL", status: "PROCESSING", amount: 800, currency: "THB", updatedAt: "2026-07-13T01:18:00.000Z", safeReason: "The withdrawal is still within the simulated processing queue." }],
  ["WDL-2002", { ownerUserId: "USER-RAY01", reference: "WDL-2002", kind: "WITHDRAWAL", status: "COMPLETED", amount: 1_200, currency: "THB", updatedAt: "2026-07-13T01:22:00.000Z", safeReason: "The back-office ledger shows the withdrawal as completed." }],
  ["WDL-2003", { ownerUserId: "USER-MALI02", reference: "WDL-2003", kind: "WITHDRAWAL", status: "REJECTED", amount: 600, currency: "THB", updatedAt: "2026-07-13T01:25:00.000Z", safeReason: "The fictional promotion turnover requirement is not complete." }],
]);

const MISSING_FUNDS = /not (?:arrived|received|credited)|missing|ไม่เข้า|ยังไม่เข้า|未到账|没有到账/i;

export function lookupSimulatedTransaction(message: string, customerUserId: string): BackofficeTransactionResult {
  const reference = message.toUpperCase().match(/\b(?:DEP|WDL)-\d{4}\b/)?.[0] ?? null;
  if (!reference) {
    const kind = /ฝาก|deposit|top ?up|存款|充值/i.test(message)
      ? "DEPOSIT"
      : /ถอน|withdraw|cash ?out|提款|提现/i.test(message)
        ? "WITHDRAWAL"
        : null;
    return { simulated: true, found: false, reference: null, kind, status: "NEEDS_REFERENCE", reviewRequired: false };
  }

  const record = transactions.get(reference);
  if (!record || record.ownerUserId !== customerUserId) {
    return { simulated: true, found: false, reference, kind: reference.startsWith("DEP") ? "DEPOSIT" : "WITHDRAWAL", status: "NOT_FOUND", safeReason: "No matching transaction was found in the simulated back-office dataset.", reviewRequired: true };
  }

  const { ownerUserId: _ownerUserId, ...safeRecord } = record;
  void _ownerUserId;
  const ledgerSaysComplete = safeRecord.status === "CREDITED" || safeRecord.status === "COMPLETED";
  return { simulated: true, found: true, ...safeRecord, reviewRequired: ledgerSaysComplete && MISSING_FUNDS.test(message) };
}

export function composeTransactionStatusReply(result: BackofficeTransactionResult, locale: string): string {
  if (result.status === "NEEDS_REFERENCE") {
    if (locale === "th") return result.kind === "DEPOSIT"
      ? "รับทราบค่ะ รบกวนลูกค้าแจ้งหมายเลขอ้างอิงการฝากให้แอดมินหน่อยนะคะ"
      : result.kind === "WITHDRAWAL"
        ? "รับทราบค่ะ รบกวนลูกค้าแจ้งหมายเลขอ้างอิงการถอนให้แอดมินหน่อยนะคะ"
        : "ได้ค่ะ รบกวนลูกค้าแจ้งหมายเลขอ้างอิงรายการให้แอดมินหน่อยนะคะ";
    if (locale === "zh") return result.kind === "DEPOSIT"
      ? "明白了，这是存款未到账问题。请提供 DEP-1001 格式的存款编号以查询状态，请勿发送完整银行账号、密码或 OTP。"
      : result.kind === "WITHDRAWAL"
        ? "明白了，这是提款问题。请提供 WDL-2001 格式的提款编号以查询状态，请勿发送完整银行账号、密码或 OTP。"
        : "请先提供交易编号，例如存款 DEP-1001 或提款 WDL-2001。请勿发送完整银行账号、密码或 OTP。";
    return result.kind === "DEPOSIT"
      ? "Understood — this is a deposit-credit issue. Please provide a deposit reference such as DEP-1001 so I can check its status. Do not send a full bank-account number, password, or OTP."
      : result.kind === "WITHDRAWAL"
        ? "Understood — this is a withdrawal issue. Please provide a withdrawal reference such as WDL-2001 so I can check its status. Do not send a full bank-account number, password, or OTP."
        : "Please provide the transaction reference first, such as DEP-1001 for a deposit or WDL-2001 for a withdrawal. Do not send a full bank-account number, password, or OTP.";
  }
  if (result.status === "NOT_FOUND") {
    if (locale === "th") return `ขออภัยค่ะ แอดมินยังไม่พบรายการ ${result.reference} จึงส่งเรื่องให้ตรวจสอบเพิ่มเติมเรียบร้อยแล้วนะคะ`;
    if (locale === "zh") return `模拟后台未找到交易 ${result.reference}，系统已创建模拟审核工单以进一步核实该编号。`;
    return `Transaction ${result.reference} was not found in the simulated back office, so a demo review case has been created to verify the reference.`;
  }
  const status = `${result.reference} · ${result.status}`;
  if (result.reviewRequired) {
    if (locale === "th") {
      const time = result.updatedAt ? new Intl.DateTimeFormat("th-TH", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" }).format(new Date(result.updatedAt)) : null;
      return `จากการตรวจสอบ รายการ ${result.reference} แสดงว่าสำเร็จ${time ? `เมื่อเวลา ${time} น.` : "แล้ว"} แต่ยอดยังไม่ตรงกับที่ลูกค้าแจ้ง แอดมินส่งรายการให้ตรวจสอบเพิ่มเติมเรียบร้อยแล้วค่ะ`;
    }
    if (locale === "zh") return `已找到交易 ${status}，但后台状态与您报告的情况不一致，因此系统已创建模拟交易审核工单。`;
    return `Transaction ${status} was found, but the back-office status conflicts with the reported outcome, so a simulated transaction-review case has been created.`;
  }
  if (locale === "th") {
    if (result.kind === "WITHDRAWAL" && result.status === "PROCESSING") return `จากการตรวจสอบ รายการถอนเงิน ${result.reference} อยู่ในคิวแล้วนะคะ รายการอาจใช้เวลาสักครู่ ลูกค้าไม่ต้องกังวลค่ะ`;
    if (result.kind === "DEPOSIT" && result.status === "PENDING") return `จากการตรวจสอบ รายการฝากเงิน ${result.reference} อยู่ระหว่างดำเนินการนะคะ ช่วงสรุปยอดรายวันของธนาคารอาจใช้เวลามากกว่าปกตินิดหน่อยค่ะ หากเกิน 20 นาทีแล้วยอดยังไม่เข้ายูส รบกวนลูกค้าติดต่อเข้ามาอีกครั้งนะคะ`;
    if (result.status === "REJECTED") return `จากการตรวจสอบ รายการถอนเงิน ${result.reference} ยังดำเนินการไม่ได้ เนื่องจากยอดเทิร์นของโปรโมชั่นยังไม่ครบค่ะ รบกวนลูกค้าตรวจสอบเงื่อนไขโปรโมชั่นอีกครั้งนะคะ`;
    if (result.status === "CREDITED" || result.status === "COMPLETED") return `จากการตรวจสอบ รายการ ${result.reference} สำเร็จเรียบร้อยแล้วค่ะ`;
    return `จากการตรวจสอบ รายการ ${result.reference} กำลังดำเนินการอยู่นะคะ รบกวนลูกค้ารอสักครู่ค่ะ`;
  }
  if (locale === "zh") return `已在模拟后台找到交易 ${status}。${result.safeReason ?? "交易正按所示状态处理。"}`;
  return `Transaction ${status} was found in the simulated back office. ${result.safeReason ?? "It is progressing according to the displayed status."}`;
}
