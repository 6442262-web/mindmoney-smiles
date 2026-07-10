// วัดความเร็วโหลดแอป (production build) 5 รอบ — FCP, DOMContentLoaded, Load
import { chromium } from 'playwright-core';

const APP = 'http://127.0.0.1:8080';
const ROUNDS = 5;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });

const rows = [];
for (let i = 0; i < ROUNDS; i++) {
  const ctx = await browser.newContext({ viewport: { width: 420, height: 900 } }); // context ใหม่ = ไม่มี cache
  const page = await ctx.newPage();
  await page.goto(APP, { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(800);
  const m = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    const fcp = performance.getEntriesByName('first-contentful-paint')[0];
    return {
      fcp: fcp ? fcp.startTime : NaN,
      dcl: nav.domContentLoadedEventEnd - nav.startTime,
      load: nav.loadEventEnd - nav.startTime,
      transferKB: performance.getEntriesByType('resource').reduce((s, r) => s + (r.transferSize || 0), 0) / 1024,
    };
  });
  rows.push(m);
  await ctx.close();
}
await browser.close();

const mean = (k) => rows.reduce((s, r) => s + r[k], 0) / rows.length;
const f = (x) => x.toFixed(0);
console.log(`รอบทดสอบ: ${ROUNDS} (เปิดหน้าใหม่ไม่มี cache ทุกรอบ, เครือข่ายภายในเครื่อง)`);
rows.forEach((r, i) => console.log(`  รอบ ${i + 1}: FCP ${f(r.fcp)}ms | DOM พร้อม ${f(r.dcl)}ms | โหลดครบ ${f(r.load)}ms`));
console.log(`เฉลี่ย: FCP ${f(mean('fcp'))}ms | DOM พร้อม ${f(mean('dcl'))}ms | โหลดครบ ${f(mean('load'))}ms | โอนข้อมูล ~${f(mean('transferKB'))}KB`);
