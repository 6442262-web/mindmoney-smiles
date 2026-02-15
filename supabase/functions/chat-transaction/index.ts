import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const body = await req.json();
    const { message, categories } = body;

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!message || typeof message !== 'string' || message.length > 1000) {
      return new Response(JSON.stringify({ error: 'Invalid message' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const categoryList = Array.isArray(categories) && categories.length > 0
      ? categories.map((c: { name: string; id: string; type: string }) => `- ${c.name} (id: ${c.id}, type: ${c.type})`).join('\n')
      : 'ไม่มีหมวดหมู่ที่กำหนด';

    const systemPrompt = `คุณเป็นผู้ช่วยบันทึกรายรับรายจ่าย ผู้ใช้จะพิมพ์ข้อความบอกรายการ เช่น "กินข้าว 50 บาท" หรือ "เงินเดือน 30000"

หน้าที่ของคุณ:
1. วิเคราะห์ข้อความและดึงข้อมูลรายการ (ประเภท, จำนวนเงิน, รายละเอียด, หมวดหมู่)
2. เลือกหมวดหมู่ที่เหมาะสมจากรายการที่มี
3. ตอบกลับเป็น JSON เสมอ

หมวดหมู่ที่มี:
${categoryList}

กฎ:
- ถ้าพูดถึงรายรับ/เงินเดือน/ขาย/ได้เงิน → type = "income"
- ถ้าพูดถึงซื้อ/จ่าย/ค่า/กิน → type = "expense"
- ถ้าไม่ระบุจำนวนเงิน ให้ถามกลับ
- ถ้าข้อความไม่เกี่ยวกับรายรับรายจ่าย ให้ตอบปกติโดยไม่มี transaction
- เลือก category_id จากรายการที่มี ถ้าไม่ตรงให้ใส่ null

ตอบกลับเป็น JSON เท่านั้น:
{
  "reply": "ข้อความตอบกลับผู้ใช้ภาษาไทย",
  "transaction": null หรือ {
    "type": "income" หรือ "expense",
    "amount": ตัวเลข,
    "description": "รายละเอียด",
    "category_id": "uuid หรือ null",
    "category_name": "ชื่อหมวดหมู่ที่เลือก"
  }
}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    let aiResponse = data.choices[0].message.content.trim();
    
    // Clean markdown
    if (aiResponse.startsWith('```json')) aiResponse = aiResponse.slice(7);
    else if (aiResponse.startsWith('```')) aiResponse = aiResponse.slice(3);
    if (aiResponse.endsWith('```')) aiResponse = aiResponse.slice(0, -3);
    aiResponse = aiResponse.trim();

    const result = JSON.parse(aiResponse);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Chat transaction error:', error);
    return new Response(JSON.stringify({
      reply: 'ขออภัย เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง',
      transaction: null,
    }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
