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
    const { message, categories, history } = body;

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!message || typeof message !== 'string' || message.length > 2000) {
      return new Response(JSON.stringify({ error: 'Invalid message' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // ===== Load user's full financial context (RLS-protected) =====
    // Use Thailand time (UTC+7)
    const tzNow = new Date(Date.now() + 7 * 60 * 60 * 1000);
    const todayStr = tzNow.toISOString().slice(0, 10);
    const since = new Date(tzNow);
    since.setUTCDate(since.getUTCDate() - 90);
    const sinceStr = since.toISOString().slice(0, 10);
    const cutoff30Date = new Date(tzNow);
    cutoff30Date.setUTCDate(cutoff30Date.getUTCDate() - 30);
    const cutoff30Str = cutoff30Date.toISOString().slice(0, 10);

    const [
      { data: txns },
      { data: accounts },
      { data: liabilities },
      { data: investments },
      { data: savingsGoals },
      { data: recurring },
      { data: liabPayments },
    ] = await Promise.all([
      supabaseClient.from('transactions')
        .select('id,type,amount,description,date,category_id,account_id,currency')
        .gte('date', sinceStr)
        .order('date', { ascending: false })
        .limit(300),
      supabaseClient.from('accounts').select('id,name,type,balance,currency').eq('is_active', true),
      supabaseClient.from('liabilities').select('id,name,type,principal_amount,current_balance,interest_rate,monthly_payment,creditor,start_date,end_date,note').eq('is_active', true),
      supabaseClient.from('investments').select('id,name,symbol,asset_type,quantity,avg_cost,current_price,currency').eq('is_active', true),
      supabaseClient.from('savings_goals').select('id,name,target_amount,current_amount,deadline,is_completed'),
      supabaseClient.from('recurring_transactions').select('id,type,amount,description,frequency,next_execution').eq('is_active', true),
      supabaseClient.from('liability_payments').select('liability_id,amount,principal_amount,interest_amount,payment_date,note').order('payment_date', { ascending: false }).limit(100),
    ]);

    const catMap = new Map<string, string>();
    if (Array.isArray(categories)) {
      for (const c of categories) catMap.set(c.id, `${c.name} (${c.type})`);
    }

    // Aggregate stats from txns
    const txList = txns ?? [];
    let income30 = 0, expense30 = 0, income90 = 0, expense90 = 0;
    const byCat: Record<string, number> = {};
    for (const t of txList) {
      const amt = Number(t.amount) || 0;
      const isRecent = t.date >= cutoff30Str;
      if (t.type === 'income') { income90 += amt; if (isRecent) income30 += amt; }
      else if (t.type === 'expense') {
        expense90 += amt; if (isRecent) expense30 += amt;
        const key = catMap.get(t.category_id ?? '') || 'ไม่ระบุ';
        byCat[key] = (byCat[key] || 0) + amt;
      }
    }
    const topCats = Object.entries(byCat).sort((a,b) => b[1]-a[1]).slice(0, 8)
      .map(([k,v]) => `  - ${k}: ${v.toLocaleString()} ฿`).join('\n');

    const recentTxns = txList.slice(0, 30).map(t => {
      const cat = catMap.get(t.category_id ?? '') || '-';
      return `  ${t.date} | ${t.type} | ${Number(t.amount).toLocaleString()} ${t.currency || 'THB'} | ${t.description || '-'} | ${cat}`;
    }).join('\n');

    const totalBalance = (accounts ?? []).reduce((s, a) => s + Number(a.balance || 0), 0);
    const totalDebt = (liabilities ?? []).reduce((s, l) => s + Number(l.current_balance || 0), 0);
    const portfolioValue = (investments ?? []).reduce((s, i) => s + Number(i.quantity || 0) * Number(i.current_price || 0), 0);
    const portfolioCost = (investments ?? []).reduce((s, i) => s + Number(i.quantity || 0) * Number(i.avg_cost || 0), 0);

    const accountsTxt = (accounts ?? []).map(a => `  - ${a.name} (${a.type}): ${Number(a.balance).toLocaleString()} ${a.currency}`).join('\n') || '  ไม่มี';
    const liabilitiesTxt = (liabilities ?? []).map(l => `  - ${l.name} (${l.type}): ยอดคงเหลือ ${Number(l.current_balance).toLocaleString()} ฿, ดอก ${l.interest_rate}%, จ่าย/ด ${Number(l.monthly_payment||0).toLocaleString()}`).join('\n') || '  ไม่มี';
    const investmentsTxt = (investments ?? []).map(i => {
      const v = Number(i.quantity)*Number(i.current_price||0);
      const c = Number(i.quantity)*Number(i.avg_cost||0);
      const pl = v - c;
      return `  - ${i.name}${i.symbol?` (${i.symbol})`:''} ${i.asset_type}: ${i.quantity} หน่วย, มูลค่า ${v.toLocaleString()} ${i.currency}, P&L ${pl>=0?'+':''}${pl.toLocaleString()}`;
    }).join('\n') || '  ไม่มี';
    const goalsTxt = (savingsGoals ?? []).map(g => {
      const pct = g.target_amount ? (Number(g.current_amount)/Number(g.target_amount)*100).toFixed(0) : '0';
      return `  - ${g.name}: ${Number(g.current_amount).toLocaleString()}/${Number(g.target_amount).toLocaleString()} ฿ (${pct}%)${g.deadline?`, ครบกำหนด ${g.deadline}`:''}`;
    }).join('\n') || '  ไม่มี';
    const recurringTxt = (recurring ?? []).map(r => `  - ${r.type} ${Number(r.amount).toLocaleString()} ฿ ${r.frequency} - ${r.description||'-'} (ครั้งถัดไป ${r.next_execution||'-'})`).join('\n') || '  ไม่มี';

    const categoryList = Array.isArray(categories) && categories.length > 0
      ? categories.map((c: { name: string; id: string; type: string }) => `  - ${c.name} (id: ${c.id}, type: ${c.type})`).join('\n')
      : '  ไม่มีหมวดหมู่ที่กำหนด';

    

    const systemPrompt = `คุณเป็นผู้ช่วยการเงินส่วนตัวของผู้ใช้ คุณสามารถ (1) บันทึกรายรับ/รายจ่ายใหม่ และ (2) ตอบคำถามเกี่ยวกับข้อมูลการเงินทั้งหมดของผู้ใช้ที่เคยบันทึก

วันที่วันนี้: ${todayStr}

== ภาพรวมการเงินของผู้ใช้ ==
- ยอดเงินรวมในบัญชีทั้งหมด: ${totalBalance.toLocaleString()} ฿
- หนี้สินรวม: ${totalDebt.toLocaleString()} ฿
- มูลค่าพอร์ตลงทุน: ${portfolioValue.toLocaleString()} ฿ (ต้นทุน ${portfolioCost.toLocaleString()} ฿)
- รายรับ 30 วันล่าสุด: ${income30.toLocaleString()} ฿
- รายจ่าย 30 วันล่าสุด: ${expense30.toLocaleString()} ฿
- รายรับ 90 วันล่าสุด: ${income90.toLocaleString()} ฿
- รายจ่าย 90 วันล่าสุด: ${expense90.toLocaleString()} ฿

== บัญชี ==
${accountsTxt}

== หนี้สิน ==
${liabilitiesTxt}

== การลงทุน ==
${investmentsTxt}

== เป้าหมายการออม ==
${goalsTxt}

== รายการประจำ (Recurring) ==
${recurringTxt}

== หมวดหมู่รายจ่ายสูงสุด (90 วัน) ==
${topCats || '  ไม่มี'}

== รายการล่าสุด 30 รายการ ==
${recentTxns || '  ไม่มี'}

== หมวดหมู่ทั้งหมด ==
${categoryList}

หน้าที่:
1. ถ้าผู้ใช้พิมพ์รายการรายรับ/รายจ่ายใหม่ (เช่น "กินข้าว 50") → ใส่ใน transaction เพื่อบันทึก
2. ถ้าผู้ใช้ถามคำถามเกี่ยวกับข้อมูลการเงิน (เช่น "เดือนนี้ใช้เท่าไหร่", "หนี้บัตรเครดิตเหลือเท่าไหร่", "หมวดไหนใช้เงินเยอะสุด") → ตอบจากข้อมูลด้านบน โดยตั้ง transaction = null
3. ตอบเป็นภาษาไทยที่กระชับ เข้าใจง่าย พร้อมตัวเลขและคำแนะนำเมื่อเหมาะสม

กฎการบันทึก:
- รายรับ/เงินเดือน/ขาย/ได้เงิน → type = "income"
- ซื้อ/จ่าย/ค่า/กิน → type = "expense"
- ถ้าไม่ระบุจำนวนเงินและตั้งใจจะบันทึก ให้ถามกลับ
- เลือก category_id จากหมวดหมู่ที่มี ถ้าไม่ตรงให้ใส่ null

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

    // Build messages with conversation history
    const chatMessages: Array<{ role: string; content: string }> = [
      { role: 'system', content: systemPrompt },
    ];
    if (Array.isArray(history)) {
      for (const h of history.slice(-10)) {
        if (h?.role && h?.content && (h.role === 'user' || h.role === 'assistant')) {
          chatMessages.push({ role: h.role, content: String(h.content).slice(0, 2000) });
        }
      }
    }
    chatMessages.push({ role: 'user', content: message });

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: chatMessages,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
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
    const rawContent = data.choices?.[0]?.message?.content ?? '';
    console.log('AI raw response:', rawContent.substring(0, 500));

    let aiResponse = rawContent.trim();
    if (aiResponse.startsWith('```json')) aiResponse = aiResponse.slice(7);
    else if (aiResponse.startsWith('```')) aiResponse = aiResponse.slice(3);
    if (aiResponse.endsWith('```')) aiResponse = aiResponse.slice(0, -3);
    aiResponse = aiResponse.trim();

    if (!aiResponse) throw new Error('Empty AI response');

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
