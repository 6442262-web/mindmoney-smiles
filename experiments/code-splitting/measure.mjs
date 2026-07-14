// การทดลองที่ 9: ผลของเทคนิค Code Splitting ต่อความเร็วโหลด
// เทียบ 2 เวอร์ชันของแอปเดียวกัน (A = มี code splitting / B = ไม่มี) บนเครือข่ายจำลอง 3 ชนิด
import { chromium } from 'playwright-core';
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const HERE = dirname(new URL(import.meta.url).pathname);
const ROUNDS = 5;
const kbps = (k) => (k * 1024) / 8;
const NETWORKS = [
  { name: '3G', latency: 150, down: kbps(1600), up: kbps(750) },
  { name: '4G', latency: 60, down: kbps(9000), up: kbps(4500) },
  { name: 'WiFi', latency: 5, down: kbps(30000), up: kbps(15000) },
];
const VARIANTS = [
  { name: 'A มี code splitting', url: 'http://127.0.0.1:8080' },
  { name: 'B ไม่มี code splitting', url: 'http://127.0.0.1:8081' },
];

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const out = [['variant', 'network', 'round', 'fcp_ms', 'load_ms', 'transfer_kb']];

for (const v of VARIANTS) {
  for (const net of NETWORKS) {
    const fcps = [], kbs = [];
    for (let i = 0; i < ROUNDS; i++) {
      const ctx = await browser.newContext({ viewport: { width: 420, height: 900 } });
      const page = await ctx.newPage();
      const cdp = await ctx.newCDPSession(page);
      await cdp.send('Network.enable');
      await cdp.send('Network.emulateNetworkConditions', {
        offline: false, latency: net.latency, downloadThroughput: net.down, uploadThroughput: net.up,
      });
      await page.goto(v.url, { waitUntil: 'load', timeout: 180000 });
      await page.waitForTimeout(400);
      const m = await page.evaluate(() => {
        const nav = performance.getEntriesByType('navigation')[0];
        const fcp = performance.getEntriesByName('first-contentful-paint')[0];
        const kb = performance.getEntriesByType('resource').reduce((s, r) => s + (r.transferSize || 0), 0) / 1024;
        return { fcp: fcp ? fcp.startTime : NaN, load: nav.loadEventEnd - nav.startTime, kb };
      });
      fcps.push(m.fcp); kbs.push(m.kb);
      out.push([v.name, net.name, i + 1, m.fcp.toFixed(0), m.load.toFixed(0), m.kb.toFixed(0)]);
      await ctx.close();
    }
    const avg = (a) => a.reduce((s, x) => s + x, 0) / a.length;
    console.log(`${v.name.padEnd(24)} | ${net.name.padEnd(4)} | FCP เฉลี่ย ${avg(fcps).toFixed(0).padStart(6)}ms | โหลด ~${avg(kbs).toFixed(0)}KB`);
  }
}
await browser.close();
writeFileSync(resolve(HERE, 'codesplit-results.csv'), '﻿' + out.map((r) => r.join(',')).join('\n'), 'utf8');
console.log('\n📄 ผลรายรอบ → experiments/code-splitting/codesplit-results.csv');
