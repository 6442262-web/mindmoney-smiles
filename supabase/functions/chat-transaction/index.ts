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

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY') ?? Deno.env.get('GOOGLE_AI_KEY');
    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY (or GOOGLE_AI_KEY) not configured');
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
    const REFINANCE_TARGET: Record<string, number> = { credit_card: 12, personal_loan: 8, car_loan: 5, mortgage: 4, loan: 7 };
    const liabList = liabilities ?? [];
    const totalMonthlyDebtPayment = liabList.reduce((s, l) => s + Number(l.monthly_payment || 0), 0);
    const totalYearlyInterest = liabList.reduce((s, l) => s + (Number(l.current_balance || 0) * Number(l.interest_rate || 0) / 100), 0);
    const paymentsByLiab: Record<string, { count: number; total: number; lastDate?: string }> = {};
    for (const p of (liabPayments ?? [])) {
      const k = p.liability_id;
      if (!paymentsByLiab[k]) paymentsByLiab[k] = { count: 0, total: 0 };
      paymentsByLiab[k].count++;
      paymentsByLiab[k].total += Number(p.amount || 0);
      if (!paymentsByLiab[k].lastDate || p.payment_date > paymentsByLiab[k].lastDate!) paymentsByLiab[k].lastDate = p.payment_date;
    }
    const refinanceList: string[] = [];
    const liabilitiesTxt = liabList.map(l => {
      const rate = Number(l.interest_rate || 0);
      const bal = Number(l.current_balance || 0);
      const yearlyInt = bal * rate / 100;
      const target = REFINANCE_TARGET[l.type] ?? 7;
      const pay = paymentsByLiab[l.id];
      const payInfo = pay ? `, จ่ายมาแล้ว ${pay.count} ครั้ง รวม ${pay.total.toLocaleString()} ฿ (ล่าสุด ${pay.lastDate})` : ', ยังไม่มีประวัติจ่าย';
      if (rate >= target + 2) {
        const saving = ((rate - target) / 100) * bal;
        refinanceList.push(`  - ${l.name}: ดอกปัจจุบัน ${rate}% สูงกว่าเรตตลาด ${target}% — ประหยัดได้ราว ${saving.toLocaleString(undefined,{maximumFractionDigits:0})} ฿/ปี`);
      }
      return `  - ${l.name} (${l.type})${l.creditor?` [${l.creditor}]`:''}: ยอดคงเหลือ ${bal.toLocaleString()} ฿ จากต้น ${Number(l.principal_amount||0).toLocaleString()}, ดอก ${rate}%/ปี (~${yearlyInt.toLocaleString(undefined,{maximumFractionDigits:0})} ฿/ปี), จ่าย/ด ${Number(l.monthly_payment||0).toLocaleString()} ฿${l.end_date?`, ครบกำหนด ${l.end_date}`:''}${payInfo}`;
    }).join('\n') || '  ไม่มี';
    const refinanceTxt = refinanceList.length ? refinanceList.join('\n') : '  ไม่มีหนี้ที่ควรรีไฟแนนซ์ในตอนนี้';
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
- หนี้สินรวม: ${totalDebt.toLocaleString()} ฿ (จ่าย/เดือนรวม ${totalMonthlyDebtPayment.toLocaleString()} ฿, ดอกเบี้ยรวม ~${totalYearlyInterest.toLocaleString(undefined,{maximumFractionDigits:0})} ฿/ปี)
- มูลค่าพอร์ตลงทุน: ${portfolioValue.toLocaleString()} ฿ (ต้นทุน ${portfolioCost.toLocaleString()} ฿)
- รายรับ 30 วันล่าสุด: ${income30.toLocaleString()} ฿
- รายจ่าย 30 วันล่าสุด: ${expense30.toLocaleString()} ฿
- รายรับ 90 วันล่าสุด: ${income90.toLocaleString()} ฿
- รายจ่าย 90 วันล่าสุด: ${expense90.toLocaleString()} ฿

== บัญชี ==
${accountsTxt}

== หนี้สิน (รายละเอียด + ประวัติการจ่าย) ==
${liabilitiesTxt}

== แนะนำให้รีไฟแนนซ์ ==
${refinanceTxt}

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

== กฎการตีความจำนวนเงิน (สำคัญมาก) ==
- แปลงทุกรูปแบบเป็นตัวเลข: เลขไทย "๕๐"→50, ตัวหนังสือ "สามร้อย"→300, "ห้าร้อยห้าสิบ"→550, "พันนึง/พันหนึ่ง"→1000, "สองพันห้า"→2500, "หมื่นห้า"→15000, "แสนสอง"→120000
- ตัวย่อ: "1.5k"→1500, "2k"→2000, "3 พัน"→3000, "ครึ่งร้อย"→50
- "บาทห้าสิบ" หลังจำนวนเต็ม เช่น "35 บาท 50 สตางค์"→35.5
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
- เลือก category_id จากรายการหมวดหมู่ทั้งหมดด้านบนเท่านั้น (id ต้องตรงเป๊ะ) ถ้าไม่มีหมวดที่เข้าเค้าให้ใส่ null ทั้ง id และใส่ชื่อหมวดที่เหมาะใน category_name

== กฎอื่น ==
- ประโยคคำถาม/บ่น/เล่าเฉย ๆ ที่ไม่ได้ตั้งใจบันทึก → transaction = null เสมอ แม้จะมีตัวเลขในประโยค (เช่น "เดือนนี้ค่ากาแฟรวมเท่าไหร่","งบ 500 พอไหม")
- หลายรายการในข้อความเดียว (เช่น "ข้าว 50 กาแฟ 40") → transaction = null แล้วขอให้พิมพ์ทีละรายการ พร้อมสรุปรายการที่เห็น
- ไม่มีจำนวนเงิน → transaction = null แล้วถามจำนวน

== ตัวอย่าง (ทำตามรูปแบบนี้เป๊ะ) ==
"กินข้าว 50" → {"reply":"บันทึกค่าข้าว 50 บาทนะครับ","transaction":{"type":"expense","amount":50,"description":"กินข้าว","category_id":"<id ของหมวดอาหารถ้ามี>","category_name":"อาหาร"}}
"เมื่อวานจ่ายค่าเน็ตไปสามร้อย" → {"reply":"บันทึกค่าเน็ต 300 บาทครับ","transaction":{"type":"expense","amount":300,"description":"ค่าเน็ต","category_id":"<id หมวดบิล>","category_name":"บิล/ค่าใช้จ่าย"}}
"ค่าวิน ๒๕" → {"reply":"บันทึกค่าวินมอเตอร์ไซค์ 25 บาทครับ","transaction":{"type":"expense","amount":25,"description":"ค่าวินมอเตอร์ไซค์","category_id":"<id หมวดค่าเดินทาง>","category_name":"ค่าเดินทาง"}}
"เติมเกม 1.5k" → {"reply":"บันทึกค่าเติมเกม 1,500 บาทครับ","transaction":{"type":"expense","amount":1500,"description":"เติมเกม","category_id":"<id หมวดบันเทิง>","category_name":"บันเทิง"}}
"แม่ให้เงินห้าร้อย" → {"reply":"บันทึกรายรับ 500 บาทจากคุณแม่ครับ","transaction":{"type":"income","amount":500,"description":"แม่ให้เงิน","category_id":null,"category_name":"ของขวัญ"}}
"เงินเดือนเข้า 15,000" → {"reply":"บันทึกเงินเดือน 15,000 บาทครับ 🎉","transaction":{"type":"income","amount":15000,"description":"เงินเดือน","category_id":"<id หมวดเงินเดือนถ้ามี>","category_name":"เงินเดือน"}}
"ทำบุญร้อยนึง" → {"reply":"บันทึกทำบุญ 100 บาทครับ","transaction":{"type":"expense","amount":100,"description":"ทำบุญ","category_id":null,"category_name":"อื่นๆ"}}
"ซื้อชานมไข่มุก 35 บาท 50 สตางค์" → {"reply":"บันทึกค่าชานมไข่มุก 35.50 บาทครับ","transaction":{"type":"expense","amount":35.5,"description":"ชานมไข่มุก","category_id":"<id หมวดอาหาร>","category_name":"อาหาร"}}
"เดือนนี้ใช้เงินไปเท่าไหร่แล้ว" → {"reply":"เดือนนี้ใช้ไปรวม X บาท (ดูจากข้อมูลด้านบน) ...","transaction":null}
"งบ 500 จะพอกินทั้งอาทิตย์มั้ย" → {"reply":"<วิเคราะห์จากข้อมูลจริงของผู้ใช้>","transaction":null}
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

    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${geminiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gemini-2.5-flash',
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
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({
      reply: 'ขออภัย เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง',
      transaction: null,
      // ส่งสาเหตุจริงกลับไปให้แอปแสดง (ช่วยดีบัก เช่น "not configured" = ยังไม่ได้ตั้งคีย์)
      error: msg,
    }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
