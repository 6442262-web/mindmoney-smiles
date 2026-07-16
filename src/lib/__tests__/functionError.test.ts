import { describe, it, expect } from "vitest";
import { describeFunctionError } from "@/lib/functionError";

// จำลอง error แบบที่ supabase.functions.invoke โยนออกมา (มี context เป็น Response)
function httpError(status: number, body?: object) {
  return {
    name: "FunctionsHttpError",
    message: "Edge Function returned a non-2xx status code",
    context: new Response(body ? JSON.stringify(body) : null, { status }),
  };
}

describe("describeFunctionError", () => {
  it("404 → บอกว่าฟังก์ชันไม่เจอ/ชื่อไม่ตรง", async () => {
    const msg = await describeFunctionError(httpError(404));
    expect(msg).toContain("ไม่พบฟังก์ชัน");
    expect(msg).toContain("chat-transaction");
  });

  it("500 + error ไม่มีคีย์ → บอกให้ตั้ง GEMINI_API_KEY", async () => {
    const msg = await describeFunctionError(httpError(500, { error: "GEMINI_API_KEY (or GOOGLE_AI_KEY) not configured" }));
    expect(msg).toContain("GEMINI_API_KEY");
    expect(msg).toContain("Secrets");
  });

  it("401 → เซสชันหมดอายุ", async () => {
    expect(await describeFunctionError(httpError(401))).toContain("เข้าใหม่");
  });

  it("429 → rate limit", async () => {
    expect(await describeFunctionError(httpError(429))).toContain("rate limit");
  });

  it("500 ทั่วไป → แสดงรหัสสถานะ + สาเหตุจาก body", async () => {
    const msg = await describeFunctionError(httpError(500, { error: "boom" }));
    expect(msg).toContain("500");
    expect(msg).toContain("boom");
  });

  it("เรียกไม่ถึงเซิร์ฟเวอร์ (FunctionsFetchError) → บอกเรื่องเน็ต", async () => {
    const msg = await describeFunctionError({ name: "FunctionsFetchError", message: "Failed to fetch" });
    expect(msg).toContain("อินเทอร์เน็ต");
  });

  it("error ธรรมดาไม่มี context → คืนข้อความ fallback", async () => {
    expect(await describeFunctionError({ message: "อะไรสักอย่าง" })).toBe("อะไรสักอย่าง");
    expect(await describeFunctionError({})).toContain("เกิดข้อผิดพลาด");
  });
});
