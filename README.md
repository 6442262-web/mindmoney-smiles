# MoneyMind - จัดการการเงินอัจฉริยะ

เว็บแอปพลิเคชันจัดการรายรับรายจ่ายอัจฉริยะ พร้อมระบบ AI วิเคราะห์การเงิน

## ฟีเจอร์หลัก

- 📊 บันทึกรายรับ-รายจ่าย พร้อมแท็กรายการที่ใช้บ่อยและกลุ่มรายจ่ายที่กำหนดเอง
- 🤖 AI Chatbot ช่วยบันทึกและวิเคราะห์
- 📸 สแกนสลิปโอนเงินอัตโนมัติ
- 🔮 พยากรณ์รายจ่ายล่วงหน้า + นำเข้าธุรกรรมจาก CSV
- 📈 กราฟและรายงานการเงิน
- 🎯 ตั้งเป้าหมายการออม
- 💰 จัดการหนี้สินและการลงทุน (เปิด/ปิดโหมดการลงทุนได้)
- 🔒 ระบบ PIN ล็อคความปลอดภัย

## เทคโนโลยีที่ใช้

- **Frontend:** React 18 + TypeScript + Vite
- **UI:** Tailwind CSS + shadcn-ui
- **Backend:** Supabase (PostgreSQL + Auth + Edge Functions)
- **AI:** Google Gemini 2.5 Flash (ผ่าน Google AI Studio)
- **State Management:** TanStack React Query

## วิธีรันโปรเจค

```sh
# 1. Clone repository
git clone https://github.com/6442262-web/mindmoney-smiles.git

# 2. เข้าโฟลเดอร์
cd mindmoney-smiles

# 3. ติดตั้ง dependencies
npm install

# 4. ตั้งค่า .env (ดูรายละเอียดใน supabase/SWITCH-PROJECT.md)
# VITE_SUPABASE_URL=your-supabase-url
# VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key

# 5. รันเซิร์ฟเวอร์ (http://localhost:8080)
npm run dev

# ตรวจ type + รันเทสต์
npx tsc --noEmit
npx vitest run

# build สำหรับ production
npm run build
```

## ตั้งค่า Supabase โปรเจกต์ใหม่

ดูขั้นตอนละเอียดใน [`supabase/SWITCH-PROJECT.md`](supabase/SWITCH-PROJECT.md) — สรุปคือ:

1. ใส่ URL + anon key ของโปรเจกต์ใน `.env`
2. รัน `supabase/setup-new-project.sql` ใน SQL Editor เพื่อสร้าง schema
3. เปิด Auth providers ที่ใช้ (Email / Anonymous / Google)
4. Deploy edge functions + ตั้ง secret AI key

## การ Deploy

### Frontend (Vercel / Netlify)
1. เชื่อม GitHub repo
2. ตั้ง Build Command: `npm run build`
3. ตั้ง Output Directory: `dist`
4. เพิ่ม Environment Variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`)

### Edge Functions (Supabase)
```sh
# ฟังก์ชัน AI รองรับ secret ชื่อ GEMINI_API_KEY หรือ GOOGLE_AI_KEY (ตั้งอย่างใดอย่างหนึ่ง)
supabase secrets set GEMINI_API_KEY=your-google-ai-key
supabase functions deploy chat-transaction
supabase functions deploy scan-slip
supabase functions deploy analyze-expense
supabase functions deploy yahoo-finance
supabase functions deploy forecast-summary
supabase functions deploy process-recurring-transactions
```
