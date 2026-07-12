// การทดลองที่ 8: ความทนของระบบนำเข้า Excel ต่อขนาดไฟล์
// สร้างไฟล์ .xlsx จริงขนาด 100 / 1,000 / 5,000 / 10,000 แถว แล้ววัดบนหน้าเว็บจริง:
//   - เวลา "เลือกไฟล์ → พรีวิวพร้อม" (อ่าน+แปลง+เรนเดอร์ ครบเส้นทางที่ผู้ใช้เจอ)
//   - ความถูกต้อง: จำนวนแถวพร้อมนำเข้าต้องครบทุกแถว
import { chromium } from 'playwright-core';
import * as XLSX from 'xlsx';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const HERE = dirname(new URL(import.meta.url).pathname);
const TMP = resolve(HERE, 'shots');
mkdirSync(TMP, { recursive: true });
const APP = 'http://127.0.0.1:8080';
const USER_ID = '11111111-1111-4111-8111-111111111111';
const SIZES = [100, 1000, 5000, 10000];
const CATS = ['อาหาร', 'เดินทาง', 'บันเทิง', 'การศึกษา', 'ของใช้'];

function makeFile(n) {
  const rows = [['วันที่', 'ประเภท', 'จำนวนเงิน', 'หมวดหมู่', 'รายละเอียด']];
  for (let i = 0; i < n; i++) {
    const d = new Date(2026, 0, 1 + (i % 365));
    rows.push([
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
      i % 10 === 0 ? 'รายรับ' : 'รายจ่าย',
      Math.round((20 + (i % 500)) * 100) / 100,
      CATS[i % CATS.length],
      `รายการทดสอบที่ ${i + 1}`,
    ]);
  }
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  const path = resolve(TMP, `scale-${n}.xlsx`);
  writeFileSync(path, Buffer.from(XLSX.write(wb, { type: 'array', bookType: 'xlsx' })));
  return path;
}

const exp = Math.floor(Date.now() / 1000) + 86400;
const jwt = [
  Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'),
  Buffer.from(JSON.stringify({ sub: USER_ID, role: 'authenticated', exp })).toString('base64url'),
  'sig',
].join('.');
const session = {
  access_token: jwt, token_type: 'bearer', expires_in: 86400, expires_at: exp,
  refresh_token: 'mock-refresh',
  user: { id: USER_ID, aud: 'authenticated', role: 'authenticated', email: 'test@example.com', user_metadata: {}, app_metadata: {}, created_at: new Date().toISOString() },
};

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
console.log('ขนาด (แถว) | ขนาดไฟล์ | เวลาเลือกไฟล์→พรีวิว | แถวพร้อมนำเข้า | ผล');

const out = [['rows', 'file_kb', 'parse_ms', 'valid_rows', 'ok']];
for (const n of SIZES) {
  const file = makeFile(n);
  const kb = Math.round((await import('node:fs')).statSync(file).size / 1024);

  const ctx = await browser.newContext({ viewport: { width: 420, height: 900 }, locale: 'th-TH' });
  await ctx.addInitScript(([k, v]) => window.localStorage.setItem(k, v), ['sb-localhost-auth-token', JSON.stringify(session)]);
  const page = await ctx.newPage();
  await page.goto(APP + '/import-csv', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1200);

  const t0 = Date.now();
  await page.setInputFiles('input[type="file"]', file);
  // พรีวิวพร้อม = ตัวเลข "พร้อมนำเข้า" โผล่พร้อมจำนวนที่คาด
  let ok = false;
  try {
    await page.getByText('พร้อมนำเข้า').waitFor({ timeout: 120000 });
    await page.getByText(new RegExp(`นำเข้า ${n.toLocaleString('en-US')}|นำเข้า ${n} รายการ`)).waitFor({ timeout: 60000 });
    ok = true;
  } catch { /* timeout */ }
  const ms = Date.now() - t0;
  const body = await page.textContent('body');
  const validOk = ok && body.includes(`นำเข้า ${n} รายการ`);
  console.log(`${String(n).padStart(9)} | ${String(kb).padStart(6)}KB | ${String(ms).padStart(8)}ms | ${validOk ? n : '?'} | ${validOk ? 'PASS' : 'FAIL'}`);
  out.push([n, kb, ms, validOk ? n : 0, validOk ? 1 : 0]);
  await ctx.close();
}
await browser.close();

writeFileSync(resolve(HERE, 'xlsx-scale-results.csv'), '﻿' + out.map((r) => r.join(',')).join('\n'), 'utf8');
console.log('\n📄 ผล → experiments/e2e/xlsx-scale-results.csv');
