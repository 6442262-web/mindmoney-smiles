// สคริปต์วัดความแม่นยำ AI แยกรายการจากแชท — รันจากเครื่องที่ clone repo ไว้
//
// วิธีใช้:
//   TEST_EMAIL=อีเมล TEST_PASSWORD=รหัสผ่าน node experiments/run-chat-accuracy.mjs
//   (เพิ่ม LIMIT=10 เพื่อลองแค่ 10 ประโยคแรกก่อน)
//
// ผลลัพธ์: ตารางสรุป accuracy บนจอ + ไฟล์ experiments/results-<เวลา>.csv สำหรับใส่รูปเล่ม

import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'node:fs';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://xhhtkrfcjhgnwatuetqc.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'sb_publishable_wJ4y46-O1pBhDTFRRr21ZQ_o0XL1Beu';
const EMAIL = process.env.TEST_EMAIL;
const PASSWORD = process.env.TEST_PASSWORD;
const LIMIT = Number(process.env.LIMIT) || Infinity;
const DELAY_MS = Number(process.env.DELAY_MS) || 5000; // กัน rate limit ของ Gemini free tier

if (!EMAIL || !PASSWORD) {
  console.error('กรุณาระบุ TEST_EMAIL และ TEST_PASSWORD (บัญชีที่สมัครไว้ในแอป)');
  process.exit(1);
}

const testSet = JSON.parse(readFileSync(new URL('./chat-test-set.json', import.meta.url), 'utf8'));
const items = testSet.items.slice(0, LIMIT);

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const { error: authErr } = await supabase.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
if (authErr) {
  console.error('ล็อกอินไม่สำเร็จ:', authErr.message);
  process.exit(1);
}
console.log(`ล็อกอินสำเร็จ — เริ่มทดสอบ ${items.length} ประโยค (หน่วง ${DELAY_MS / 1000} วิ/ประโยค กัน rate limit)\n`);

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const rows = [];

for (const item of items) {
  let ai = null, errMsg = '';
  try {
    const { data, error } = await supabase.functions.invoke('chat-transaction', {
      body: { message: item.text, categories: [], history: [] },
    });
    if (error) throw error;
    ai = data;
  } catch (e) {
    errMsg = String(e?.message || e).slice(0, 80);
  }

  const txn = ai?.transaction ?? null;
  const gotRecord = !!txn;
  const exp = item.expect;

  const decisionOK = gotRecord === exp.record;
  const typeOK = !exp.record ? null : (gotRecord && txn.type === exp.type);
  const amountOK = !exp.record ? null : (gotRecord && Math.abs(Number(txn.amount) - exp.amount) < 0.01);
  const categoryOK = !exp.record || exp.category == null ? null
    : (gotRecord && typeof txn.category_name === 'string' && txn.category_name.includes(exp.category));

  rows.push({
    id: item.id, group: item.group, text: item.text,
    expected: exp.record ? `${exp.type} ${exp.amount} ${exp.category ?? '-'}` : 'ไม่บันทึก',
    got: gotRecord ? `${txn.type} ${txn.amount} ${txn.category_name ?? '-'}` : (errMsg ? `ERROR: ${errMsg}` : 'ไม่บันทึก'),
    decisionOK, typeOK, amountOK, categoryOK,
  });

  const mark = decisionOK && amountOK !== false && typeOK !== false ? '✓' : '✗';
  console.log(`${mark} [${item.group}${item.id}] "${item.text}" → ${rows.at(-1).got}`);
  await sleep(DELAY_MS);
}

// ===== สรุปผล =====
const pct = (list) => {
  const valid = list.filter(v => v !== null);
  if (!valid.length) return '-';
  return ((valid.filter(Boolean).length / valid.length) * 100).toFixed(1) + '%';
};

console.log('\n===== สรุปผลรวม =====');
console.log(`ตัดสินใจบันทึก/ไม่บันทึกถูก : ${pct(rows.map(r => r.decisionOK))}`);
console.log(`ประเภทรับ-จ่ายถูก          : ${pct(rows.map(r => r.typeOK))}`);
console.log(`จำนวนเงินถูก               : ${pct(rows.map(r => r.amountOK))}`);
console.log(`หมวดหมู่ถูก                : ${pct(rows.map(r => r.categoryOK))}`);

console.log('\n===== แยกตามกลุ่ม =====');
console.log('กลุ่ม | ตัดสินใจ | ประเภท | จำนวนเงิน | หมวด');
for (const g of Object.keys(testSet.groups)) {
  const gr = rows.filter(r => r.group === g);
  if (!gr.length) continue;
  console.log(`${g} (${testSet.groups[g]}) | ${pct(gr.map(r => r.decisionOK))} | ${pct(gr.map(r => r.typeOK))} | ${pct(gr.map(r => r.amountOK))} | ${pct(gr.map(r => r.categoryOK))}`);
}

const stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 16);
const csv = ['id,group,text,expected,got,decisionOK,typeOK,amountOK,categoryOK',
  ...rows.map(r => [r.id, r.group, `"${r.text}"`, `"${r.expected}"`, `"${r.got}"`, r.decisionOK, r.typeOK, r.amountOK, r.categoryOK].join(','))
].join('\n');
const out = new URL(`./results-${stamp}.csv`, import.meta.url).pathname;
writeFileSync(out, '﻿' + csv); // BOM เพื่อให้เปิดใน Excel แล้วภาษาไทยไม่เพี้ยน
console.log(`\nบันทึกผลละเอียดที่: ${out}`);
