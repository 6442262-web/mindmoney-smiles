#!/usr/bin/env node
/**
 * วิเคราะห์ผลการทดลอง Learnability — เทียบรอบที่ 1 กับรอบที่ 2 ของคนเดียวกัน (ใช้แอปอย่างเดียว)
 * คำนวณ mean±SD, % ที่ดีขึ้น, paired t-test, Cohen's d, คะแนน SUS เทียบเกณฑ์ 68
 * ใช้:  node experiments/app-usability/analyze-learnability.mjs <ไฟล์.csv>
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const file = process.argv[2] || resolve(dirname(new URL(import.meta.url).pathname), "data-learnability-template.csv");

const text = readFileSync(file, "utf8").replace(/^﻿/, "");
const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
const header = lines[0].split(",").map((h) => h.trim());
const rows = lines.slice(1).map((line) => {
  const cells = line.split(",");
  const obj = {};
  header.forEach((h, i) => (obj[h] = (cells[i] ?? "").trim()));
  return obj;
});
if (!rows.length) { console.error("ไม่พบข้อมูล"); process.exit(1); }

const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : NaN; };
const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
const sd = (a) => { if (a.length < 2) return 0; const m = mean(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1)); };
const T_CRIT = { 1:12.706,2:4.303,3:3.182,4:2.776,5:2.571,6:2.447,7:2.365,8:2.306,9:2.262,10:2.228,11:2.201,12:2.179,13:2.16,14:2.145,15:2.131,16:2.12,17:2.11,18:2.101,19:2.093,20:2.086,21:2.08,22:2.074,23:2.069,24:2.064,25:2.06,26:2.056,27:2.052,28:2.048,29:2.045,30:2.042 };
const tCrit = (df) => T_CRIT[df] ?? 1.96;
function pairedT(before, after) {
  const d = before.map((b, i) => b - after[i]);
  const n = d.length, md = mean(d), sdd = sd(d), se = sdd / Math.sqrt(n);
  const t = se === 0 ? 0 : md / se, df = n - 1;
  return { t, df, crit: tCrit(df), significant: Math.abs(t) > tCrit(df), d: sdd === 0 ? 0 : md / sdd };
}
function susScore(r) {
  let sum = 0;
  for (let i = 1; i <= 10; i++) {
    const v = num(r[`sus_${i}`]);
    if (Number.isNaN(v)) return NaN;
    sum += i % 2 === 1 ? v - 1 : 5 - v;
  }
  return sum * 2.5;
}

const t1 = rows.map((r) => num(r.round1_time_s)), t2 = rows.map((r) => num(r.round2_time_s));
const e1 = rows.map((r) => num(r.round1_errors)), e2 = rows.map((r) => num(r.round2_errors));
const sus = rows.map(susScore).filter((x) => !Number.isNaN(x));
const f = (x, d = 1) => (Number.isFinite(x) ? x.toFixed(d) : "—");
const line = "─".repeat(60);

console.log(`\n${line}\nการทดลอง Learnability: รอบที่ 1 เทียบรอบที่ 2  (n = ${rows.length} คน)\n${line}`);

console.log("\n▌ เวลาบันทึก 10 รายการ (วินาที)");
console.log(`   รอบที่ 1 (ครั้งแรก) : ${f(mean(t1))} ± ${f(sd(t1))}`);
console.log(`   รอบที่ 2 (คุ้นเคย)  : ${f(mean(t2))} ± ${f(sd(t2))}`);
{
  const r = pairedT(t1, t2);
  console.log(`   → เร็วขึ้น ${f((1 - mean(t2) / mean(t1)) * 100)}% | paired t = ${f(r.t, 3)}, df = ${r.df}, ค่าวิกฤต = ${f(r.crit, 3)}, |d| = ${f(Math.abs(r.d), 2)}`);
  console.log(`   → ${r.significant ? "✅ ลดลงอย่างมีนัยสำคัญ (p < .05) — แอปเรียนรู้ได้เร็ว" : "❌ ยังไม่มีนัยสำคัญ (p ≥ .05)"}`);
}

console.log("\n▌ จำนวนข้อผิดพลาด");
console.log(`   รอบที่ 1 : ${f(mean(e1), 2)} ± ${f(sd(e1), 2)}`);
console.log(`   รอบที่ 2 : ${f(mean(e2), 2)} ± ${f(sd(e2), 2)}`);
{
  const r = pairedT(e1, e2);
  console.log(`   → paired t = ${f(r.t, 3)}, df = ${r.df}, ค่าวิกฤต = ${f(r.crit, 3)}, |d| = ${f(Math.abs(r.d), 2)}`);
  console.log(`   → ${r.significant ? "✅ ลดลงอย่างมีนัยสำคัญ (p < .05)" : "❌ ยังไม่มีนัยสำคัญ (p ≥ .05)"}`);
}

console.log("\n▌ ความพึงพอใจ SUS (0–100)");
if (sus.length) {
  const m = mean(sus);
  const grade = m >= 80.3 ? "เกรด A (ดีเยี่ยม)" : m > 68 ? "สูงกว่าค่าเฉลี่ยระบบทั่วไป" : "ต่ำกว่าค่าเฉลี่ยสากล";
  console.log(`   SUS เฉลี่ย: ${f(m)} ± ${f(sd(sus))} → ${grade} (เกณฑ์อ้างอิง: 68)`);
} else console.log("   (ยังไม่มีข้อมูล SUS)");

const out = [
  ["ตัวชี้วัด", "รอบที่ 1", "รอบที่ 2", "หน่วย"],
  ["เวลาเฉลี่ย", f(mean(t1)), f(mean(t2)), "วินาที"],
  ["SD เวลา", f(sd(t1)), f(sd(t2)), "วินาที"],
  ["ข้อผิดพลาดเฉลี่ย", f(mean(e1), 2), f(mean(e2), 2), "รายการ"],
  ["SUS เฉลี่ย", sus.length ? f(mean(sus)) : "—", "—", "คะแนน 0-100"],
];
const outPath = resolve(dirname(file), "learnability-summary.csv");
writeFileSync(outPath, "﻿" + out.map((r) => r.join(",")).join("\n"), "utf8");
console.log(`\n📄 ตารางสรุปสำหรับทำกราฟ → ${outPath}\n${line}\n`);
