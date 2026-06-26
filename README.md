# MoneyMind - จัดการการเงินอัจฉริยะ

เว็บแอปพลิเคชันจัดการรายรับรายจ่ายอัจฉริยะ พร้อมระบบ AI วิเคราะห์การเงิน

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

# 4. สร้างไฟล์ .env แล้วใส่ค่า
# VITE_SUPABASE_URL=your-supabase-url
# VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key

# 5. รันเซิร์ฟเวอร์
npm run dev
```

## การ Deploy

### Frontend (Vercel / Netlify)
1. เชื่อม GitHub repo
2. ตั้ง Build Command: `npm run build`
3. ตั้ง Output Directory: `dist`
4. เพิ่ม Environment Variables

### Edge Functions (Supabase)
```sh
supabase secrets set GOOGLE_AI_KEY=your-google-ai-key
supabase functions deploy chat-transaction
supabase functions deploy scan-slip
supabase functions deploy analyze-expense
```

## ฟีเจอร์หลัก

- 📊 บันทึกรายรับ-รายจ่าย
- 🤖 AI Chatbot ช่วยบันทึกและวิเคราะห์
- 📸 สแกนสลิปโอนเงินอัตโนมัติ
- 📈 กราฟและรายงานการเงิน
- 🎯 ตั้งเป้าหมายการออม
- 💰 จัดการหนี้สินและการลงทุน
- 🔒 ระบบ PIN ล็อคความปลอดภัย
