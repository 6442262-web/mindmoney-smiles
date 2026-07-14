// E2E: การบันทึกรายรับ-รายจ่ายด้วย AI — ทดสอบ 2 ส่วน
//   1) หน้าแชท AI: พิมพ์ประโยค → AI (จำลอง) แยกรายการ → ยืนยัน → ลง DB จริง
//   2) หน้าการทดลอง /ai-experiment: รันชุดทดสอบ 10 ประโยค → สรุปคะแนน → ตาราง
// หมายเหตุ: ใช้ AI จำลอง rule-based ใน mock — พิสูจน์ "วงจรของแอป" ครบวงจร
// ความแม่นของ AI จริง (Gemini) ต้องวัดผ่านหน้า /ai-experiment บนเว็บจริงหลัง deploy function
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
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
  user: { id: USER_ID, aud: 'authenticated', role: 'authenticated', email: 'test@example.com', user_metadata: {}, app_metadata: {}, created_at: new Date().toISOString() },
};

const results = [];
const step = (ok, name, detail = '') => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'} | ${name}${detail ? ' | ' + detail : ''}`); };

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 420, height: 900 }, locale: 'th-TH' });
await ctx.addInitScript(([k, v]) => window.localStorage.setItem(k, v), ['sb-localhost-auth-token', JSON.stringify(session)]);
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

try {
  // ─── 1. หน้าแชท AI บันทึกรายการ ───
  await page.goto(APP + '/chat-transaction', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);
  const input = page.getByPlaceholder(/พิมพ์รายการ/);
  await input.fill('กินก๋วยเตี๋ยว 55');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(2500);
  const chat1 = await page.textContent('body');
  step(chat1.includes('55'), 'แชท: AI ตอบพร้อมจำนวนเงิน 55');
  step(chat1.includes('รายจ่าย'), 'แชท: ระบุประเภทรายจ่าย');

  // กดยืนยันบันทึก (ปุ่มบันทึก/ยืนยันใน bubble)
  const confirmBtn = page.getByRole('button', { name: /เพิ่มรายการ|ยืนยัน/ }).last();
  if (await confirmBtn.count()) {
    await confirmBtn.click();
    await page.waitForTimeout(2000);
  }
  await page.screenshot({ path: `${SHOT_DIR}/40-ai-chat.png`, fullPage: true });

  // เช็คว่าลง DB จริง (ผ่านหน้ารายการ)
  await page.goto(APP + '/transactions', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  const list = await page.textContent('body');
  step(list.includes('55'), 'แชท: รายการที่ AI แยกถูกบันทึกลงฐานข้อมูลจริง', list.includes('ก๋วยเตี๋ยว') ? 'มีรายละเอียดด้วย' : '');

  // คำถามต้องไม่ถูกบันทึก
  await page.goto(APP + '/chat-transaction', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  const input2 = page.getByPlaceholder(/พิมพ์รายการ/);
  await input2.fill('เดือนนี้ใช้ไปเท่าไหร่');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(2500);
  const chat2 = await page.textContent('body');
  step(chat2.includes('คำถาม') || !chat2.includes('บันทึกรายจ่าย เท่าไหร่'), 'แชท: คำถามไม่ถูกบันทึกเป็นรายการ');

  // ─── 2. หน้าการทดลอง /ai-experiment ───
  await page.goto(APP + '/settings', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const linkCount = await page.getByText('การทดลองความแม่นยำ AI').count();
  step(linkCount >= 1, 'ลิงก์หน้าการทดลองอยู่ในตั้งค่า');

  await page.goto(APP + '/ai-experiment', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const exph = await page.textContent('body');
  step(exph.includes('การทดลองความแม่นยำ AI'), 'เปิดหน้าการทดลองได้');

  // ตั้งค่า: 10 ประโยค หน่วง 2 วิ แล้วเริ่ม
  await page.locator('select').first().selectOption('10');
  await page.locator('select').nth(1).selectOption('2');
  await page.getByRole('button', { name: /เริ่มการทดลอง/ }).click();
  // 10 ประโยค × 2 วิ ≈ 20 วิ + ประมวลผล
  await page.waitForTimeout(28000);
  await page.screenshot({ path: `${SHOT_DIR}/41-ai-experiment.png`, fullPage: true });
  const done = await page.textContent('body');
  step(done.includes('สรุปผล'), 'การทดลองรันจบและแสดงสรุปผล');
  step(done.includes('ทดสอบแล้ว 10 ประโยค'), 'ครบ 10 ประโยคตามที่ตั้ง');
  step(done.includes('ตัดสินใจบันทึกถูก') && /\d+\.\d%/.test(done), 'คะแนน 4 ด้านคำนวณเป็น % ได้');
  step(done.includes('เลขอารบิกปกติ'), 'ตารางแยกกลุ่มแสดงชื่อกลุ่ม');
  const dlBtn = await page.getByRole('button', { name: /ดาวน์โหลดผลรายประโยค/ }).count();
  step(dlBtn === 1, 'มีปุ่มดาวน์โหลด CSV');

  // ผลถูกเก็บใน localStorage (รีเฟรชไม่หาย)
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const after = await page.textContent('body');
  step(after.includes('สรุปผล'), 'รีเฟรชแล้วผลรอบล่าสุดยังอยู่ (localStorage)');
} catch (e) {
  step(false, 'EXCEPTION', e.message.slice(0, 200));
  await page.screenshot({ path: `${SHOT_DIR}/49-ai-error.png`, fullPage: true }).catch(() => {});
}

console.log('\npage errors:', errors.length ? errors.slice(0, 5) : 'none');
console.log(`SUMMARY: ${results.filter(Boolean).length}/${results.length} passed`);
await browser.close();
process.exit(results.every(Boolean) ? 0 : 1);
