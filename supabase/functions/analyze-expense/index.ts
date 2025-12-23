import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation
interface ExpenseInput {
  detail?: string;
  description?: string;
  amount?: number;
}

function validateExpenses(expenses: unknown): { valid: boolean; error?: string; data?: ExpenseInput[] } {
  if (!Array.isArray(expenses)) {
    return { valid: false, error: 'Expenses must be an array' };
  }

  if (expenses.length === 0) {
    return { valid: false, error: 'At least one expense is required' };
  }

  if (expenses.length > 100) {
    return { valid: false, error: 'Maximum 100 expenses allowed per request' };
  }

  const validatedExpenses: ExpenseInput[] = [];

  for (let i = 0; i < expenses.length; i++) {
    const expense = expenses[i];
    
    if (typeof expense !== 'object' || expense === null) {
      return { valid: false, error: `Expense at index ${i} must be an object` };
    }

    const { detail, description, amount } = expense as ExpenseInput;

    // Validate amount
    if (amount !== undefined) {
      if (typeof amount !== 'number' || isNaN(amount)) {
        return { valid: false, error: `Invalid amount at index ${i}` };
      }
      if (amount < -10000000 || amount > 10000000) {
        return { valid: false, error: `Amount out of valid range at index ${i}` };
      }
    }

    // Validate detail
    if (detail !== undefined) {
      if (typeof detail !== 'string') {
        return { valid: false, error: `Detail must be a string at index ${i}` };
      }
      if (detail.length > 500) {
        return { valid: false, error: `Detail too long at index ${i} (max 500 chars)` };
      }
    }

    // Validate description
    if (description !== undefined) {
      if (typeof description !== 'string') {
        return { valid: false, error: `Description must be a string at index ${i}` };
      }
      if (description.length > 500) {
        return { valid: false, error: `Description too long at index ${i} (max 500 chars)` };
      }
    }

    // Sanitize strings to prevent prompt injection
    validatedExpenses.push({
      detail: detail ? detail.slice(0, 500).replace(/[<>{}]/g, '') : undefined,
      description: description ? description.slice(0, 500).replace(/[<>{}]/g, '') : undefined,
      amount: amount
    });
  }

  return { valid: true, data: validatedExpenses };
}

serve(async (req) => {
  console.log('Analyze expense request received');

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Authentication check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      console.error('Authentication failed:', authError?.message);
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('User authenticated:', user.id);

    const body = await req.json();
    const { expenses } = body;

    // Validate input
    const validation = validateExpenses(expenses);
    if (!validation.valid) {
      console.error('Validation failed:', validation.error);
      return new Response(JSON.stringify({ error: validation.error }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const validatedExpenses = validation.data!;
    console.log('Validated expenses for analysis:', validatedExpenses.length, 'items');

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Prepare the prompt for AI analysis
    const systemPrompt = `คุณเป็นผู้เชี่ยวชาญด้านการเงินและการวิเคราะห์รายจ่าย คุณต้องตรวจสอบและจัดหมวดหมู่รายจ่ายดังต่อไปนี้:

หมวดหมู่ที่ใช้งานได้:
- อาหารและเครื่องดื่ม
- เดินทาง
- สุขภาพ
- การศึกษา
- ความบันเทิง
- ค่าใช้จ่ายที่อยู่อาศัย
- เสื้อผ้าและแฟชั่น
- ช้อปปิ้งทั่วไป
- บิล/สาธารณูปโภค
- อื่นๆ

สำหรับแต่ละรายการ ให้:
1. ตรวจสอบความผิดปกติ (เช่น ยอดเงินติดลบ, ยอดเงินสูงผิดปกติ, คำอธิบายไม่สมเหตุสมผล)
2. จัดหมวดหมู่ให้เหมาะสม
3. กำหนดสถานะเป็น "ปกติ", "ตรวจสอบ", หรือ "ผิดปกติ"

ตอบกลับในรูปแบบ JSON เท่านั้น โดยไม่ต้องมีข้อความอื่นเพิ่มเติม`;

    const userPrompt = `รายการรายจ่ายที่ต้องวิเคราะห์:
${validatedExpenses.map((expense: ExpenseInput, index: number) => 
  `${index + 1}. ${expense.detail || expense.description || 'ไม่ระบุรายละเอียด'} - ${expense.amount || 0} บาท`
).join('\n')}

กรุณาวิเคราะห์และตอบกลับในรูปแบบ JSON ดังนี้:
{
  "expenses": [
    {
      "detail": "รายละเอียดรายการ",
      "amount": จำนวนเงิน,
      "category": "หมวดหมู่",
      "status": "สถานะ",
      "suggestion": "คำแนะนำ (ถ้ามี)"
    }
  ],
  "summary": {
    "total": ยอดรวม,
    "warnings": ["คำเตือนต่างๆ"],
    "insights": ["ข้อสังเกตและคำแนะนำ"]
  }
}`;

    console.log('Sending request to OpenAI...');
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', response.status, errorData);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('OpenAI response received');
    
    const aiResponse = data.choices[0].message.content;
    
    try {
      // Parse the JSON response from AI
      const analysisResult = JSON.parse(aiResponse);
      
      return new Response(JSON.stringify(analysisResult), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      console.error('AI response:', aiResponse);
      
      // Fallback analysis if AI response is malformed
      const fallbackResult = {
        expenses: validatedExpenses.map((expense: ExpenseInput) => ({
          detail: expense.detail || expense.description || 'ไม่ระบุรายละเอียด',
          amount: expense.amount || 0,
          category: 'อื่นๆ',
          status: 'ตรวจสอบ',
          suggestion: 'ไม่สามารถวิเคราะห์ได้ กรุณาตรวจสอบด้วยตนเอง'
        })),
        summary: {
          total: validatedExpenses.reduce((sum: number, expense: ExpenseInput) => sum + (expense.amount || 0), 0),
          warnings: ['ระบบไม่สามารถวิเคราะห์ได้อย่างสมบูรณ์'],
          insights: ['กรุณาตรวจสอบรายการด้วยตนเองเพิ่มเติม']
        }
      };
      
      return new Response(JSON.stringify(fallbackResult), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('Error in analyze-expense function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ 
      error: 'An error occurred while processing your request',
      expenses: [],
      summary: {
        total: 0,
        warnings: ['เกิดข้อผิดพลาดในระบบ'],
        insights: []
      }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
