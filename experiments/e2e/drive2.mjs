// E2E ภาค 2 — ระบบที่ยังไม่ถูกครอบใน drive.mjs:
//   หนี้สิน (ฟีเจอร์ที่เคยพัง), เป้าหมายออม, นำเข้า CSV, ความทนเมื่อ API ล่ม, จอมือถือแคบ
import { chromium } from 'playwright-core';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const HERE = dirname(new URL(import.meta.url).pathname);
const SHOT_DIR = resolve(HERE, 'shots');
mkdirSync(SHOT_DIR, { recursive: true });
const APP = 'http://127.0.0.1:8080';
const USER_ID = '11111111-1111-4111-8111-111111111111';

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

async function newPage(ctxOpts = {}, routeAbort = null) {
  const ctx = await browser.newContext({ viewport: { width: 420, height: 900 }, locale: 'th-TH', ...ctxOpts });
  await ctx.addInitScript(([k, v]) => window.localStorage.setItem(k, v), ['sb-localhost-auth-token', JSON.stringify(session)]);
  if (routeAbort) await ctx.route(routeAbort, (r) => r.abort());
  const page = await ctx.newPage();
  return { ctx, page };
}

// ─── 1. หนี้สิน: เพิ่ม → โผล่ในรายการ (ระบบที่เคยพัง ต้องมีหลักฐานว่า UI ทำงาน) ───
{
  const { ctx, page } = await newPage();
  try {
    await page.goto(APP + '/business/liabilities', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1500);
    await page.getByRole('button', { name: /เพิ่มหนี้สิน/ }).first().click();
    await page.waitForTimeout(600);
    await page.getByPlaceholder('เช่น สินเชื่อรถยนต์').fill('ผ่อนโน้ตบุ๊กทดสอบ');
    const nums = page.locator('[role="dialog"] input[type="number"]');
    await nums.nth(0).fill('20000');   // เงินต้น
    await nums.nth(1).fill('15000');   // ยอดคงเหลือ
    await page.screenshot({ path: `${SHOT_DIR}/30-liability-form.png`, fullPage: true });
    await page.getByRole('button', { name: /^บันทึก$/ }).click();
    await page.waitForTimeout(2000);
    const body = await page.textContent('body');
    step(body.includes('ผ่อนโน้ตบุ๊กทดสอบ'), 'หนี้สิน: เพิ่มแล้วโผล่ในรายการ');
    step(body.includes('15,000'), 'หนี้สิน: ยอดคงเหลือแสดงถูก (15,000)');
    await page.screenshot({ path: `${SHOT_DIR}/31-liability-list.png`, fullPage: true });

    // ยอดรวมหน้า dashboard ธุรกิจ/หนี้ควรคำนวณจากข้อมูลจริง
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    const body2 = await page.textContent('body');
    step(body2.includes('ผ่อนโน้ตบุ๊กทดสอบ'), 'หนี้สิน: reload แล้วข้อมูลยังอยู่ (persist ผ่าน API จริง)');
  } catch (e) { step(false, 'หนี้สิน EXCEPTION', e.message.slice(0, 150)); }
  await ctx.close();
}

// ─── 2. เป้าหมายออม: สร้าง → เพิ่มเงินออม → ยอดสะสมอัปเดต ───
{
  const { ctx, page } = await newPage();
  try {
    await page.goto(APP + '/savings-goals', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1200);
    await page.getByRole('button', { name: /เพิ่ม|สร้าง/ }).first().click();
    await page.waitForTimeout(500);
    await page.fill('#goal-name', 'เที่ยวทะเลทดสอบ');
    await page.fill('#goal-target', '5000');
    await page.getByRole('button', { name: /สร้างเป้าหมาย/ }).click();
    await page.waitForTimeout(2000);
    let body = await page.textContent('body');
    step(body.includes('เที่ยวทะเลทดสอบ'), 'เป้าหมายออม: สร้างแล้วโผล่ในหน้า');

    await page.getByRole('button', { name: /เพิ่มเงินออม/ }).first().click();
    await page.waitForTimeout(500);
    await page.fill('#deposit-amount', '1200');
    await page.getByRole('button', { name: /^บันทึก$/ }).click();
    await page.waitForTimeout(2000);
    body = await page.textContent('body');
    step(body.includes('1,200'), 'เป้าหมายออม: เพิ่มเงิน 1,200 แล้วยอดสะสมแสดง');
    await page.screenshot({ path: `${SHOT_DIR}/32-savings-goal.png`, fullPage: true });
  } catch (e) { step(false, 'เป้าหมายออม EXCEPTION', e.message.slice(0, 150)); }
  await ctx.close();
}

// ─── 3. นำเข้า CSV ผ่าน UI (คู่ขนานกับ xlsx-e2e ที่ทดสอบ Excel ไปแล้ว) ───
{
  const csvPath = resolve(SHOT_DIR, 'test-import.csv');
  writeFileSync(csvPath, '﻿วันที่,ประเภท,จำนวนเงิน,หมวดหมู่,รายละเอียด\n' +
    '2026-07-06,รายจ่าย,75,อาหาร,ข้าวผัด CSV\n' +
    '07/07/2569,รายรับ,300,รายรับ,ค่าขนม CSV\n' +   // ปี พ.ศ.
    'พัง,รายจ่าย,10,อาหาร,แถวเสีย CSV\n', 'utf8');
  const { ctx, page } = await newPage();
  try {
    await page.goto(APP + '/import-csv', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1200);
    await page.setInputFiles('input[type="file"]', csvPath);
    await page.waitForTimeout(1500);
    const prev = await page.textContent('body');
    step(prev.includes('นำเข้า 2 รายการ') && prev.includes('ข้ามไป 1 แถว'), 'CSV: อ่านได้ 2 ดี + กัน 1 แถวเสีย');
    step(prev.includes('2026-07-07'), 'CSV: ปี พ.ศ. 2569 แปลงเป็น ค.ศ.');
    await page.getByRole('button', { name: /นำเข้า 2 รายการ/ }).click();
    await page.waitForTimeout(2500);
    const done = await page.textContent('body');
    step(done.includes('นำเข้าเสร็จสิ้น'), 'CSV: นำเข้าสำเร็จ');
  } catch (e) { step(false, 'CSV EXCEPTION', e.message.slice(0, 150)); }
  await ctx.close();
}

// ─── 4. ความทน: user_settings ล่ม → แอปต้องไม่หมุนค้าง (failsafe PinGuard 7s) ───
{
  const { ctx, page } = await newPage({}, '**/rest/v1/user_settings**');
  try {
    await page.goto(APP, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(9000); // เผื่อเกิน failsafe 7 วิ
    const body = await page.textContent('body');
    const spinnerOnly = body.trim().length < 200;
    step(!spinnerOnly, 'API user_settings ล่ม → แอปยังเข้าหน้าหลักได้ (ไม่หมุนค้าง)', `body ${body.trim().length} chars`);
    await page.screenshot({ path: `${SHOT_DIR}/33-resilience-settings-down.png`, fullPage: true });
  } catch (e) { step(false, 'resilience EXCEPTION', e.message.slice(0, 150)); }
  await ctx.close();
}

// ─── 5. จอมือถือแคบ 360px: หน้าหลักต้องไม่มี scroll แนวนอน ───
{
  const { ctx, page } = await newPage({ viewport: { width: 360, height: 740 } });
  try {
    for (const [path, name] of [['/', 'หน้าแรก'], ['/add', 'ฟอร์มบันทึก'], ['/transactions', 'หน้ารายการ'], ['/summary', 'หน้าสรุป']]) {
      await page.goto(APP + path, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(1500);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      step(overflow <= 0, `จอ 360px: ${name} ไม่ล้นแนวนอน`, overflow > 0 ? `ล้น ${overflow}px` : '');
    }
    await page.screenshot({ path: `${SHOT_DIR}/34-mobile-360.png`, fullPage: true });
  } catch (e) { step(false, 'viewport EXCEPTION', e.message.slice(0, 150)); }
  await ctx.close();
}

await browser.close();
console.log(`\nSUMMARY: ${results.filter(Boolean).length}/${results.length} passed`);
process.exit(results.every(Boolean) ? 0 : 1);
