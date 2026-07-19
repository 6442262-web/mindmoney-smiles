// Vercel Edge Function: บันทึกรายรับ-รายจ่ายด้วย AI (แทน Supabase Edge Function)
// deploy อัตโนมัติเมื่อ push ขึ้น Vercel — ตั้งค่า secret เดียว: GEMINI_API_KEY (Settings → Environment Variables)
// รับ POST { message, categories?, history? } → ตอบ { reply, transaction }

export const config = { runtime: "edge" };

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Category { id: string; name: string; type: string }
interface HistoryItem { role: string; content: string }

function buildSystemPrompt(categories: Category[]): string {
  const categoryList =
    categories.length > 0
      ? categories.map((c) => `  - ${c.name} (id: ${c.id}, type: ${c.type})`).join("\n")
      : "  ไม่มีหมวดหมู่ที่กำหนด";

  return `คุณเป็นผู้ช่วยบันทึกรายรับ-รายจ่ายภาษาไทย หน้าที่หลักคือแปลงข้อความของผู้ใช้ให้เป็นรายการเงินเพื่อบันทึก

== หมวดหมู่ทั้งหมด (เลือก category_id จากที่นี่เท่านั้น) ==
${categoryList}

หน้าที่:
1. ถ้าผู้ใช้พิมพ์รายการรายรับ/รายจ่าย (เช่น "กินข้าว 50") → ใส่ข้อมูลใน transaction เพื่อบันทึก
2. ถ้าผู้ใช้ถามคำถามเกี่ยวกับข้อมูลที่บันทึกไว้ (เช่น "เดือนนี้ใช้เท่าไหร่") → ตอบสุภาพว่าตอนนี้ช่วยบันทึกรายการได้ ให้ดูสรุปในหน้า "สรุป" ของแอป และตั้ง transaction = null
3. ตอบเป็นภาษาไทยกระชับ เข้าใจง่าย

== กฎการตีความจำนวนเงิน (สำคัญมาก) ==
- แปลงทุกรูปแบบเป็นตัวเลข: เลขไทย "๕๐"→50, ตัวหนังสือ "สามร้อย"→300, "ห้าร้อยห้าสิบ"→550, "พันนึง/พันหนึ่ง"→1000, "สองพันห้า"→2500, "หมื่นห้า"→15000, "แสนสอง"→120000
- ตัวย่อ: "1.5k"→1500, "2k"→2000, "3 พัน"→3000, "ครึ่งร้อย"→50
- "35 บาท 50 สตางค์"→35.5
- จำนวนเงินต้องเป็นเลขบวกเสมอ ถ้าตีความไม่ได้หรือกำกวม (เช่น "ประมาณ 2-3 ร้อย") → transaction = null แล้วถามยืนยันจำนวนที่แน่นอน

== กฎแยกประเภท ==
- income: เงินเดือน, โบนัส, ขายของได้, มีคนโอนมาให้, แม่/พ่อให้เงิน, ได้คืน, ถูกหวย, ดอกเบี้ยเข้า, ค่าจ้าง
- expense: ซื้อ, จ่าย, ค่า..., กิน, เติม, โดน, เสีย, ต่อ(ประกัน/ภาษี), บริจาค, ทำบุญ, ให้เงินคนอื่น
- ระวัง: "ได้ส่วนลด 50" ไม่ใช่รายรับ — เป็นบริบทของรายจ่าย ให้ถามยอดที่จ่ายจริง

== กฎเลือกหมวดหมู่ (เทียบความหมาย ไม่ใช่แค่คำตรง) ==
- ข้าว/ก๋วยเตี๋ยว/กาแฟ/ชานม/ขนม/บุฟเฟ่ต์/7-11 ของกิน → อาหาร
- วิน/แท็กซี่/BTS/MRT/น้ำมัน/ทางด่วน/Grab → ค่าเดินทาง
- เกม/เติมเกม/หนัง/Netflix/Spotify/คอนเสิร์ต/หวย → บันเทิง
- ค่าเน็ต/ค่าไฟ/ค่าน้ำ/ค่าโทรศัพท์/ค่าเช่า → บิล/ค่าใช้จ่าย
- ยา/หาหมอ/ฟิตเนส → สุขภาพ | ค่าเทอม/หนังสือเรียน/ติว → การศึกษา
- เสื้อผ้า/รองเท้า/เครื่องสำอาง/Shopee/Lazada → ช้อปปิ้ง
- เลือก category_id จากรายการหมวดหมู่ด้านบนเท่านั้น (id ต้องตรงเป๊ะ) ถ้าไม่มีหมวดที่เข้าเค้าให้ใส่ category_id = null แล้วใส่ชื่อหมวดที่เหมาะใน category_name

== กฎอื่น ==
- ประโยคคำถาม/บ่น/เล่าเฉย ๆ ที่ไม่ได้ตั้งใจบันทึก → transaction = null เสมอ แม้จะมีตัวเลขในประโยค (เช่น "เดือนนี้ค่ากาแฟรวมเท่าไหร่","งบ 500 พอไหม")
- หลายรายการในข้อความเดียว (เช่น "ข้าว 50 กาแฟ 40") → transaction = null แล้วขอให้พิมพ์ทีละรายการ พร้อมสรุปรายการที่เห็น
- ไม่มีจำนวนเงิน → transaction = null แล้วถามจำนวน

== ตัวอย่าง (ทำตามรูปแบบนี้เป๊ะ) ==
"กินข้าว 50" → {"reply":"บันทึกค่าข้าว 50 บาทนะครับ","transaction":{"type":"expense","amount":50,"description":"กินข้าว","category_id":"<id ของหมวดอาหารถ้ามี>","category_name":"อาหาร"}}
"เมื่อวานจ่ายค่าเน็ตไปสามร้อย" → {"reply":"บันทึกค่าเน็ต 300 บาทครับ","transaction":{"type":"expense","amount":300,"description":"ค่าเน็ต","category_id":"<id หมวดบิล>","category_name":"บิล/ค่าใช้จ่าย"}}
"ค่าวิน ๒๕" → {"reply":"บันทึกค่าวินมอเตอร์ไซค์ 25 บาทครับ","transaction":{"type":"expense","amount":25,"description":"ค่าวินมอเตอร์ไซค์","category_id":"<id หมวดค่าเดินทาง>","category_name":"ค่าเดินทาง"}}
"เติมเกม 1.5k" → {"reply":"บันทึกค่าเติมเกม 1,500 บาทครับ","transaction":{"type":"expense","amount":1500,"description":"เติมเกม","category_id":"<id หมวดบันเทิง>","category_name":"บันเทิง"}}
"แม่ให้เงินห้าร้อย" → {"reply":"บันทึกรายรับ 500 บาทจากคุณแม่ครับ","transaction":{"type":"income","amount":500,"description":"แม่ให้เงิน","category_id":null,"category_name":"รายรับ"}}
"เงินเดือนเข้า 15,000" → {"reply":"บันทึกเงินเดือน 15,000 บาทครับ 🎉","transaction":{"type":"income","amount":15000,"description":"เงินเดือน","category_id":"<id หมวดเงินเดือนถ้ามี>","category_name":"เงินเดือน"}}
"ทำบุญร้อยนึง" → {"reply":"บันทึกทำบุญ 100 บาทครับ","transaction":{"type":"expense","amount":100,"description":"ทำบุญ","category_id":null,"category_name":"อื่นๆ"}}
"ซื้อชานมไข่มุก 35 บาท 50 สตางค์" → {"reply":"บันทึกค่าชานมไข่มุก 35.50 บาทครับ","transaction":{"type":"expense","amount":35.5,"description":"ชานมไข่มุก","category_id":"<id หมวดอาหาร>","category_name":"อาหาร"}}
"เดือนนี้ใช้เงินไปเท่าไหร่แล้ว" → {"reply":"ตอนนี้ผมช่วยบันทึกรายการได้ครับ ดูสรุปยอดรวมได้ที่หน้า “สรุป” ของแอปนะครับ","transaction":null}
"ข้าว 50 กาแฟ 40 ขนม 20" → {"reply":"เห็น 3 รายการ: ข้าว 50, กาแฟ 40, ขนม 20 — รบกวนพิมพ์ทีละรายการนะครับ จะได้บันทึกถูกต้องครบทุกอัน","transaction":null}
"ซื้อของที่ 7-11" → {"reply":"ซื้อไปเท่าไหร่ครับ จะได้บันทึกให้","transaction":null}

ตอบกลับเป็น JSON เท่านั้น:
{
  "reply": "ข้อความตอบกลับภาษาไทย",
  "transaction": null หรือ {
    "type": "income" | "expense",
    "amount": number,
    "description": "รายละเอียด",
    "category_id": "uuid หรือ null",
    "category_name": "ชื่อหมวดหมู่"
  }
}`;
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const geminiApiKey =
      (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env
        ?.GEMINI_API_KEY ??
      (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env
        ?.GOOGLE_AI_KEY;
    if (!geminiApiKey) {
      return json(
        { reply: "ยังไม่ได้ตั้งค่าคีย์ AI", transaction: null, error: "GEMINI_API_KEY not configured" },
        500
      );
    }

    const body = await req.json().catch(() => null);
    const message: unknown = body?.message;
    if (!message || typeof message !== "string" || message.length > 2000) {
      return json({ error: "Invalid message" }, 400);
    }
    const categories: Category[] = Array.isArray(body?.categories) ? body.categories : [];
    const history: HistoryItem[] = Array.isArray(body?.history) ? body.history : [];

    const chatMessages: Array<{ role: string; content: string }> = [
      { role: "system", content: buildSystemPrompt(categories) },
    ];
    for (const h of history.slice(-10)) {
      if (h?.role && h?.content && (h.role === "user" || h.role === "assistant")) {
        chatMessages.push({ role: h.role, content: String(h.content).slice(0, 2000) });
      }
    }
    chatMessages.push({ role: "user", content: message });

    const envModel = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process
      ?.env?.GEMINI_MODEL;
    // ลองหลายรุ่นตามลำดับ — ถ้ารุ่นไหน 404 (key เข้าถึงไม่ได้) จะลองรุ่นถัดไปอัตโนมัติ
    const models = [envModel, "gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"].filter(
      (m, i, arr): m is string => !!m && arr.indexOf(m) === i
    );

    let response: Response | null = null;
    // เก็บ error ที่ "มีความหมายที่สุด" — 404 (รุ่นไม่พบ) มีความหมายน้อยสุด จึงให้ error อื่นทับได้
    let best: { status: number; text: string; model: string } | null = null;
    for (const model of models) {
      const r = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
        {
          method: "POST",
          headers: { Authorization: `Bearer ${geminiApiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model,
            messages: chatMessages,
            response_format: { type: "json_object" },
          }),
        }
      );
      if (r.ok) {
        response = r;
        break;
      }
      const text = await r.text();
      console.error(`AI API error (${model}):`, r.status, text);
      // เก็บอันแรก หรืออัปเกรดจาก 404 ไปเป็น error ที่มีความหมายกว่า (เช่น 429 quota จริง)
      if (!best || (best.status === 404 && r.status !== 404)) best = { status: r.status, text, model };
      // ลองรุ่นถัดไปเมื่อ 404 (รุ่นไม่พบ) หรือ 429 (โควตารุ่นนี้ตัน — รุ่นอื่นอาจยังเหลือ)
      if (r.status !== 404 && r.status !== 429) break;
    }

    if (!response) {
      const b = best ?? { status: 0, text: "", model: "-" };
      let reason = "";
      try {
        reason = JSON.parse(b.text)?.error?.message ?? "";
      } catch {
        reason = b.text.slice(0, 200);
      }
      // คงรหัสสถานะจริงไว้ (429/402 มีข้อความเฉพาะในแอป) แต่แนบเหตุผล+ชื่อรุ่นจาก Gemini มาด้วย
      const status = b.status === 429 || b.status === 402 ? b.status : 500;
      return json(
        {
          reply: "ขออภัย เรียก AI ไม่สำเร็จ",
          transaction: null,
          error: `AI API error: ${b.status} [${b.model}]${reason ? ` — ${reason}` : ""}`,
        },
        status
      );
    }

    const data = await response.json();
    let raw = String(data.choices?.[0]?.message?.content ?? "").trim();
    if (raw.startsWith("```json")) raw = raw.slice(7);
    else if (raw.startsWith("```")) raw = raw.slice(3);
    if (raw.endsWith("```")) raw = raw.slice(0, -3);
    raw = raw.trim();
    if (!raw) return json({ reply: "ขออภัย AI ไม่ตอบกลับ", transaction: null, error: "Empty AI response" }, 500);

    const result = JSON.parse(raw);
    return json(result, 200);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("chat-transaction error:", msg);
    return json({ reply: "ขออภัย เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง", transaction: null, error: msg }, 500);
  }
}

function json(obj: unknown, status: number): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}
