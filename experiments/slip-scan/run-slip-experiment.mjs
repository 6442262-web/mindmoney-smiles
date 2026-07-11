#!/usr/bin/env node
/**
 * การทดลองที่ 6: เปรียบเทียบ 3 วิธีอ่านสลิปโอนเงิน
 *   วิธี A — QR อย่างเดียว   : ถอด QR มาตรฐานสลิปไทยในเครื่อง (ได้ ธนาคาร+เลขอ้างอิง แต่ไม่มียอดเงิน)
 *   วิธี B — AI อย่างเดียว   : ส่งภาพให้ AI อ่าน (ได้ ยอดเงิน/วันที่/ธนาคาร แต่มีโอกาสอ่านผิด)
 *   วิธี C — ไฮบริด (ของแอป) : ธนาคาร+ยืนยันจาก QR ถ้ามี, ยอดเงิน/วันที่จาก AI
 *
 * ใช้:
 *   1) วางรูปสลิปใน experiments/slip-scan/slips/
 *   2) กรอกเฉลยใน experiments/slip-scan/answers.csv (ดู answers-template.csv)
 *   3) TEST_EMAIL=... TEST_PASSWORD=... node experiments/slip-scan/run-slip-experiment.mjs
 *
 * โหมดทดสอบระบบ (ไม่ต้องมีบัญชี/AI): node experiments/slip-scan/run-slip-experiment.mjs --selftest
 *
 * ตัวเลือก: LIMIT=5 (ลองน้อยรูปก่อน), DELAY_MS=5000 (หน่วงกัน rate limit)
 * หมายเหตุ: ตรรกะถอด QR/TLV จำลองจาก src/lib/slipQr.ts ของแอปแบบบรรทัดต่อบรรทัด
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, resolve, extname } from 'node:path';
import { createRequire } from 'node:module';

const HERE = dirname(new URL(import.meta.url).pathname);
const REPO = resolve(HERE, '../..');
const require = createRequire(resolve(REPO, 'package.json'));

// ---------- TLV + ธนาคาร (ตรงกับ src/lib/slipQr.ts) ----------
const BANK_NAMES = {
  '002': 'กรุงเทพ', '004': 'กสิกรไทย', '006': 'กรุงไทย', '011': 'ทหารไทยธนชาต (ttb)',
  '014': 'ไทยพาณิชย์', '022': 'ซีไอเอ็มบี', '024': 'ยูโอบี', '025': 'กรุงศรีอยุธยา',
  '030': 'ออมสิน', '033': 'อาคารสงเคราะห์', '034': 'ธ.ก.ส.', '067': 'ทิสโก้',
  '069': 'เกียรตินาคินภัทร', '073': 'แลนด์ แอนด์ เฮ้าส์',
};
// ชื่อเรียกอื่นของแต่ละธนาคาร — ใช้เทียบคำตอบ AI ที่อาจสะกดต่างกัน
const BANK_ALIASES = {
  '002': ['กรุงเทพ', 'bbl', 'bangkok bank'],
  '004': ['กสิกร', 'kbank', 'kasikorn'],
  '006': ['กรุงไทย', 'ktb', 'krungthai'],
  '011': ['ทหารไทย', 'ธนชาต', 'ttb', 'tmb'],
  '014': ['ไทยพาณิชย์', 'scb', 'siam commercial'],
  '022': ['ซีไอเอ็มบี', 'cimb'],
  '024': ['ยูโอบี', 'uob'],
  '025': ['กรุงศรี', 'krungsri', 'ayudhya', 'bay'],
  '030': ['ออมสิน', 'gsb'],
  '033': ['อาคารสงเคราะห์', 'ghb'],
  '034': ['ธ.ก.ส', 'ธกส', 'baac'],
  '067': ['ทิสโก้', 'tisco'],
  '069': ['เกียรตินาคิน', 'kkp'],
  '073': ['แลนด์', 'lh bank', 'lhb'],
};

export function parseTlv(data) {
  const out = {};
  let i = 0;
  while (i + 4 <= data.length) {
    const tag = data.slice(i, i + 2);
    const len = Number(data.slice(i + 2, i + 4));
    if (!/^\d{2}$/.test(tag) || Number.isNaN(len) || i + 4 + len > data.length) return null;
    out[tag] = data.slice(i + 4, i + 4 + len);
    i += 4 + len;
  }
  return i === data.length && Object.keys(out).length > 0 ? out : null;
}

export function parseSlipQrPayload(rawData) {
  const info = { found: true, rawData };
  const outer = parseTlv(rawData);
  const envelope = outer?.['00'];
  if (envelope) {
    const inner = parseTlv(envelope);
    if (inner) {
      info.sendingBankCode = inner['01'];
      info.transRef = inner['02'];
      if (info.sendingBankCode) {
        info.sendingBankName = BANK_NAMES[info.sendingBankCode.padStart(3, '0').slice(-3)];
      }
    }
  }
  return info;
}

// ---------- ตัวช่วยให้คะแนน ----------
const normBank = (s) => String(s ?? '').toLowerCase().replace(/ธนาคาร|\s|\./g, '');
/** คำตอบธนาคาร (ชื่อหรือข้อความจาก AI) ตรงกับรหัสเฉลยไหม */
export function bankMatches(answerCode, text) {
  if (!text) return false;
  const t = normBank(text);
  return (BANK_ALIASES[answerCode] ?? []).some((a) => t.includes(normBank(a)));
}
export function amountMatches(expected, actual) {
  return Number.isFinite(Number(actual)) && Math.abs(Number(actual) - Number(expected)) < 0.005;
}
export function dateMatches(expected, actual) {
  return String(actual ?? '').slice(0, 10) === String(expected).slice(0, 10);
}

// ---------- ถอด QR จากรูปด้วย Chromium (canvas + jsQR — เส้นทางเดียวกับแอป) ----------
async function makeQrDecoder() {
  const { chromium } = await import('playwright-core');
  const jsqrSrc = readFileSync(require.resolve('jsqr/dist/jsQR.js'), 'utf8');
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.addScriptTag({ content: jsqrSrc });
  const decode = async (dataUrl) => {
    return page.evaluate(async (src) => {
      const img = new Image();
      await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = src; });
      for (const scale of [1, 1.5, 0.75]) {
        const w = Math.round(img.naturalWidth * scale);
        const h = Math.round(img.naturalHeight * scale);
        if (w < 50 || h < 50 || w * h > 16_000_000) continue;
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        const d = ctx.getImageData(0, 0, w, h);
        const code = window.jsQR(d.data, w, h);
        if (code?.data) return code.data;
      }
      return null;
    }, dataUrl);
  };
  return { decode, close: () => browser.close() };
}

const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };
const toDataUrl = (path) => `data:${MIME[extname(path).toLowerCase()] ?? 'image/jpeg'};base64,${readFileSync(path).toString('base64')}`;

// ---------- โหมดทดสอบระบบ ----------
async function selftest() {
  let pass = 0, fail = 0;
  const t = (ok, name) => { ok ? pass++ : fail++; console.log(`${ok ? 'PASS' : 'FAIL'} | ${name}`); };

  // payload ตัวอย่างตามมาตรฐานสลิป: ชั้นนอก 00 ห่อ [00=API ID, 01=รหัสธนาคาร, 02=เลขอ้างอิง]
  const inner = '0006000001' + '0103014' + '0210ABCDEFGHIJ';
  const payload = '00' + String(inner.length).padStart(2, '0') + inner;
  const info = parseSlipQrPayload(payload);
  t(info.sendingBankCode === '014', 'TLV: อ่านรหัสธนาคาร 014');
  t(info.sendingBankName === 'ไทยพาณิชย์', 'TLV: แปลงรหัส → ชื่อไทยพาณิชย์');
  t(info.transRef === 'ABCDEFGHIJ', 'TLV: อ่านเลขอ้างอิง');
  t(parseTlv('xx99broken') === null, 'TLV: payload พังคืน null ไม่ crash');

  t(bankMatches('014', 'ธนาคารไทยพาณิชย์ (SCB)'), 'จับคู่ธนาคาร: ชื่อเต็ม + วงเล็บ');
  t(bankMatches('004', 'KBank'), 'จับคู่ธนาคาร: ชื่ออังกฤษ');
  t(!bankMatches('014', 'กสิกรไทย'), 'จับคู่ธนาคาร: คนละธนาคารต้องไม่ผ่าน');
  t(amountMatches(150, '150.00') && !amountMatches(150, 155), 'เทียบยอดเงิน');
  t(dateMatches('2026-07-04', '2026-07-04T00:00:00') && !dateMatches('2026-07-04', '2026-07-05'), 'เทียบวันที่');

  // เส้นทางถอด QR จากรูปจริง: รูปที่ไม่มี QR ต้องคืน null อย่างสงบ
  const { decode, close } = await makeQrDecoder();
  const blankPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAIAAAD/gAIDAAAAJElEQVR4nO3BMQEAAADCoPVPbQwfoAAAAAAAAAAAAAAAAIC3AR9UAAFGKO4RAAAAAElFTkSuQmCC';
  const q = await decode(blankPng);
  t(q === null, 'ถอด QR: รูปไม่มี QR คืน null (pipeline canvas+jsQR ทำงาน)');
  await close();

  console.log(`\nSELFTEST: ${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
}

if (process.argv.includes('--selftest')) await selftest();

// ---------- รันการทดลองจริง ----------
const EMAIL = process.env.TEST_EMAIL;
const PASSWORD = process.env.TEST_PASSWORD;
if (!EMAIL || !PASSWORD) {
  console.error('ต้องระบุ TEST_EMAIL และ TEST_PASSWORD (หรือใช้ --selftest เพื่อทดสอบระบบก่อน)');
  process.exit(1);
}

const answersPath = resolve(HERE, 'answers.csv');
if (!existsSync(answersPath)) {
  console.error('ไม่พบ answers.csv — คัดลอกจาก answers-template.csv แล้วกรอกเฉลยก่อน');
  process.exit(1);
}
const answerRows = readFileSync(answersPath, 'utf8').replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim());
const answers = answerRows.slice(1).map((l) => {
  const [file, bank_code, date, amount] = l.split(',').map((s) => s.trim());
  return { file, bank_code, date, amount: Number(amount) };
}).filter((a) => a.file);

const LIMIT = Number(process.env.LIMIT || answers.length);
const DELAY_MS = Number(process.env.DELAY_MS || 5000);
const slipDir = resolve(HERE, 'slips');
const available = new Set(readdirSync(slipDir));

const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://xhhtkrfcjhgnwatuetqc.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sb_publishable_wJ4y46-O1pBhDTFRRr21ZQ_o0XL1Beu';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const { error: authErr } = await supabase.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
if (authErr) { console.error('ล็อกอินไม่สำเร็จ:', authErr.message); process.exit(1); }

const { decode, close } = await makeQrDecoder();
const rows = [];
const todo = answers.slice(0, LIMIT);
console.log(`เริ่มทดลอง ${todo.length} สลิป (หน่วง ${DELAY_MS}ms/รูป กัน rate limit)\n`);

for (const [i, ans] of todo.entries()) {
  if (!available.has(ans.file)) { console.log(`ข้าม ${ans.file} — ไม่พบไฟล์ใน slips/`); continue; }
  const dataUrl = toDataUrl(resolve(slipDir, ans.file));

  // วิธี A: QR
  const t0 = Date.now();
  const raw = await decode(dataUrl);
  const qr = raw ? parseSlipQrPayload(raw) : { found: false };
  const qrMs = Date.now() - t0;

  // วิธี B: AI
  const t1 = Date.now();
  let ai = null, aiErr = '';
  try {
    const { data, error } = await supabase.functions.invoke('scan-slip', { body: { imageBase64: dataUrl } });
    if (error) aiErr = error.message; else ai = data;
  } catch (e) { aiErr = e.message; }
  const aiMs = Date.now() - t1;

  // วิธี C: ไฮบริด — ธนาคารจาก QR ถ้าเจอ ไม่งั้นใช้ของ AI; ยอด/วันที่จาก AI
  const hybridBankText = qr.found && qr.sendingBankName ? qr.sendingBankName : ai?.sendingBank;

  const r = {
    file: ans.file,
    qr_found: qr.found ? 1 : 0,
    qr_bank_ok: qr.found && bankMatches(ans.bank_code, qr.sendingBankName) ? 1 : 0,
    qr_ms: qrMs,
    ai_ok: ai?.success ? 1 : 0,
    ai_bank_ok: bankMatches(ans.bank_code, ai?.sendingBank) ? 1 : 0,
    ai_amount_ok: amountMatches(ans.amount, ai?.amount) ? 1 : 0,
    ai_date_ok: dateMatches(ans.date, ai?.date) ? 1 : 0,
    ai_ms: aiMs,
    hy_bank_ok: bankMatches(ans.bank_code, hybridBankText) ? 1 : 0,
    hy_amount_ok: amountMatches(ans.amount, ai?.amount) ? 1 : 0,
    hy_date_ok: dateMatches(ans.date, ai?.date) ? 1 : 0,
    hy_verified: qr.found && qr.transRef ? 1 : 0,
    error: aiErr.slice(0, 80),
  };
  // "บันทึกสมบูรณ์" = ยอด+วันที่+ธนาคาร ถูกครบ
  r.qr_complete = 0; // QR ไม่มียอดเงิน จึงบันทึกสมบูรณ์ไม่ได้โดยนิยาม
  r.ai_complete = r.ai_bank_ok && r.ai_amount_ok && r.ai_date_ok ? 1 : 0;
  r.hy_complete = r.hy_bank_ok && r.hy_amount_ok && r.hy_date_ok ? 1 : 0;
  rows.push(r);

  console.log(`[${i + 1}/${todo.length}] ${ans.file} | QR ${r.qr_found ? 'เจอ' : 'ไม่เจอ'} | AI ยอด${r.ai_amount_ok ? '✓' : '✗'} วันที่${r.ai_date_ok ? '✓' : '✗'} ธนาคาร${r.ai_bank_ok ? '✓' : '✗'}${aiErr ? ' | ERR ' + aiErr.slice(0, 40) : ''}`);
  if (i < todo.length - 1) await new Promise((r2) => setTimeout(r2, DELAY_MS));
}
await close();

// ---------- สรุป ----------
const n = rows.length;
const pct = (k) => n ? ((rows.reduce((s, r) => s + r[k], 0) / n) * 100).toFixed(1) : '—';
const avg = (k) => n ? (rows.reduce((s, r) => s + r[k], 0) / n).toFixed(0) : '—';
console.log(`\n===== สรุปผล (n = ${n} สลิป) =====`);
console.log('ตัวชี้วัด                 | QR      | AI      | ไฮบริด');
console.log(`ธนาคารถูกต้อง             | ${pct('qr_bank_ok')}%  | ${pct('ai_bank_ok')}%  | ${pct('hy_bank_ok')}%`);
console.log(`ยอดเงินถูกต้อง            | อ่านไม่ได้ | ${pct('ai_amount_ok')}%  | ${pct('hy_amount_ok')}%`);
console.log(`วันที่ถูกต้อง              | อ่านไม่ได้ | ${pct('ai_date_ok')}%  | ${pct('hy_date_ok')}%`);
console.log(`บันทึกสมบูรณ์ (ครบ 3 อย่าง) | 0.0%   | ${pct('ai_complete')}%  | ${pct('hy_complete')}%`);
console.log(`ยืนยันเลขอ้างอิงได้        | ${pct('qr_found')}%  | 0.0%   | ${pct('hy_verified')}%`);
console.log(`เวลาเฉลี่ย/สลิป            | ${avg('qr_ms')}ms | ${avg('ai_ms')}ms | (ทำขนานกัน ≈ AI)`);

const header = Object.keys(rows[0] ?? { file: '' });
const csv = '﻿' + [header.join(','), ...rows.map((r) => header.map((h) => r[h]).join(','))].join('\n');
const out = resolve(HERE, `slip-results-${new Date().toISOString().slice(0, 10)}.csv`);
writeFileSync(out, csv, 'utf8');
console.log(`\n📄 ผลรายสลิป → ${out}`);
