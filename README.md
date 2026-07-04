# MoneyMind - จัดการการเงินอัจฉริยะ

แอปจัดการรายรับรายจ่ายส่วนตัวและธุรกิจ ติดตามการออม หนี้สิน การลงทุน พร้อมผู้ช่วย AI

## เทคโนโลยี

- React 18 + TypeScript + Vite
- Tailwind CSS + shadcn/ui
- Supabase (Database, Auth, Edge Functions)
- Google Gemini API (ฟีเจอร์แชทบันทึกรายการ, วิเคราะห์ค่าใช้จ่าย, สแกนสลิป)

## เริ่มต้นพัฒนา

```sh
# ติดตั้ง dependencies
npm install

# ตั้งค่าการเชื่อมต่อ Supabase ใน .env (ดู supabase/SWITCH-PROJECT.md)

# รัน dev server (http://localhost:8080)
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
4. Deploy edge functions + ตั้ง secret `GEMINI_API_KEY`

## Deploy

โปรเจกต์นี้เป็น Vite static site ธรรมดา deploy ได้ทุกที่ เช่น Vercel, Netlify, Cloudflare Pages:

```sh
npm run build   # ได้ไฟล์ใน dist/
```

ตั้ง environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`) ในระบบ hosting ให้ตรงกับ `.env`
