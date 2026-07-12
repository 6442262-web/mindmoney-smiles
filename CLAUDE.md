# MoneyMind — คู่มือส่งต่องานสำหรับ Claude (Sonnet/Opus) session ถัดไป

## บริบทโปรเจกต์ (อ่านก่อนทำอะไร)

- **MoneyMind** = เว็บแอปการเงินส่วนบุคคลภาษาไทย ใช้แข่ง**โครงงานวิทยาศาสตร์ SMTE** ระดับมัธยม
- ผู้ใช้เป็น**นักเรียนมัธยมไทย** — **ตอบเป็นภาษาไทยเสมอ** อธิบายแบบเข้าใจง่าย ไม่ต้องสมมติว่ารู้ศัพท์ dev ลึก
- ผู้ใช้**ไม่มี terminal** — ทุกอย่างฝั่ง Supabase/Vercel ต้องทำผ่านเบราว์เซอร์ Dashboard เท่านั้น
  เวลาสั่งงานผู้ใช้ ให้บอกเป็นขั้น ๆ แบบคลิกตามได้
- Stack: React 18 + TypeScript + Vite + Tailwind/shadcn + Supabase (PostgREST/GoTrue/Edge Functions Deno) + TanStack Query
- AI: **Gemini 2.5 Flash** ผ่าน endpoint OpenAI-compatible (`generativelanguage.googleapis.com/v1beta/openai/chat/completions`)
  ใน edge functions — รับ secret ทั้งชื่อ `GEMINI_API_KEY` และ `GOOGLE_AI_KEY` (`??` กันไว้ทั้งคู่)
- **ตัดขาดจาก Lovable แล้ว 100%** — ห้ามเพิ่ม dependency/endpoint ของ Lovable กลับมา

## Infra จริง

- Supabase project: **xhhtkrfcjhgnwatuetqc** (ค่าอยู่ใน `.env`; fallback ฝังใน `src/integrations/supabase/client.ts`)
  anon key `sb_publishable_...` เป็น public — อยู่ใน repo ได้ / **service_role และ Gemini key ห้ามอยู่ใน repo หรือแชทเด็ดขาด**
- Deploy: **Vercel ต่อกับ branch `main`** — push `main` = deploy จริงอัตโนมัติ
- Sandbox ของ Claude **เข้า supabase.co / vercel.app ไม่ได้** (proxy 403) → ทดสอบกับของจริงไม่ได้
  ใช้ harness จำลองแทน (ดู "วิธี verify" ล่าง) และให้ผู้ใช้เป็นคนทำฝั่ง Dashboard

## กติกาทำงาน (ทำตามทุกครั้ง)

1. พัฒนาบน branch `claude/work-check-do53g6` → commit → push → **merge เข้า `main` แบบ ff-only แล้ว push ด้วย** (ผู้ใช้ต้องการให้ของขึ้นเว็บจริงเสมอ)
2. **บัมป์ `APP_VERSION`** ใน `src/lib/version.ts` ทุกครั้งที่ push การเปลี่ยนแปลงที่ผู้ใช้มองเห็น
   (รูปแบบ `"8 ก.ค. 2026-a"` ไล่ตัวอักษร) — stamp โชว์บนหน้า login/loading ไว้พิสูจน์ว่า deploy ถึงผู้ใช้แล้ว
3. commit message เป็นภาษาไทย ใช้ prefix `feat:/fix:/test:/polish:`
4. ก่อน push เสมอ: `npx tsc --noEmit` + `npx vitest run` (ปัจจุบัน **133 เคสต้องผ่านหมด**) + `npm run build`
5. หลัง merge อะไรก็ตาม: grep conflict marker **ทุกนามสกุลไฟล์** (เคยพลาดใน `index.html` ทำ Vercel build พัง)
6. งานใหม่ที่แตะไฟล์เดิมเยอะ ๆ → รัน E2E harness ก่อน push (ดูล่าง)

## วิธี verify ในเครื่อง (สำคัญ — ของจริงเข้าไม่ได้)

```sh
# unit
npx vitest run                          # 133 เคส

# E2E เต็มวงจร (mock Supabase in-memory :54321 + Chromium)
node experiments/e2e/mock-supabase.mjs &                       # 1) mock DB/auth
VITE_SUPABASE_URL=http://localhost:54321 VITE_SUPABASE_PUBLISHABLE_KEY=mock npm run build
npx vite preview --host 127.0.0.1 --port 8080 &                # 2) เสิร์ฟ build
node experiments/e2e/drive.mjs                                 # 3) ฟีเจอร์หลัก 16 ขั้น
node experiments/e2e/xlsx-e2e.mjs                              #    นำเข้า Excel 11 ขั้น
node experiments/e2e/perf-test.mjs                             #    วัดความเร็วโหลด
```

ข้อควรรู้ของ sandbox:
- Chromium อยู่ที่ `/opt/pw-browsers/chromium` ต้องใส่ `--no-sandbox`; **ห้าม** `playwright install`
- Vite ต้องรัน `--host 127.0.0.1` (sandbox ไม่มี IPv6 → `::` จะ EAFNOSUPPORT)
- login จำลอง = ฉีด localStorage key `sb-localhost-auth-token` (ดูตัวอย่างใน `drive.mjs`)
- **เสร็จแล้วต้อง `npm run build` ปกติอีกรอบ** ไม่งั้น dist ค้างชี้ mock (dist ไม่ขึ้น git แต่กันสับสน)

## แผนที่โค้ดจุดสำคัญ

| ที่ | คืออะไร |
|---|---|
| `src/components/MoneyMindApp.tsx` | route ทั้งหมด + สะพานหมวดหมู่ DB↔UI (`findOrCreateCategory` ตอนเขียน, Map id→ชื่อ ตอนอ่าน) + route guard โหมดลงทุน |
| `src/hooks/useInvestmentMode.ts` | โหมดลงทุน (localStorage `investment-mode` + event `investment-mode-changed`) — ฟีเจอร์ลงทุนทุกจุดต้อง gate ด้วยอันนี้ |
| `src/components/PinGuard.tsx`, `src/hooks/useAuth.ts` | มี failsafe timeout 7s/8s **ห้ามเอาออก** (เคยเกิดบัคหมุนค้างทั้งแอป) |
| `src/lib/importCsv.ts` / `importXlsx.ts` | นำเข้า CSV/Excel — `parseTransactionsFromRows` เป็นแกนร่วม, xlsx โหลด dynamic เท่านั้น (ห้าม import static — bundle จะบวม) |
| `src/lib/slipQr.ts` + `src/components/SlipScanner.tsx` | สแกนสลิปไฮบริด: QR (jsQR, TLV มาตรฐานสลิปไทย) ขนานกับ AI |
| `supabase/functions/chat-transaction/index.ts` | AI แชทบันทึกรายการ (prompt มีกฎเลขไทย/คำอ่าน/กันคำถาม) |
| `supabase/functions/scan-slip/index.ts` | AI อ่านสลิป (มี `sendingBank` แล้ว) |
| `supabase/setup-fix.sql` | schema ทั้งหมดแบบ idempotent — เป็นไฟล์เดียวที่ใช้ตั้ง DB ใหม่ (`setup-new-project.sql` ตัวเก่า**ห้ามใช้** มี CREATE TABLE ซ้ำแล้วพังกลางทาง) |
| `experiments/` | ชุดการทดลองโครงงานทั้ง 6 (ดูสถานะล่าง) |
| `vite.config.ts` | manualChunks: react-vendor/radix/supabase — คุมขนาด entry ~200KB |

## สถานะปัจจุบัน (10 ก.ค. 2026, HEAD = `5765806`)

ระบบหลักเสร็จและ verify แล้วทั้งหมด: บันทึกรายรับ-จ่าย (ฟอร์ม/แชท AI/สแกนสลิป), หมวดหมู่+กลุ่มรายจ่ายเอง,
แท็กใช้บ่อย, เป้าหมายออม, หนี้สิน, งบประมาณ, โหมดลงทุน (ปิด default), นำเข้า Excel/CSV, PIN, สรุป/กราฟ/PDF

### ⏳ ค้างที่ผู้ใช้ต้องทำบน Dashboard (เตือนซ้ำได้ ยังไม่ยืนยันว่าทำแล้ว)

1. **รัน `supabase/setup-fix.sql`** ใน SQL Editor — ถ้ายังไม่รัน **หนี้สินจะบันทึกไม่ได้** (ตาราง liabilities หาย)
   เช็คผล: SELECT ท้ายไฟล์ต้องเห็น `liabilities`, `liability_payments`
2. **Redeploy edge functions ผ่าน Dashboard Editor**: `chat-transaction` (prompt ใหม่) และ `scan-slip` (prompt ใหม่ + ฟิลด์ `sendingBank`)
   วิธี: Dashboard → Edge Functions → เลือกฟังก์ชัน → Editor → วางโค้ดจากไฟล์ใน repo → Deploy (ไฟล์ต้องชื่อ `index.ts`)

### การทดลองโครงงาน 6 อัน

| # | การทดลอง | สถานะ |
|---|---|---|
| 1 | ความแม่น AI 100 ประโยค ก่อน/หลัง prompt (`experiments/README.md`) | รอผู้ใช้ deploy function แล้วรันเอง (มี baseline ไว้ให้แล้ว) |
| 2 | ผู้ใช้จริง ≥15 คน เวลา/error/SUS (`experiments/app-usability/`) | รอผู้ใช้เก็บข้อมูลจริง — สคริปต์ `analyze.mjs` (paired t-test) พร้อม |
| 3 | unit tests | ✅ รันแล้ว 133/133 — ผลใน `experiments/e2e/RESULTS.md` |
| 4 | E2E เบราว์เซอร์จริง | ✅ รันแล้ว 16/16 + 11/11 |
| 5 | ความเร็วโหลด | ✅ รันแล้ว FCP เฉลี่ย 119ms / ~209KB |
| 6 | สลิป 3 วิธี QR/AI/ไฮบริด (`experiments/slip-scan/`) | รอผู้ใช้ deploy `scan-slip` + เก็บสลิป ≥30 ใบ — สคริปต์ selftest 10/10 แล้ว |

ถ้าผู้ใช้เอาผลการทดลอง 1/2/6 มาให้ → ช่วยวิเคราะห์/ทำกราฟ/เขียนสรุปภาษาไทยสำหรับรูปเล่มได้เลย

### Backlog (จดไว้ ยังไม่ทำ — ถามผู้ใช้ก่อนเริ่ม)

- ความปลอดภัย PIN: ตอนนี้ SHA-256 ไม่มี salt/lockout (ต้องทำ migration ถ้าแก้)
- `user_settings` ไม่มี unique constraint ต่อ user (เสี่ยงแถวซ้ำ)
- Edge functions ที่ยังไม่ deploy: `process-recurring-transactions` + `admin-stats` + ตั้ง pg_cron
- ปุ่ม Google login ถูกถอดจาก UI แล้ว แต่ `signInWithGoogle` ยังอยู่ใน `useAuth` (เผื่ออนาคต)
- commit เก่าบางอันมี trailer ชื่อโมเดลผิด — ไม่ต้องไปแก้ history

## บทเรียนที่จ่ายแพงมาแล้ว (อย่าซ้ำ)

- อย่าเดาว่า SQL ที่ generate ให้ผู้ใช้รันแล้วสำเร็จ — ตรวจ error ตรงกลางไฟล์ (duplicate CREATE ทำ abort เงียบ ๆ มาแล้ว)
- ผู้ใช้วาง key อะไรมาในแชท: ถ้าเป็น secret จริง ให้เตือน regenerate ทันที และห้ามเอาไปใส่โค้ด
- toast error สีแดงตอน background-load ทำผู้ใช้ตกใจ — จะเพิ่ม error UI ให้คิดก่อนว่าจำเป็นไหม
- เวลาแก้ bug "โหลดค้าง" ให้หา root cause จริง (เคยเป็น `if (settings)` ที่ null ตลอดกาล) แล้วค่อยเสริม failsafe
