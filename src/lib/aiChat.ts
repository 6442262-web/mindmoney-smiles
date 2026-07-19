import { supabase } from "@/integrations/supabase/client";

// เรียกฟังก์ชัน AI บันทึกรายการที่ /api/chat-transaction (Vercel Edge Function)
// คืนรูปแบบ { data, error } เหมือน supabase.functions.invoke เพื่อให้ผู้เรียกเปลี่ยนน้อยที่สุด
// error.context เป็น Response ดิบ → ใช้กับ describeFunctionError ได้เหมือนเดิม

export interface ChatTransactionBody {
  message: string;
  categories?: Array<{ id: string; name: string; type: string }>;
  history?: Array<{ role: string; content: string }>;
}

export interface ChatTransactionResult {
  reply?: string;
  transaction?: unknown;
}

export async function invokeChatTransaction(
  body: ChatTransactionBody
): Promise<{ data: ChatTransactionResult | null; error: unknown }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("/api/chat-transaction", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      // เลียนแบบ FunctionsHttpError ของ supabase-js (มี context เป็น Response)
      return {
        data: null,
        error: { name: "FunctionsHttpError", message: `Edge Function returned ${res.status}`, context: res },
      };
    }
    return { data: await res.json(), error: null };
  } catch (e) {
    return {
      data: null,
      error: { name: "FunctionsFetchError", message: (e as Error)?.message ?? "fetch failed" },
    };
  }
}
