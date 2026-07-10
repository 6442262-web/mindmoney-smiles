// E2E: นำเข้า Excel ครบวงจร — สร้าง .xlsx จริง → อัปโหลด → preview → import → เช็ค DB
import { chromium } from 'playwright-core';
import * as XLSX from 'xlsx';
import { writeFileSync, mkdirSync } from 'node:fs';

const SHOT_DIR = new URL('./shots', import.meta.url).pathname;
mkdirSync(SHOT_DIR, { recursive: true });
const APP = 'http://127.0.0.1:8080';
const USER_ID = '11111111-1111-4111-8111-111111111111';
const XLSX_PATH = `${SHOT_DIR}/test-import.xlsx`;

// ---- สร้างไฟล์ Excel จริง: 5 แถวดี (มี Date cell + ปี พ.ศ.) + 1 แถวเสีย ----
const ws = XLSX.utils.aoa_to_sheet([
  ['วันที่', 'ประเภท', 'จำนวนเงิน', 'หมวดหมู่', 'รายละเอียด'],
  [new Date(2026, 6, 1), 'รายจ่าย', 55, 'อาหาร', 'ก๋วยเตี๋ยว Excel'],
  ['02/07/2569', 'รายจ่าย', 45, 'อาหาร', 'กาแฟ Excel'],          // ปี พ.ศ.
  ['2026-07-03', 'รายรับ', 500, 'รายรับ', 'ค่าขนม Excel'],
  [new Date(2026, 6, 4), 'รายจ่าย', 120, 'บันเทิง', 'ค่าหนัง Excel'],
  ['2026-07-05', 'รายจ่าย', 30, 'เดินทาง', 'รถเมล์ Excel'],
  ['ไม่ใช่วันที่', 'รายจ่าย', 99, 'อาหาร', 'แถวเสีย'],            // ต้องถูกข้าม
]);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'รายการ');
writeFileSync(XLSX_PATH, Buffer.from(XLSX.write(wb, { type: 'array', bookType: 'xlsx' })));
console.log('สร้างไฟล์ทดสอบ:', XLSX_PATH);

const exp = Math.floor(Date.now() / 1000) + 86400;
const jwt = [
  Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'),
  Buffer.from(JSON.stringify({ sub: USER_ID, role: 'authenticated', exp })).toString('base64url'),
  'sig',
].join('.');
const session = {
  access_token: jwt, token_type: 'bearer', expires_in: 86400, expires_at: exp,
  refresh_token: 'mock-refresh',
  user: { id: USER_ID, aud: 'authenticated', role: 'authenticated', email: 'test@example.com', user_metadata: { full_name: 'Test User' }, app_metadata: {}, created_at: new Date().toISOString() },
};

const results = [];
const step = (ok, name, detail = '') => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'} | ${name}${detail ? ' | ' + detail : ''}`); };

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 420, height: 900 }, locale: 'th-TH' });
await ctx.addInitScript(([key, val]) => window.localStorage.setItem(key, val),
  ['sb-localhost-auth-token', JSON.stringify(session)]);
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));

try {
  // 1. เข้าหน้านำเข้าจากเมนูตั้งค่า
  await page.goto(APP + '/settings', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);
  const link = page.getByText('นำเข้าข้อมูลจาก Excel/CSV');
  step(await link.count() === 1, 'เมนู "นำเข้าข้อมูลจาก Excel/CSV" อยู่ในตั้งค่า');
  await link.click();
  await page.waitForTimeout(1500);
  step(page.url().includes('/import-csv'), 'คลิกแล้วไปหน้านำเข้า', page.url());
  const head = await page.textContent('body');
  step(head.includes('นำเข้าข้อมูลจาก Excel/CSV'), 'หัวข้อหน้าบอกว่ารองรับ Excel/CSV');

  // 2. อัปโหลดไฟล์ .xlsx
  await page.setInputFiles('input[type="file"]', XLSX_PATH);
  await page.waitForTimeout(2500); // รอโหลด chunk xlsx + parse
  await page.screenshot({ path: `${SHOT_DIR}/20-xlsx-preview.png`, fullPage: true });
  const prev = await page.textContent('body');
  step(prev.includes('test-import.xlsx'), 'ชื่อไฟล์โผล่ใน preview');
  step((await page.getByText('พร้อมนำเข้า').count()) === 1 && prev.includes('5'), 'preview บอก 5 แถวพร้อมนำเข้า');
  step(prev.includes('ข้ามไป 1 แถว'), 'แถวเสียถูกแยกรายงาน (ข้าม 1 แถว)');
  step(prev.includes('กาแฟ Excel') && prev.includes('2026-07-02'), 'แถวปี พ.ศ. 2569 ถูกแปลงเป็น 2026-07-02', /2026-07-02/.test(prev) ? 'ok' : '');
  // ยอดรวม: รายรับ 500, รายจ่าย 55+45+120+30 = 250
  step(prev.includes('500') && prev.includes('250'), 'ยอดรวมรายรับ 500 / รายจ่าย 250 ถูกต้อง');

  // 3. กดนำเข้า
  await page.getByRole('button', { name: /นำเข้า 5 รายการ/ }).click();
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `${SHOT_DIR}/21-xlsx-done.png`, fullPage: true });
  const done = await page.textContent('body');
  step(done.includes('นำเข้าเสร็จสิ้น') && done.includes('เพิ่ม 5 รายการ'), 'นำเข้าสำเร็จครบ 5 รายการ');

  // 4. เช็คว่าอยู่ในหน้ารายการจริง (persisted ผ่าน API)
  await page.goto(APP + '/transactions', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${SHOT_DIR}/22-xlsx-transactions.png`, fullPage: true });
  const list = await page.textContent('body');
  const found = ['ก๋วยเตี๋ยว Excel', 'กาแฟ Excel', 'ค่าขนม Excel', 'ค่าหนัง Excel', 'รถเมล์ Excel'].filter(d => list.includes(d));
  step(found.length === 5, 'ทั้ง 5 รายการโผล่ในหน้ารายการ (ลง DB จริง)', `found=${found.length}/5`);
  step(!list.includes('แถวเสีย'), 'แถวเสียไม่ถูกนำเข้า');
} catch (e) {
  step(false, 'EXCEPTION', e.message.slice(0, 250));
  await page.screenshot({ path: `${SHOT_DIR}/29-xlsx-error.png`, fullPage: true }).catch(() => {});
}

console.log('\npage errors:', errors.length ? errors.slice(0, 5) : 'none');
console.log(`SUMMARY: ${results.filter(Boolean).length}/${results.length} passed`);
await browser.close();
process.exit(0);
