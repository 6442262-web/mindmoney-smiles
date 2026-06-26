import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const googleAiKey = Deno.env.get('GOOGLE_AI_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CategoryInput {
  name?: string;
  monthly?: number;
}

interface ForecastInput {
  avgMonthly?: number;
  trendSlope?: number;
  recurringBaseline?: number;
  forecastTotals?: number[];
  forecastAvg?: number;
  monthsOfData?: number;
  confidence?: string;
  method?: string;
  monthlyIncome?: number;
  categories?: CategoryInput[];
}

function num(v: unknown): number {
  return typeof v === 'number' && isFinite(v) ? v : 0;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  // Statistical fallback so the feature still returns something useful if the AI
  // call fails or the key is missing.
  const buildFallback = (f: ForecastInput) => {
    const advice: string[] = [];
    const avg = num(f.forecastAvg) || num(f.avgMonthly);
    if (f.monthlyIncome && avg > num(f.monthlyIncome)) {
      advice.push('รายจ่ายคาดการณ์สูงกว่ารายรับ ควรลดค่าใช้จ่ายที่ไม่จำเป็นลงโดยด่วน');
    }
    if (num(f.trendSlope) > 0) {
      advice.push('แนวโน้มรายจ่ายกำลังเพิ่มขึ้น ลองตั้งงบประมาณรายเดือนเพื่อควบคุม');
    }
    if (f.categories && f.categories.length > 0) {
      advice.push(`หมวด "${f.categories[0].name ?? 'ไม่ระบุ'}" ใช้จ่ายมากที่สุด ลองทบทวนว่าลดได้หรือไม่`);
    }
    if (advice.length === 0) advice.push('รักษาวินัยการใช้จ่ายให้คงที่ และกันเงินออมทุกเดือน');
    return {
      summary: `คาดการณ์รายจ่ายเฉลี่ยประมาณ ${Math.round(avg).toLocaleString('th-TH')} บาท/เดือน ในอีก ${(f.forecastTotals?.length ?? 3)} เดือนข้างหน้า`,
      advice,
      fallback: true,
    };
  };

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
    const f: ForecastInput = body?.forecast ?? {};

    if (!googleAiKey) {
      return new Response(JSON.stringify(buildFallback(f)), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const topCategories = (f.categories ?? [])
      .slice(0, 5)
      .map((c) => `- ${c.name ?? 'ไม่ระบุ'}: ~${Math.round(num(c.monthly)).toLocaleString('th-TH')} บาท/เดือน`)
      .join('\n');

    const systemPrompt = `คุณเป็นที่ปรึกษาทางการเงินส่วนตัวที่ให้คำแนะนำเชิงปฏิบัติ กระชับ และเป็นกันเอง
ตอบกลับเป็น JSON เท่านั้น ไม่มีข้อความอื่นนอก JSON
- "summary": สรุปแนวโน้มรายจ่ายล่วงหน้าแบบเข้าใจง่าย 1-2 ประโยค
- "advice": อาเรย์ของคำแนะนำที่เจาะจงและทำได้จริง 3-4 ข้อ (อ้างอิงตัวเลขจริงเมื่อเหมาะสม)`;

    const userPrompt = `ข้อมูลคาดการณ์รายจ่าย (คำนวณด้วยสถิติแล้ว):
- รายจ่ายเฉลี่ยย้อนหลัง: ${Math.round(num(f.avgMonthly)).toLocaleString('th-TH')} บาท/เดือน (จากข้อมูล ${num(f.monthsOfData)} เดือน)
- แนวโน้มต่อเดือน: ${num(f.trendSlope) >= 0 ? '+' : ''}${Math.round(num(f.trendSlope)).toLocaleString('th-TH')} บาท/เดือน
- ค่าใช้จ่ายประจำขั้นต่ำ: ${Math.round(num(f.recurringBaseline)).toLocaleString('th-TH')} บาท/เดือน
- คาดการณ์รายจ่าย 3 เดือนข้างหน้า: ${(f.forecastTotals ?? []).map((v) => Math.round(num(v)).toLocaleString('th-TH')).join(', ')} บาท
- เฉลี่ยคาดการณ์: ${Math.round(num(f.forecastAvg)).toLocaleString('th-TH')} บาท/เดือน
- ระดับความเชื่อมั่น: ${f.confidence ?? 'ไม่ทราบ'}
- โมเดลที่ใช้: ${f.method ?? 'ไม่ระบุ'}
${f.monthlyIncome ? `- รายรับเฉลี่ย: ${Math.round(num(f.monthlyIncome)).toLocaleString('th-TH')} บาท/เดือน` : ''}
${topCategories ? `หมวดที่ใช้จ่ายมากที่สุด:\n${topCategories}` : ''}

ตอบในรูปแบบ JSON:
{ "summary": "...", "advice": ["...", "...", "..."] }`;

    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${googleAiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      if (response.status === 402) return new Response(JSON.stringify({ error: 'API payment required' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      const errorText = await response.text();
      console.error('Google AI API error:', response.status, errorText);
      // Degrade gracefully to the statistical summary.
      return new Response(JSON.stringify(buildFallback(f)), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content ?? '';

    try {
      let cleaned = String(aiResponse).trim();
      if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
      else if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
      if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
      cleaned = cleaned.trim();

      const result = JSON.parse(cleaned);
      const summary = typeof result.summary === 'string' ? result.summary : buildFallback(f).summary;
      const advice = Array.isArray(result.advice) ? result.advice.filter((a: unknown) => typeof a === 'string').slice(0, 6) : buildFallback(f).advice;
      return new Response(JSON.stringify({ summary, advice }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    } catch {
      return new Response(JSON.stringify(buildFallback(f)), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: 'An error occurred', summary: '', advice: [] }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
