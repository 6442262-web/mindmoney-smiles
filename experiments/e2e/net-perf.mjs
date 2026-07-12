// การทดลองที่ 7: ความเร็วโหลดแอปบนเครือข่ายจำลอง (Slow 3G / 3G / 4G / WiFi)
// ใช้ Chrome DevTools Protocol จำกัดความเร็วเน็ตจริง ๆ แล้ววัด FCP / โหลดครบ 5 รอบต่อโปรไฟล์
import { chromium } from 'playwright-core';
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const HERE = dirname(new URL(import.meta.url).pathname);
const APP = 'http://127.0.0.1:8080';
const ROUNDS = 5;
const kbps = (k) => (k * 1024) / 8; // แปลง kbit/s → byte/s

// โปรไฟล์อิงค่า preset ของ Chrome DevTools
const PROFILES = [
  { name: 'Slow 3G', latency: 400, down: kbps(400), up: kbps(400) },
  { name: '3G', latency: 150, down: kbps(1600), up: kbps(750) },
  { name: '4G', latency: 60, down: kbps(9000), up: kbps(4500) },
  { name: 'WiFi', latency: 5, down: kbps(30000), up: kbps(15000) },
];

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const out = [['profile', 'round', 'fcp_ms', 'load_ms']];

for (const p of PROFILES) {
  const fcps = [], loads = [];
  for (let i = 0; i < ROUNDS; i++) {
    const ctx = await browser.newContext({ viewport: { width: 420, height: 900 } });
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false, latency: p.latency, downloadThroughput: p.down, uploadThroughput: p.up,
    });
    await page.goto(APP, { waitUntil: 'load', timeout: 120000 });
    await page.waitForTimeout(500);
    const m = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0];
      const fcp = performance.getEntriesByName('first-contentful-paint')[0];
      return { fcp: fcp ? fcp.startTime : NaN, load: nav.loadEventEnd - nav.startTime };
    });
    fcps.push(m.fcp); loads.push(m.load);
    out.push([p.name, i + 1, m.fcp.toFixed(0), m.load.toFixed(0)]);
    await ctx.close();
  }
  const avg = (a) => a.reduce((s, x) => s + x, 0) / a.length;
  console.log(`${p.name.padEnd(8)} | FCP เฉลี่ย ${avg(fcps).toFixed(0).padStart(5)}ms | โหลดครบเฉลี่ย ${avg(loads).toFixed(0).padStart(5)}ms  (${ROUNDS} รอบ)`);
}
await browser.close();

writeFileSync(resolve(HERE, 'net-perf-results.csv'), '﻿' + out.map((r) => r.join(',')).join('\n'), 'utf8');
console.log('\n📄 ผลรายรอบ → experiments/e2e/net-perf-results.csv');
