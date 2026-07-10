import { chromium } from 'playwright-core';
import { mkdirSync as __mk } from 'node:fs';

const SHOT_DIR = new URL('./shots', import.meta.url).pathname;
__mk(SHOT_DIR, { recursive: true });
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
const step = (ok, name, detail = '') => { results.push({ ok, name, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} | ${name}${detail ? ' | ' + detail : ''}`); };

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 420, height: 900 }, locale: 'th-TH' });
const errors = [];
await ctx.addInitScript(([key, val]) => {
  window.localStorage.setItem(key, val);
}, ['sb-localhost-auth-token', JSON.stringify(session)]);

const page = await ctx.newPage();
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 200)); });

try {
  // 1. Boot → Dashboard
  await page.goto(APP, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${SHOT_DIR}/01-dashboard.png`, fullPage: true });
  const bodyText = await page.textContent('body');
  step(!bodyText.includes('เข้าสู่ระบบไม่สำเร็จ') && bodyText.length > 200, 'แอป boot + ผ่าน AuthGuard ด้วย session', `body ${bodyText.length} chars`);

  // 2. NetWorthWidget hidden with no data
  const netWorth = await page.getByText('ภาพรวมทรัพย์สิน').count();
  step(netWorth === 0, 'NetWorthWidget ซ่อนเมื่อไม่มีข้อมูล', `count=${netWorth}`);

  // 3. Investment button hidden (mode off)
  const investBtn = await page.getByRole('button', { name: 'ลงทุน' }).count();
  step(investBtn === 0, 'ปุ่มลงทุนซ่อนเมื่อโหมดปิด', `count=${investBtn}`);

  // 4. Add transaction — new form layout
  await page.goto(APP + '/add', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${SHOT_DIR}/02-add-form.png`, fullPage: true });
  const addText = await page.textContent('body');
  step(addText.includes('ตัวเลือกเพิ่มเติม'), 'ฟอร์มมี Collapsible "ตัวเลือกเพิ่มเติม"');
  const collapsedTime = await page.getByLabel(/เวลา/).count();
  step(collapsedTime === 0, 'ช่องเวลา/ความสำคัญยุบอยู่โดย default', `visible time inputs=${collapsedTime}`);
  const attachBtn = await page.getByText('แนบสลิป').count();
  step(attachBtn === 0, 'ปุ่มแนบสลิปที่ตายแล้วถูกลบ');

  // required marks
  const marks = await page.locator('form span:text("*")').count();
  step(marks >= 2, 'มีเครื่องหมาย * ช่องบังคับ (จำนวนเงิน/หมวดหมู่)', `marks=${marks}`);

  // 5. Fill and submit a transaction
  await page.fill('#amount', '150');
  await page.locator('form button[role="combobox"]').first().click();
  await page.waitForTimeout(400);
  await page.getByRole('option', { name: 'อาหาร' }).click();
  await page.fill('#description', 'ข้าวมันไก่ทดสอบ');
  await page.screenshot({ path: `${SHOT_DIR}/03-add-filled.png`, fullPage: true });
  await page.getByRole('button', { name: /บันทึก/ }).last().click();
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${SHOT_DIR}/04-after-submit.png`, fullPage: true });
  const toastText = await page.textContent('body');
  step(/สำเร็จ|เรียบร้อย/.test(toastText), 'บันทึกรายการแล้วมี toast สำเร็จ');

  // 6. Verify category persisted via mock (check transactions list shows name not UUID)
  await page.goto(APP + '/transactions', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${SHOT_DIR}/05-transactions.png`, fullPage: true });
  const listText = await page.textContent('body');
  const hasTxn = listText.includes('ข้าวมันไก่ทดสอบ');
  const hasCategoryName = listText.includes('อาหาร');
  const hasUUID = /[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}/.test(listText);
  step(hasTxn, 'รายการที่เพิ่มโผล่ในหน้ารายการ');
  step(hasCategoryName && !hasUUID, 'หมวดหมู่แสดงเป็นชื่อ ไม่ใช่ UUID (บัค category boundary)', `name=${hasCategoryName} uuid=${hasUUID}`);

  // 7. Frequent chips: add same description again → chip appears
  await page.goto(APP + '/add', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.fill('#amount', '150');
  await page.locator('form button[role="combobox"]').first().click();
  await page.waitForTimeout(300);
  await page.getByRole('option', { name: 'อาหาร' }).click();
  await page.fill('#description', 'ข้าวมันไก่ทดสอบ');
  await page.getByRole('button', { name: /บันทึก/ }).last().click();
  await page.waitForTimeout(2000);
  await page.goto(APP + '/add', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${SHOT_DIR}/06-frequent-chips.png`, fullPage: true });
  const chipText = await page.textContent('body');
  step(chipText.includes('รายการที่ใช้บ่อย'), 'แท็กรายการใช้บ่อยโผล่หลังมี 2 รายการซ้ำ');

  // 8. Settings → toggle investment mode → dashboard shows invest button
  await page.goto(APP + '/settings', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const invSwitch = page.locator('text=เปิดใช้งานโหมดการลงทุน').locator('xpath=ancestor::div[contains(@class,"flex")]//button[@role="switch"]').first();
  await invSwitch.click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${SHOT_DIR}/07-settings-investment.png`, fullPage: true });
  const setText = await page.textContent('body');
  step(setText.includes('เปิดพอร์ตการลงทุน'), 'เปิดสวิตช์แล้วลิงก์พอร์ตลงทุนโผล่ใน Settings');

  await page.goto(APP + '/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const investBtn2 = await page.getByRole('button', { name: 'ลงทุน' }).count();
  await page.screenshot({ path: `${SHOT_DIR}/08-dashboard-invest-on.png`, fullPage: true });
  step(investBtn2 === 1, 'ปุ่มลงทุนโผล่บนหน้าแรกหลังเปิดโหมด', `count=${investBtn2}`);

  // 9. Investment page accessible now
  await page.goto(APP + '/investment', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const invPage = await page.textContent('body');
  step(invPage.includes('พอร์ตการลงทุน'), 'เข้าหน้าพอร์ตลงทุนได้เมื่อเปิดโหมด');
  await page.screenshot({ path: `${SHOT_DIR}/09-investment.png`, fullPage: true });

  // 10. Turn mode off → /investment redirects to settings
  await page.evaluate(() => { localStorage.setItem('investment-mode', 'false'); window.dispatchEvent(new Event('investment-mode-changed')); });
  await page.goto(APP + '/investment', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  step(page.url().includes('/settings'), 'ปิดโหมดแล้ว /investment redirect ไป /settings', page.url());

  // 11. Savings goals — labels present
  await page.goto(APP + '/savings-goals', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.getByRole('button', { name: /เพิ่ม/ }).first().click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${SHOT_DIR}/10-savings-form.png`, fullPage: true });
  const goalDialog = await page.textContent('body');
  step(goalDialog.includes('วันที่ต้องการบรรลุ'), 'ฟอร์มเป้าหมายออมมี label ครบ (รวมช่องวันที่)');
} catch (e) {
  step(false, 'EXCEPTION', e.message.slice(0, 300));
  await page.screenshot({ path: `${SHOT_DIR}/99-error.png`, fullPage: true }).catch(() => {});
}

console.log('\n--- console/page errors (' + errors.length + ') ---');
errors.slice(0, 15).forEach(e => console.log(e));
console.log('\nSUMMARY: ' + results.filter(r => r.ok).length + '/' + results.length + ' passed');
await browser.close();
process.exit(0);
