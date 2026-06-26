import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const googleAiKey = Deno.env.get('GOOGLE_AI_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExpenseInput {
  detail?: string;
  description?: string;
  amount?: number;
}

function validateExpenses(expenses: unknown): { valid: boolean; error?: string; data?: ExpenseInput[] } {
  if (!Array.isArray(expenses)) return { valid: false, error: 'Expenses must be an array' };
  if (expenses.length === 0) return { valid: false, error: 'At least one expense is required' };
  if (expenses.length > 100) return { valid: false, error: 'Maximum 100 expenses allowed' };

  const validatedExpenses: ExpenseInput[] = [];
  for (let i = 0; i < expenses.length; i++) {
    const expense = expenses[i];
    if (typeof expense !== 'object' || expense === null) return { valid: false, error: `Invalid expense at index ${i}` };

    const { detail, description, amount } = expense as ExpenseInput;
    if (amount !== undefined) {
      if (typeof amount !== 'number' || isNaN(amount)) return { valid: false, error: `Invalid amount at index ${i}` };
      if (amount < -10000000 || amount > 10000000) return { valid: false, error: `Amount out of range at index ${i}` };
    }
    if (detail !== undefined && (typeof detail !== 'string' || detail.length > 500)) return { valid: false, error: `Invalid detail at index ${i}` };
    if (description !== undefined && (typeof description !== 'string' || description.length > 500)) return { valid: false, error: `Invalid description at index ${i}` };

    validatedExpenses.push({
      detail: detail ? detail.slice(0, 500).replace(/[<>{}]/g, '') : undefined,
      description: description ? description.slice(0, 500).replace(/[<>{}]/g, '') : undefined,
      amount: amount
    });
  }
  return { valid: true, data: validatedExpenses };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const body = await req.json();
    const validation = validateExpenses(body.expenses);
    if (!validation.valid) return new Response(JSON.stringify({ error: validation.error }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const validatedExpenses = validation.data!;
    if (!googleAiKey) throw new Error('GOOGLE_AI_KEY not configured');

    const totalAmount = validatedExpenses.reduce((s, e) => s + (e.amount || 0), 0);
    const avgAmount = totalAmount / validatedExpenses.length;

    const systemPrompt = `คุณเป็นที่ปรึกษาทางการเงินส่วนตัวระดับมืออาชีพ มีความเชี่ยวชาญในการวิเคราะห์รายจ่ายเชิงลึก

หน้าที่ของคุณ:
1. จัดหมวดหมู่รายจ่ายอย่างแม่นยำ
2. ตรวจจับความผิดปกติ (เช่น ยอดเงินสูงผิดปกติเมื่อเทียบกับค่าเฉลี่ย, รายการที่ไม่สมเหตุสมผล, รายการซ้ำ)
3. ให้คำแนะนำการประหยัดที่ปฏิบัติได้จริง
4. ประเมินระดับความเสี่ยงทางการเงิน

หมวดหมู่: อาหารและเครื่องดื่ม, เดินทาง, สุขภาพ, การศึกษา, ความบันเทิง, ที่อยู่อาศัย, เสื้อผ้า, ช้อปปิ้ง, บิล/สาธารณูปโภค, ดิจิทัล/สมัครสมาชิก, อื่นๆ

สถานะ: "ปกติ" (ไม่มีปัญหา), "ตรวจสอบ" (ควรทบทวน), "ผิดปกติ" (มีปัญหาชัดเจน)

ค่าเฉลี่ยต่อรายการ: ${avgAmount.toFixed(0)} บาท — ใช้เป็นเกณฑ์ตรวจจับความผิดปกติ

ตอบกลับเป็น JSON เท่านั้น ไม่มีข้อความอื่น`;

    const userPrompt = `วิเคราะห์รายจ่าย ${validatedExpenses.length} รายการ (ยอดรวม ${totalAmount.toLocaleString()} บาท):

${validatedExpenses.map((e, i) => `${i + 1}. ${e.detail || e.description || 'ไม่ระบุ'} - ${e.amount || 0} บาท`).join('\n')}

ตอบในรูปแบบ JSON นี้:
{
  "expenses": [
    {
      "detail": "รายละเอียด",
      "amount": จำนวนเงิน,
      "category": "หมวดหมู่",
      "status": "ปกติ/ตรวจสอบ/ผิดปกติ",
      "suggestion": "คำแนะนำเฉพาะรายการ (ถ้ามี หรือ null)",
      "risk_score": 0-100
    }
  ],
  "summary": {
    "total": ยอดรวม,
    "risk_level": "ต่ำ/ปานกลาง/สูง",
    "savings_potential": จำนวนเงินที่คาดว่าประหยัดได้ต่อเดือน,
    "top_category": "หมวดหมู่ที่ใช้จ่ายมากที่สุด",
    "anomaly_count": จำนวนรายการผิดปกติ,
    "warnings": ["คำเตือนเรื่องสำคัญ"],
    "insights": ["คำแนะนำการจัดการเงินที่เจาะจงและปฏิบัติได้จริง เช่น ลดค่าอาหารนอกบ้านลง 20% จะประหยัดได้ X บาท/เดือน"]
  }
}`;

    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${googleAiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      if (response.status === 402) return new Response(JSON.stringify({ error: 'Please add credits' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;
    
    try {
      let cleaned = aiResponse.trim();
      if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
      else if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
      if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
      cleaned = cleaned.trim();
      
      const result = JSON.parse(cleaned);
      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    } catch {
      // Fallback
      const fallback = {
        expenses: validatedExpenses.map((e) => ({
          detail: e.detail || e.description || 'ไม่ระบุ',
          amount: e.amount || 0,
          category: 'อื่นๆ',
          status: 'ตรวจสอบ',
          suggestion: 'ไม่สามารถวิเคราะห์ได้ กรุณาตรวจสอบด้วยตนเอง',
          risk_score: 50,
        })),
        summary: {
          total: totalAmount,
          risk_level: 'ปานกลาง',
          savings_potential: 0,
          top_category: 'อื่นๆ',
          anomaly_count: 0,
          warnings: ['ระบบไม่สามารถวิเคราะห์ได้อย่างสมบูรณ์'],
          insights: ['กรุณาตรวจสอบรายการด้วยตนเอง']
        }
      };
      return new Response(JSON.stringify(fallback), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ 
      error: 'An error occurred',
      expenses: [],
      summary: { total: 0, risk_level: 'ไม่ทราบ', warnings: ['เกิดข้อผิดพลาดในระบบ'], insights: [] }
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
