#!/usr/bin/env node
/**
 * ตรวจความแม่นยำของ AI ในการตอบโจทย์วางแผนการเงิน (ไม่ต้องใช้คน — เฉลยเป็นคณิตศาสตร์)
 *
 * โหมด:
 *   --selftest                         ทดสอบตรรกะการตรวจ (ไม่ต้องมี AI/เน็ต)
 *   node score-planning.mjs answers.csv   ให้คะแนนจากคำตอบ AI ที่เก็บมา
 *
 * รูปแบบ answers.csv (2 คอลัมน์): id,response
 *   1,"ถ้าเก็บวันละ 40 บาท จะได้ 2,000 บาทใน 50 วันครับ"
 *   2,"ประมาณ 60 วัน"
 *
 * เกณฑ์ตรวจ: คำตอบถูก = ตัวเลข "เฉลย" ปรากฏในข้อความตอบของ AI (ไม่สนคอมมา/ช่องว่าง)
 *   — เฉลยทุกข้อถูกออกแบบให้ไม่ตรงกับตัวเลขโจทย์ จึงไม่สับสนกับเลขที่โจทย์ให้มา
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const HERE = dirname(new URL(import.meta.url).pathname);
const testSet = JSON.parse(readFileSync(resolve(HERE, "planning-test-set.json"), "utf8"));
const byId = new Map(testSet.items.map((it) => [it.id, it]));

/** ดึงจำนวนทั้งหมดจากข้อความ (ตัดคอมมาออกก่อน) → เซตของตัวเลข */
function numbersIn(text) {
  const cleaned = String(text).replace(/(\d),(?=\d)/g, "$1"); // 2,000 -> 2000
  const nums = cleaned.match(/\d+(?:\.\d+)?/g) || [];
  return new Set(nums.map(Number));
}

/** คำตอบถูกไหม: เฉลยปรากฏในคำตอบ (มี tolerance เล็กน้อยกันปัดเศษ) */
export function isCorrect(response, expect, tol = 0.001) {
  for (const n of numbersIn(response)) {
    if (Math.abs(n - expect) <= tol) return true;
  }
  return false;
}

// ---------------- โหมดทดสอบตรรกะ ----------------
if (process.argv.includes("--selftest")) {
  let pass = 0, fail = 0;
  const t = (ok, name) => { ok ? pass++ : fail++; console.log(`${ok ? "PASS" : "FAIL"} | ${name}`); };

  t(isCorrect("จะได้ 2,000 บาทใน 50 วันครับ", 50), "จับเลขคำตอบ 50 ท่ามกลางเลขโจทย์ 2,000");
  t(isCorrect("ประมาณ 60 วัน", 60), "คำตอบสั้น 60");
  t(!isCorrect("น่าจะราว ๆ 45 วัน", 50), "ตอบผิด (45 ไม่ใช่ 50) → ไม่ถูก");
  t(isCorrect("ประหยัดได้ 18,250 บาทต่อปี", 18250), "เลขหลักหมื่นมีคอมมา");
  t(isCorrect("เก็บเดือนละ 1000 บาท", 1000), "ไม่มีคอมมา");
  t(!isCorrect("ผมช่วยบันทึกรายการได้ครับ", 800), "AI ตอบนอกเรื่อง → ผิด");
  t(isCorrect("40 x 50 = 2000 ดังนั้น 50 วัน", 50), "มีหลายเลข แต่มีเฉลย 50 อยู่ → ถูก");

  // ตรวจว่าทุกข้อในชุดทดสอบมีเฉลยที่ 'ไม่ตรง' กับเลขในโจทย์ (กันตรวจสับสน)
  let clean = true;
  for (const it of testSet.items) {
    const qnums = numbersIn(it.question);
    if (qnums.has(it.expect)) { clean = false; console.log(`  ⚠️ ข้อ ${it.id}: เฉลย ${it.expect} ตรงกับเลขในโจทย์`); }
  }
  t(clean, "เฉลยทุกข้อไม่ตรงกับเลขในโจทย์ (ตรวจอัตโนมัติไม่สับสน)");

  console.log(`\nSELFTEST: ${pass}/${pass + fail} passed`);
  process.exit(fail ? 1 : 0);
}

// ---------------- โหมดให้คะแนนจริง ----------------
const file = process.argv[2];
if (!file) {
  console.error("ใช้:  node score-planning.mjs answers.csv   (หรือ --selftest)");
  process.exit(1);
}
const lines = readFileSync(file, "utf8").replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim());
// รองรับ header id,response (ข้ามถ้ามี)
if (/^id\s*,/.test(lines[0])) lines.shift();

const rows = [];
for (const line of lines) {
  const m = line.match(/^\s*(\d+)\s*,\s*(.*)$/);
  if (!m) continue;
  const id = Number(m[1]);
  let resp = m[2].trim().replace(/^"|"$/g, "").replace(/""/g, '"');
  const item = byId.get(id);
  if (!item) continue;
  rows.push({ id, group: item.group, expect: item.expect, unit: item.unit, resp, ok: isCorrect(resp, item.expect) });
}

const pct = (list) => list.length ? ((list.filter(Boolean).length / list.length) * 100).toFixed(1) + "%" : "—";
console.log(`\n===== ความแม่นยำ AI ตอบโจทย์วางแผนการเงิน (n = ${rows.length} ข้อ) =====`);
console.log(`ถูกทั้งหมด: ${pct(rows.map((r) => r.ok))}\n`);
console.log("กลุ่ม | ถูก/ทั้งหมด | ร้อยละ");
for (const g of Object.keys(testSet.groups)) {
  const gr = rows.filter((r) => r.group === g);
  if (gr.length) console.log(`${g} (${testSet.groups[g]}) | ${gr.filter((r) => r.ok).length}/${gr.length} | ${pct(gr.map((r) => r.ok))}`);
}
console.log("\n----- ข้อที่ตอบผิด -----");
for (const r of rows.filter((r) => !r.ok)) {
  console.log(`[${r.group}${r.id}] เฉลย ${r.expect} ${r.unit} → AI: ${r.resp.slice(0, 70)}`);
}
