# Interview Talking Points — AI Operations Studio

## เปิดโปรเจกต์ภายใน 60–90 วินาที

“AI Operations Studio เป็น Functional Prototype ที่ผมสร้างเพื่อแสดงกระบวนการนำ AI ไปแก้ปัญหา Customer Operations แบบ End-to-End ครับ ผมเริ่มจากปัญหาหน้างานและ Requirement ก่อน แล้วจึงออกแบบ Intent/Risk Classification, Hybrid RAG, Bounded Agent, Business Rules, Human Escalation และการวัดผล ระบบนี้ไม่ได้ตั้งใจโชว์เพียงว่า AI ตอบคำถามได้ แต่โชว์ว่าเคสใดควรตอบ เคสใดควรถามเพิ่ม และเคสใดต้องหยุดแล้วส่งให้คนตรวจครับ”

ข้อมูลนโยบายในเดโมเป็นข้อมูลจำลองทั้งหมด บางรูปแบบของกฎถูกสังเคราะห์จากประสบการณ์และเอกสารอ้างอิงหน้างาน แต่เขียนชื่อ ตัวเลข และตัวอย่างใหม่ทั้งหมด ไม่มีชื่อเว็บ URL รายชื่อผู้ใช้ รหัสภายใน หรือข้อมูลลูกค้าจริง

## Scenario 1 — CS / Promotion

“เคสนี้แสดงว่าคำถามโปรโมชันไม่ได้มีแค่เปอร์เซ็นต์โบนัส ระบบต้องตรวจหลายมิติพร้อมกัน เช่น สมัครทันช่วงเวลาหรือไม่ กดรับก่อนฝากหรือไม่ ฝากขั้นต่ำครบไหม รับซ้ำหรือใช้บัญชี/ช่องทางชำระเงินร่วมกันหรือไม่ ทำ Turnover ครบไหม เล่นเฉพาะเกมที่กำหนดหรือไม่ และติดเพดานถอนเท่าไร RAG จะดึง Policy ที่เกี่ยวข้องพร้อมแหล่งอ้างอิง ส่วนเคสที่ข้อมูลไม่ครบหรือมีข้อยกเว้นจะไม่เดา แต่ถามเพิ่มหรือส่งตรวจครับ”

Business value: ลดเวลาค้นหากฎยาว ๆ, ลดคำตอบไม่ตรงกันระหว่างพนักงาน, และช่วยให้พนักงานใหม่เรียนรู้ Policy ผ่านคำตอบที่มีหลักฐาน

## Scenario 2 — Payment / Withdrawal

“เมื่อลูกค้าแจ้งถอนล่าช้า ระบบจะไม่ค้นข้อมูลบัญชีทันที แต่ขอ User ID เพื่อผูก Customer Scope ก่อน จากนั้นจึงเรียก Back-office Adapter แบบจำลอง ตรวจสถานะและเปรียบเทียบกับสิ่งที่ลูกค้าแจ้ง ถ้าสถานะปกติจะอธิบายขั้นตอน ถ้าข้อมูลขัดแย้ง เงินไม่ถึง หรือเกินเงื่อนไขที่ระบบตัดสินเองได้ จะสร้าง Structured Handoff พร้อมเหตุผลและ Trace ครับ”

Business value: ลดการสลับหลายระบบ, ทำให้ข้อมูลส่งต่อครบ, ลดเคสซ้ำ และรักษาความเป็นส่วนตัวด้วยการเข้าถึงข้อมูลตาม Customer Scope

## Scenario 3 — KYC

“KYC เป็นเคสที่ AI ไม่ควรตัดสินแทนคนครับ ถ้าเอกสารหมดอายุ ชื่อเจ้าของช่องทางชำระเงินไม่ตรง หรือเป็นการฝากจากบุคคลที่สาม ระบบจะเก็บเฉพาะข้อมูลขั้นต่ำและหมายเลขอ้างอิงที่ปิดบังแล้ว จากนั้นส่งให้ทีมที่มีสิทธิ์ตรวจ ไม่ขอ OTP รหัสผ่าน เลขบัญชีเต็ม หรือภาพเอกสารผ่านแชตทั่วไป และไม่กล่าวหาลูกค้าว่าทุจริตครับ”

Business value: ลดความเสี่ยงข้อมูลส่วนบุคคล, ทำ Intake ให้เป็นมาตรฐาน และรักษา Human Accountability ในการตัดสินใจที่อ่อนไหว

## Scenario 4 — Risk

“รายการที่ลูกค้าไม่ได้ทำเป็น Mandatory Escalation แม้ RAG จะค้นเจอคำตอบ ระบบแยก Policy Decision ออกจาก Retrieval จึงไม่ปล่อยให้คำตอบที่มีแหล่งอ้างอิงผ่านอัตโนมัติ ถ้าเข้ากฎ Fraud, Dispute, Account/Payment Ownership Conflict หรือสัญญาณความเสี่ยงอื่น Agent จะหยุด สร้างเคสจำลอง และส่งเหตุผลกับหลักฐานให้คนตรวจครับ”

Business value: จัดลำดับเคสเสี่ยงได้เร็ว, ลดการตัดสินใจนอกอำนาจของ AI และทำ Audit ได้ว่าเหตุใดระบบจึงส่งต่อ

## AI Confidence / Escalation

“ผมไม่แสดง Confidence เป็นเปอร์เซ็นต์ที่โมเดลเดาเองครับ ในโปรเจกต์นี้ใช้สัญญาณที่ตรวจสอบได้ ได้แก่ความเกี่ยวข้องของเอกสาร Groundedness, ความครบของ Context, Intent/Risk และ Mandatory Policy Rule แล้วแปลงเป็นสาม Action คือ Answer, Clarify หรือ Escalate วิธีนี้อธิบายและทดสอบได้ง่ายกว่า Autonomous Agent ที่ปล่อยให้โมเดลตัดสินทุกอย่างเองครับ”

## Business Impact / KPI

“ตัวเลขบนหน้า Business Impact เป็น Projected Pilot Targets ไม่ใช่ผล Production ครับ ผมจะเริ่มจากเก็บ Baseline เช่น Volume, Average Handling Time, First Contact Resolution, CSAT และ Escalation Reason จากนั้นทำ Offline Evaluation, Shadow Mode และ Controlled Rollout ก่อนขยาย Automation โดยมี Accuracy, High-risk Escalation Recall และ CSAT เป็น Guardrail ครับ”

## เชื่อมกับ JD

- Requirement Analysis: แปลงปัญหาหน้างานเป็น Intent, Rule, Required Evidence, Edge Case และ Escalation Criteria
- End-to-End Integration: เชื่อม Chat, Verification, RAG, Tool Calling, Back-office Adapter, Handoff และ Analytics
- AI Agents / RAG: ใช้ Hybrid Retrieval, Citation, Groundedness และ Bounded Tool Calling
- Talent Enablement: มี Behavior Policy, Scenario, Trace และ Analytics ให้ Operations ตรวจและเรียนรู้ร่วมกัน
- Value Delivery & Measurement: แยก Prototype Result ออกจาก Pilot Target และกำหนดวิธีวัดก่อนตัดสิน ROI

## ถ้าถูกถามว่า “คุณทำเองแค่ไหน”

“ผมเป็นคนวิเคราะห์ปัญหา กำหนด Requirement, Workflow, Business Rules, Test Cases, Acceptance Criteria และ Review ผลลัพธ์ครับ ผมใช้ AI-assisted development ช่วยสร้างและแก้โค้ด แต่ผมเป็นคนตัดสินใจว่าระบบควรทำอะไร ทดสอบ Edge Case และยอมรับหรือแก้งานแต่ละส่วน โปรเจกต์มี Automated Tests และผ่าน Lint, Type Check กับ Production Build ครับ”

## ข้อจำกัดที่ควรพูดตรง ๆ

- CRM, Ticketing, KYC provider และ Payment system ยังเป็น Adapter/Simulation
- Knowledge Base ยังไม่ใช่ฐานข้อมูลถาวรและไม่มี Document-level RBAC
- Groundedness เป็น Prototype Heuristic ไม่ใช่ Fact-correctness guarantee
- KPI เป็นเป้าหมายสำหรับ Pilot ไม่ใช่ผลจากลูกค้าจริง
- ก่อน Production ต้องมี Persistent Audit, Access Control, Shared Rate Limit, Monitoring และการประเมินจากข้อมูลจริงที่ผ่านการทำให้ไม่ระบุตัวตน

