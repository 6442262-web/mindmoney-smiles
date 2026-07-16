// แปลง error จาก supabase.functions.invoke ให้เป็นข้อความไทยที่บอก "สาเหตุจริง"
// ใช้ตอน AI แชท/สแกนสลิป/หน้าการทดลอง error จะได้รู้ว่าติดตรงไหน (deploy? key? เน็ต?)

interface FunctionErrorLike {
  name?: string;
  message?: string;
  context?: Response; // supabase-js ใส่ Response ดิบไว้ที่นี่เมื่อฟังก์ชันตอบ non-2xx
}

/** อ่านฟิลด์ error จาก body ของ response (ถ้ามี) แบบไม่พังถ้า parse ไม่ได้ */
async function readBodyError(ctx: Response): Promise<string> {
  try {
    const j = await ctx.clone().json();
    return typeof j?.error === "string" ? j.error : "";
  } catch {
    return "";
  }
}

/** คืนข้อความไทยอธิบายสาเหตุ error ของการเรียก edge function */
export async function describeFunctionError(error: unknown): Promise<string> {
  const err = error as FunctionErrorLike;
  const ctx = err?.context;

  if (ctx && typeof ctx.status === "number") {
    const status = ctx.status;
    const bodyErr = await readBodyError(ctx);

    if (/not configured|GEMINI|GOOGLE_AI/i.test(bodyErr)) {
      return "ยังไม่ได้ตั้งค่าคีย์ AI (GEMINI_API_KEY) ใน Supabase → Edge Functions → Secrets";
    }
    if (status === 404) {
      return "ไม่พบฟังก์ชัน AI บนเซิร์ฟเวอร์ — ยังไม่ได้ deploy หรือชื่อฟังก์ชันไม่ตรงกับ “chat-transaction”";
    }
    if (status === 401 || status === 403) {
      return "เซสชันหมดอายุหรือไม่มีสิทธิ์ กรุณาออกจากระบบแล้วเข้าใหม่";
    }
    if (status === 429) {
      return "เรียก AI บ่อยเกินไป (rate limit) รอสักครู่แล้วลองใหม่";
    }
    if (status === 402) {
      return "โควตา AI หมด กรุณาตรวจสอบบัญชี Gemini/Google AI";
    }
    if (status >= 500) {
      return `ฟังก์ชัน AI ทำงานผิดพลาด (${status})` + (bodyErr ? ` — ${bodyErr}` : "");
    }
    return `เกิดข้อผิดพลาด (${status})` + (bodyErr ? ` — ${bodyErr}` : "");
  }

  // เรียกไม่ถึงเซิร์ฟเวอร์เลย (เน็ต/CORS/DNS)
  if (err?.name === "FunctionsFetchError" || /fetch|network|failed to/i.test(err?.message ?? "")) {
    return "เชื่อมต่อเซิร์ฟเวอร์ AI ไม่ได้ — ตรวจสอบอินเทอร์เน็ตแล้วลองใหม่";
  }

  return err?.message || "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง";
}
