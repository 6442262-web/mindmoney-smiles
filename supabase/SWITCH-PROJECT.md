# คู่มือย้ายไป Supabase โปรเจกต์ใหม่ (xhhtkrfcjhgnwatuetqc)

โค้ดในโปรเจกต์นี้ชี้ไปที่โปรเจกต์ใหม่แล้ว เหลือขั้นตอนที่ต้องทำใน Supabase Dashboard เอง 5 ขั้น

## 1. ใส่ Anon Key

1. เข้า https://supabase.com/dashboard/project/xhhtkrfcjhgnwatuetqc/settings/api-keys
2. copy ค่า **anon / publishable key** (ขึ้นต้น `eyJ...` หรือ `sb_publishable_...`)
   — key นี้เป็น public key สำหรับฝั่ง client เปิดเผยได้ ไม่ใช่ secret
3. เปิดไฟล์ `.env` ที่ root ของโปรเจกต์ แล้ววางแทน `PASTE_YOUR_ANON_KEY_HERE`:
   ```
   VITE_SUPABASE_PUBLISHABLE_KEY="eyJ...ค่าที่ copy มา..."
   ```

## 2. สร้าง schema (ตาราง + RLS + triggers)

1. เข้า SQL Editor: https://supabase.com/dashboard/project/xhhtkrfcjhgnwatuetqc/sql/new
2. เปิดไฟล์ `supabase/setup-new-project.sql` — copy **ทั้งไฟล์** ไปวางแล้วกด **Run**
3. ถ้ามี error ซ้ำซ้อน (เช่น "already exists") จากการรันซ้ำ ให้ข้ามได้ แต่รอบแรกบน DB ว่างควรผ่านหมด

ทางเลือกถ้ามี Supabase CLI: `supabase link --project-ref xhhtkrfcjhgnwatuetqc && supabase db push`

## 3. เปิด Auth providers

เข้า Authentication → Sign In / Up แล้วเปิด:
- **Email** (เปิดอยู่แล้วโดย default)
- **Anonymous sign-in** — แอปมีปุ่ม "เข้าสู่ระบบแบบ Guest"
- **Google** (ถ้าต้องการปุ่ม Google login — ต้องตั้ง OAuth client ใน Google Cloud Console ด้วย)

## 4. ขอ Gemini API Key + deploy edge functions

แอปเลิกใช้ Lovable AI gateway แล้ว — ฟังก์ชัน AI เรียก Google Gemini ตรง:

1. ขอ key ฟรีที่ https://aistudio.google.com/apikey
2. ติดตั้ง Supabase CLI แล้วล็อกอิน จากนั้น:
   ```sh
   supabase link --project-ref xhhtkrfcjhgnwatuetqc
   supabase secrets set GEMINI_API_KEY=ค่า_key_ของคุณ
   supabase functions deploy admin-stats
   supabase functions deploy analyze-expense
   supabase functions deploy chat-transaction
   supabase functions deploy process-recurring-transactions
   supabase functions deploy scan-slip
   supabase functions deploy yahoo-finance
   ```

| ฟังก์ชัน | ใช้ทำอะไร | ต้องการ secret |
|---|---|---|
| chat-transaction | แชทบอทบันทึกรายการ | GEMINI_API_KEY |
| analyze-expense | วิเคราะห์ค่าใช้จ่ายด้วย AI | GEMINI_API_KEY |
| scan-slip | สแกนสลิปโอนเงิน | GEMINI_API_KEY |
| yahoo-finance | ราคาหุ้น/คริปโต/อัตราแลกเปลี่ยน | - |
| process-recurring-transactions | ประมวลผลรายการประจำ | - |
| admin-stats | สถิติหน้า admin | - |

## 5. ตั้ง cron รายการประจำ (ถ้าใช้ฟีเจอร์รายการประจำ)

ให้ `process-recurring-transactions` ถูกเรียกวันละครั้ง — เข้า SQL Editor รัน:

```sql
select cron.schedule(
  'process-recurring-daily',
  '0 1 * * *', -- 01:00 UTC = 08:00 เวลาไทย
  $$
  select net.http_post(
    url := 'https://xhhtkrfcjhgnwatuetqc.supabase.co/functions/v1/process-recurring-transactions',
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
  $$
);
```

(ต้องเปิด extensions `pg_cron` และ `pg_net` ใน Database → Extensions ก่อน)

## เช็คว่าเสร็จสมบูรณ์

1. `npm run dev` → เปิดแอป → สมัครสมาชิกใหม่ (ข้อมูลเก่าไม่ตามมา — เริ่มจากศูนย์ตามที่ตกลง)
2. เพิ่มรายการรายจ่าย 1 รายการ → เข้า Table Editor ในโปรเจกต์ใหม่ ต้องเห็นแถวใน `transactions`
3. ลองแชทกับบอท → ถ้าตอบได้ = GEMINI_API_KEY + functions ใช้งานได้
