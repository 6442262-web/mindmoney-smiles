import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('Scan slip request received');

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
    const { imageBase64 } = body;

    if (!imageBase64) {
      return new Response(JSON.stringify({ error: 'Image data is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate base64 size (max 10MB)
    const estimatedSize = (imageBase64.length * 3) / 4;
    if (estimatedSize > 10 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: 'Image too large (max 10MB)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Use Gemini vision model to analyze the slip
    const systemPrompt = `คุณเป็นระบบ OCR สำหรับอ่านสลิปโอนเงินและใบเสร็จรับเงินของประเทศไทย
    
กรุณาวิเคราะห์รูปภาพและดึงข้อมูลต่อไปนี้:
1. จำนวนเงิน (ตัวเลข)
2. วันที่ทำรายการ (ถ้ามี)
3. ชื่อผู้รับเงิน/ร้านค้า (ถ้ามี)
4. หมายเหตุหรือรายละเอียดเพิ่มเติม (ถ้ามี)
5. ประเภทธุรกรรม (โอนเงิน, ชำระเงิน, ซื้อสินค้า, ฯลฯ)

ตอบกลับเป็น JSON เท่านั้น ในรูปแบบ:
{
  "success": true,
  "amount": จำนวนเงิน (ตัวเลขเท่านั้น),
  "date": "วันที่ในรูปแบบ YYYY-MM-DD" หรือ null,
  "recipient": "ชื่อผู้รับ/ร้านค้า" หรือ null,
  "description": "รายละเอียด/หมายเหตุ" หรือ null,
  "transactionType": "expense" หรือ "income",
  "suggestedCategory": "หมวดหมู่ที่แนะนำ",
  "confidence": ระดับความมั่นใจ 0-100
}

หมวดหมู่ที่ใช้ได้:
- อาหาร
- ค่าเดินทาง
- ช้อปปิ้ง
- บิล/ค่าใช้จ่าย
- สุขภาพ
- บันเทิง
- การศึกษา
- ของใช้
- โอนเงิน
- อื่นๆ

ถ้าไม่สามารถอ่านรูปได้หรือไม่ใช่สลิป ให้ตอบ:
{
  "success": false,
  "error": "ไม่สามารถอ่านข้อมูลจากรูปได้"
}`;

    console.log('Sending image to Gemini for analysis...');
    
    // Clean base64 string - remove data URL prefix if present
    let cleanBase64 = imageBase64;
    if (imageBase64.includes(',')) {
      cleanBase64 = imageBase64.split(',')[1];
    }
    
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { 
            role: 'user', 
            content: [
              { type: 'text', text: systemPrompt },
              { 
                type: 'image_url', 
                image_url: { 
                  url: `data:image/jpeg;base64,${cleanBase64}` 
                } 
              }
            ]
          }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.error('Rate limit exceeded');
        return new Response(JSON.stringify({ error: 'Rate limit exceeded, please try again later' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        console.error('Payment required');
        return new Response(JSON.stringify({ error: 'Please add credits to your Lovable workspace' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorData = await response.text();
      console.error('Lovable AI API error:', response.status, errorData);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Gemini response received');
    
    const aiResponse = data.choices[0].message.content;
    
    try {
      // Clean the response - remove markdown code blocks if present
      let cleanedResponse = aiResponse.trim();
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.slice(7);
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.slice(3);
      }
      if (cleanedResponse.endsWith('```')) {
        cleanedResponse = cleanedResponse.slice(0, -3);
      }
      cleanedResponse = cleanedResponse.trim();
      
      // Parse the JSON response from AI
      const result = JSON.parse(cleanedResponse);
      
      console.log('Slip scan result:', result);
      
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      console.error('AI response:', aiResponse);
      
      return new Response(JSON.stringify({
        success: false,
        error: 'ไม่สามารถประมวลผลข้อมูลจากรูปได้'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('Error in scan-slip function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ 
      success: false,
      error: 'เกิดข้อผิดพลาดในการสแกนสลิป'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
