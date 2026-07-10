#!/usr/bin/env node
/**
 * วิเคราะห์ผลการทดลองที่ 2 (การทดลองกับผู้ใช้จริง)
 * อ่านไฟล์ CSV ที่กรอกจากการทดลอง แล้วคำนวณ:
 *   - ค่าเฉลี่ย ± SD ของเวลาและ error ทั้งสองวิธี
 *   - paired t-test (เวลา, error) เทียบกับค่าวิกฤตที่ระดับนัยสำคัญ 0.05
 *   - คะแนน SUS เฉลี่ย + การตีความ
 *   - ขนาดผล (Cohen's d)
 * แล้วเขียน usability-summary.csv สำหรับเอาไปทำกราฟ
 *
 * ใช้:  node experiments/app-usability/analyze.mjs <ไฟล์.csv>
 * ไม่ต้องติดตั้งไลบรารีเพิ่ม รันด้วย Node ล้วน
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const file = process.argv[2] || resolve(dirname(new URL(import.meta.url).pathname), "data-template.csv");

// ---------- อ่าน CSV ----------
const text = readFileSync(file, "utf8").replace(/^﻿/, "");
const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
const header = lines[0].split(",").map((h) => h.trim());
const rows = lines.slice(1).map((line) => {
  const cells = line.split(",");
  const obj = {};
  header.forEach((h, i) => (obj[h] = (cells[i] ?? "").trim()));
  return obj;
});

if (rows.length === 0) {
  console.error("ไม่พบข้อมูลในไฟล์ CSV");
  process.exit(1);
}

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
};

// ---------- สถิติพื้นฐาน ----------
const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
const sd = (a) => {
  if (a.length < 2) return 0;
  const m = mean(a);
  return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1));
};

// ค่าวิกฤต t สองหาง ที่ระดับนัยสำคัญ 0.05 (df 1–30, มากกว่านั้นประมาณด้วย z=1.96)
const T_CRIT = {
  1: 12.706, 2: 4.303, 3: 3.182, 4: 2.776, 5: 2.571, 6: 2.447, 7: 2.365, 8: 2.306,
  9: 2.262, 10: 2.228, 11: 2.201, 12: 2.179, 13: 2.16, 14: 2.145, 15: 2.131, 16: 2.12,
  17: 2.11, 18: 2.101, 19: 2.093, 20: 2.086, 21: 2.08, 22: 2.074, 23: 2.069, 24: 2.064,
  25: 2.06, 26: 2.056, 27: 2.052, 28: 2.048, 29: 2.045, 30: 2.042,
};
const tCritical = (df) => T_CRIT[df] ?? 1.96;

/**
 * paired t-test: รับคู่ค่า (b, a) แล้วทดสอบว่าผลต่าง (b − a) ต่างจาก 0 อย่างมีนัยสำคัญไหม
 */
function pairedT(bArr, aArr) {
  const diffs = bArr.map((b, i) => b - aArr[i]);
  const n = diffs.length;
  const md = mean(diffs);
  const sdd = sd(diffs);
  const se = sdd / Math.sqrt(n);
  const t = se === 0 ? 0 : md / se;
  const df = n - 1;
  const crit = tCritical(df);
  return {
    n, meanDiff: md, sdDiff: sdd, t, df, crit,
    significant: Math.abs(t) > crit,
    cohensD: sdd === 0 ? 0 : md / sdd, // effect size แบบ paired
  };
}

// ---------- ดึงคอลัมน์ ----------
const appTime = rows.map((r) => num(r.app_time_s)).filter((x) => !Number.isNaN(x));
const sheetTime = rows.map((r) => num(r.sheet_time_s)).filter((x) => !Number.isNaN(x));
const appErr = rows.map((r) => num(r.app_errors)).filter((x) => !Number.isNaN(x));
const sheetErr = rows.map((r) => num(r.sheet_errors)).filter((x) => !Number.isNaN(x));

// คู่ที่ครบทั้งสองฝั่ง (ใช้ทำ paired test)
const timePairs = rows
  .map((r) => [num(r.sheet_time_s), num(r.app_time_s)])
  .filter(([b, a]) => !Number.isNaN(b) && !Number.isNaN(a));
const errPairs = rows
  .map((r) => [num(r.sheet_errors), num(r.app_errors)])
  .filter(([b, a]) => !Number.isNaN(b) && !Number.isNaN(a));

// ---------- คะแนน SUS ----------
function susScore(r) {
  const q = [];
  for (let i = 1; i <= 10; i++) {
    const v = num(r[`sus_${i}`]);
    if (Number.isNaN(v)) return NaN;
    q.push(v);
  }
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    // ข้อคี่ (index 0,2,4,6,8): v-1 ; ข้อคู่: 5-v
    sum += i % 2 === 0 ? q[i] - 1 : 5 - q[i];
  }
  return sum * 2.5;
}
const susScores = rows.map(susScore).filter((x) => !Number.isNaN(x));

// ---------- แสดงผล ----------
const f = (x, d = 1) => (Number.isFinite(x) ? x.toFixed(d) : "—");
const line = "─".repeat(60);
console.log(`\n${line}\nการทดลองที่ 2: ประสิทธิภาพเมื่อผู้ใช้ใช้จริง  (n = ${rows.length} คน)\n${line}`);

console.log("\n▌ เวลาในการบันทึก 10 รายการ (วินาที) — น้อย = ดี");
console.log(`   แอป MoneyMind : เฉลี่ย ${f(mean(appTime))} ± ${f(sd(appTime))}`);
console.log(`   สเปรดชีต/สมุด : เฉลี่ย ${f(mean(sheetTime))} ± ${f(sd(sheetTime))}`);
if (timePairs.length >= 2) {
  const t = pairedT(timePairs.map((p) => p[0]), timePairs.map((p) => p[1]));
  const faster = (1 - mean(appTime) / mean(sheetTime)) * 100;
  console.log(`   → แอปเร็วกว่าเฉลี่ย ${f(faster)}%`);
  console.log(`   → paired t = ${f(t.t, 3)}, df = ${t.df}, ค่าวิกฤต(0.05) = ${f(t.crit, 3)}, |d| = ${f(Math.abs(t.cohensD), 2)}`);
  console.log(`   → ${t.significant ? "✅ ต่างกันอย่างมีนัยสำคัญ (p < 0.05)" : "❌ ยังไม่ต่างอย่างมีนัยสำคัญ (p ≥ 0.05)"}`);
}

console.log("\n▌ จำนวนข้อผิดพลาด (รายการที่ผิด/ตกหล่น) — น้อย = ดี");
console.log(`   แอป MoneyMind : เฉลี่ย ${f(mean(appErr), 2)} ± ${f(sd(appErr), 2)}`);
console.log(`   สเปรดชีต/สมุด : เฉลี่ย ${f(mean(sheetErr), 2)} ± ${f(sd(sheetErr), 2)}`);
if (errPairs.length >= 2) {
  const t = pairedT(errPairs.map((p) => p[0]), errPairs.map((p) => p[1]));
  console.log(`   → paired t = ${f(t.t, 3)}, df = ${t.df}, ค่าวิกฤต(0.05) = ${f(t.crit, 3)}, |d| = ${f(Math.abs(t.cohensD), 2)}`);
  console.log(`   → ${t.significant ? "✅ ต่างกันอย่างมีนัยสำคัญ (p < 0.05)" : "❌ ยังไม่ต่างอย่างมีนัยสำคัญ (p ≥ 0.05)"}`);
}

console.log("\n▌ ความพึงพอใจ SUS (0–100) — มาก = ดี");
if (susScores.length) {
  const m = mean(susScores);
  const grade = m >= 80.3 ? "เกรด A (ดีเยี่ยม)" : m > 68 ? "สูงกว่าค่าเฉลี่ยระบบทั่วไป" : m >= 51 ? "พอใช้ (ต่ำกว่าค่าเฉลี่ย)" : "ต้องปรับปรุง";
  console.log(`   คะแนน SUS เฉลี่ย : ${f(m)} ± ${f(sd(susScores))}  → ${grade}`);
  console.log(`   (เกณฑ์อ้างอิง: 68 = ค่าเฉลี่ยของระบบทั่วไป, 80.3 = กลุ่มดีเยี่ยม)`);
} else {
  console.log("   (ยังไม่มีข้อมูล SUS)");
}

// ---------- เขียนสรุปเป็น CSV สำหรับทำกราฟ ----------
const summaryRows = [
  ["ตัวชี้วัด", "แอป MoneyMind", "สเปรดชีต/สมุด", "หน่วย"],
  ["เวลาเฉลี่ย", f(mean(appTime)), f(mean(sheetTime)), "วินาที"],
  ["SD เวลา", f(sd(appTime)), f(sd(sheetTime)), "วินาที"],
  ["ข้อผิดพลาดเฉลี่ย", f(mean(appErr), 2), f(mean(sheetErr), 2), "รายการ"],
  ["SUS เฉลี่ย", susScores.length ? f(mean(susScores)) : "—", "—", "คะแนน 0-100"],
];
const outPath = resolve(dirname(file), "usability-summary.csv");
writeFileSync(outPath, "﻿" + summaryRows.map((r) => r.join(",")).join("\n"), "utf8");
console.log(`\n📄 บันทึกตารางสรุปสำหรับทำกราฟ → ${outPath}`);
console.log(`${line}\n`);
