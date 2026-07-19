import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, FlaskConical, Play, Square, Download, Loader2 } from "lucide-react";
import { describeFunctionError } from "@/lib/functionError";
import { invokeChatTransaction } from "@/lib/aiChat";
import testSet from "../../../experiments/chat-test-set.json";

// หน้าการทดลองสำหรับโครงงาน: วัดความแม่นยำ AI แยกรายการจากประโยคภาษาไทย 100 ประโยค
// เปิดจากมือถือได้เลย ไม่ต้องใช้คอมพิวเตอร์/terminal — กดเริ่มแล้วรอ ระบบตรวจคะแนนอัตโนมัติ

interface TestItem {
  id: number;
  group: string;
  text: string;
  expect: { record: boolean; type?: string; amount?: number; category?: string | null };
}
interface RowResult {
  id: number;
  group: string;
  text: string;
  expected: string;
  got: string;
  decisionOK: boolean;
  typeOK: boolean | null;
  amountOK: boolean | null;
  categoryOK: boolean | null;
}

const GROUPS = (testSet as { groups: Record<string, string> }).groups;
const ITEMS = (testSet as unknown as { items: TestItem[] }).items;
const STORAGE_KEY = "ai-experiment-last-result";

const pct = (list: (boolean | null)[]) => {
  const valid = list.filter((v): v is boolean => v !== null);
  if (!valid.length) return "—";
  return ((valid.filter(Boolean).length / valid.length) * 100).toFixed(1) + "%";
};

export function AiExperiment() {
  const [label, setLabel] = useState("หลังปรับปรุง prompt");
  const [limit, setLimit] = useState(100);
  const [delaySec, setDelaySec] = useState(5);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [current, setCurrent] = useState("");
  const [rows, setRows] = useState<RowResult[]>([]);
  const [finishedAt, setFinishedAt] = useState<string | null>(null);
  const stopRef = useRef(false);

  // โหลดผลรอบก่อนจาก localStorage (กันเผลอรีเฟรชแล้วผลหาย)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.rows) && parsed.rows.length) {
          setRows(parsed.rows);
          setFinishedAt(parsed.finishedAt ?? null);
          if (parsed.label) setLabel(parsed.label);
        }
      }
    } catch { /* ผลเก่าอ่านไม่ได้ก็เริ่มใหม่ */ }
  }, []);

  const run = async () => {
    stopRef.current = false;
    setRunning(true);
    setRows([]);
    setFinishedAt(null);
    const items = ITEMS.slice(0, limit);
    const collected: RowResult[] = [];

    for (let i = 0; i < items.length; i++) {
      if (stopRef.current) break;
      const item = items[i];
      setProgress(i + 1);
      setCurrent(item.text);

      let ai: { transaction?: { type?: string; amount?: number; category_name?: string } | null } | null = null;
      let errMsg = "";
      try {
        const { data, error } = await invokeChatTransaction({ message: item.text, categories: [], history: [] });
        if (error) throw error;
        ai = data as typeof ai;
      } catch (e) {
        errMsg = (await describeFunctionError(e)).slice(0, 80);
      }

      const txn = ai?.transaction ?? null;
      const gotRecord = !!txn;
      const exp = item.expect;
      collected.push({
        id: item.id,
        group: item.group,
        text: item.text,
        expected: exp.record ? `${exp.type} ${exp.amount} ${exp.category ?? "-"}` : "ไม่บันทึก",
        got: gotRecord
          ? `${txn!.type} ${txn!.amount} ${txn!.category_name ?? "-"}`
          : errMsg ? `ERROR: ${errMsg}` : "ไม่บันทึก",
        decisionOK: gotRecord === exp.record,
        typeOK: !exp.record ? null : gotRecord && txn!.type === exp.type,
        amountOK: !exp.record ? null : gotRecord && Math.abs(Number(txn!.amount) - (exp.amount ?? 0)) < 0.01,
        categoryOK: !exp.record || exp.category == null ? null
          : gotRecord && typeof txn!.category_name === "string" && txn!.category_name.includes(exp.category),
      });
      setRows([...collected]);

      if (i < items.length - 1 && !stopRef.current) {
        await new Promise((r) => setTimeout(r, delaySec * 1000));
      }
    }

    const stamp = new Date().toLocaleString("th-TH");
    setFinishedAt(stamp);
    setRunning(false);
    setCurrent("");
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ rows: collected, finishedAt: stamp, label }));
    } catch { /* พื้นที่เต็มก็ข้าม */ }
  };

  const downloadCsv = () => {
    const header = "id,group,text,expected,got,decisionOK,typeOK,amountOK,categoryOK";
    const lines = rows.map((r) =>
      [r.id, r.group, `"${r.text}"`, `"${r.expected}"`, `"${r.got}"`, r.decisionOK, r.typeOK, r.amountOK, r.categoryOK].join(","));
    const blob = new Blob(["﻿" + [header, ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `ai-accuracy-${label.replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const groupsInResult = Object.keys(GROUPS).filter((g) => rows.some((r) => r.group === g));

  return (
    <div className="pb-20 px-4 pt-6 space-y-4">
      <div className="flex items-center gap-3">
        <Link to="/settings">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <FlaskConical className="h-5 w-5" /> การทดลองความแม่นยำ AI
          </h1>
          <p className="text-xs text-muted-foreground">
            ยิงประโยคทดสอบให้ AI แยกรายการ แล้วตรวจคะแนนอัตโนมัติจากเฉลย {ITEMS.length} ประโยค 9 กลุ่ม
          </p>
        </div>
      </div>

      <Card className="p-4 space-y-3">
        <div>
          <label className="text-xs text-muted-foreground">ชื่อรอบทดลอง (เช่น ก่อนปรับปรุง / หลังปรับปรุง)</label>
          <Input value={label} onChange={(e) => setLabel(e.target.value)} disabled={running} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">จำนวนประโยค</label>
            <select
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={limit} onChange={(e) => setLimit(Number(e.target.value))} disabled={running}
            >
              <option value={10}>10 (ลองระบบ)</option>
              <option value={30}>30</option>
              <option value={100}>100 (ฉบับเต็ม)</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">หน่วงระหว่างประโยค (วินาที)</label>
            <select
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={delaySec} onChange={(e) => setDelaySec(Number(e.target.value))} disabled={running}
            >
              <option value={2}>2</option>
              <option value={5}>5 (แนะนำ — กัน rate limit)</option>
              <option value={8}>8</option>
            </select>
          </div>
        </div>
        {!running ? (
          <Button className="w-full" onClick={run}>
            <Play className="h-4 w-4 mr-2" /> เริ่มการทดลอง ({limit} ประโยค ≈ {Math.ceil((limit * delaySec) / 60)} นาที)
          </Button>
        ) : (
          <Button className="w-full" variant="destructive" onClick={() => { stopRef.current = true; }}>
            <Square className="h-4 w-4 mr-2" /> หยุด (เก็บผลเท่าที่ทดสอบแล้ว)
          </Button>
        )}
        {running && (
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin shrink-0" />
            <span>ประโยคที่ {progress}/{limit}: “{current}”</span>
          </div>
        )}
      </Card>

      {rows.length > 0 && (
        <>
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold">สรุปผล — {label}</h2>
              {finishedAt && <span className="text-[10px] text-muted-foreground">เสร็จ {finishedAt}</span>}
            </div>
            <div className="grid grid-cols-2 gap-2 text-center">
              {([
                ["ตัดสินใจบันทึกถูก", rows.map((r) => r.decisionOK as boolean | null)],
                ["ประเภทรับ-จ่ายถูก", rows.map((r) => r.typeOK)],
                ["จำนวนเงินถูก", rows.map((r) => r.amountOK)],
                ["หมวดหมู่ถูก", rows.map((r) => r.categoryOK)],
              ] as [string, (boolean | null)[]][]).map(([name, list]) => (
                <div key={name} className="p-2 rounded-lg bg-muted/40">
                  <p className="text-[10px] text-muted-foreground">{name}</p>
                  <p className="text-lg font-bold text-primary">{pct(list)}</p>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">ทดสอบแล้ว {rows.length} ประโยค</p>
            <Button variant="outline" size="sm" className="mt-3 w-full" onClick={downloadCsv}>
              <Download className="h-4 w-4 mr-2" /> ดาวน์โหลดผลรายประโยค (CSV เปิดใน Excel ได้)
            </Button>
          </Card>

          <Card className="p-4 overflow-x-auto">
            <h3 className="text-sm font-semibold mb-2">แยกตามกลุ่มประโยค</h3>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-muted-foreground border-b">
                  <th className="text-left py-1 pr-2">กลุ่ม</th>
                  <th className="text-right px-1">ตัดสินใจ</th>
                  <th className="text-right px-1">ประเภท</th>
                  <th className="text-right px-1">เงิน</th>
                  <th className="text-right pl-1">หมวด</th>
                </tr>
              </thead>
              <tbody>
                {groupsInResult.map((g) => {
                  const gr = rows.filter((r) => r.group === g);
                  return (
                    <tr key={g} className="border-b last:border-0">
                      <td className="py-1 pr-2">{g} · {GROUPS[g]}</td>
                      <td className="text-right px-1">{pct(gr.map((r) => r.decisionOK))}</td>
                      <td className="text-right px-1">{pct(gr.map((r) => r.typeOK))}</td>
                      <td className="text-right px-1">{pct(gr.map((r) => r.amountOK))}</td>
                      <td className="text-right pl-1">{pct(gr.map((r) => r.categoryOK))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>

          <Card className="p-4">
            <h3 className="text-sm font-semibold mb-2 text-amber-600">ประโยคที่ AI ตอบไม่ตรงเฉลย</h3>
            <div className="space-y-1 max-h-56 overflow-auto">
              {rows.filter((r) => !r.decisionOK || r.typeOK === false || r.amountOK === false || r.categoryOK === false)
                .map((r) => (
                  <p key={r.id} className="text-[11px] text-muted-foreground">
                    [{r.group}{r.id}] “{r.text}” → ได้ {r.got} (เฉลย {r.expected})
                  </p>
                ))}
              {rows.every((r) => r.decisionOK && r.typeOK !== false && r.amountOK !== false && r.categoryOK !== false) && (
                <p className="text-[11px] text-green-600">ไม่มี — ถูกทุกประโยค 🎉</p>
              )}
            </div>
          </Card>
        </>
      )}

      <Card className="p-4 bg-muted/30">
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          <b>วิธีทำการทดลองก่อน/หลัง:</b> (1) Deploy ฟังก์ชัน chat-transaction เวอร์ชัน
          "ก่อนปรับปรุง" (ไฟล์ experiments/baseline-chat-transaction.ts) → รันหน้านี้ ตั้งชื่อรอบ
          "ก่อนปรับปรุง" → ดาวน์โหลด CSV (2) Deploy เวอร์ชันปัจจุบัน
          (supabase/functions/chat-transaction/index.ts) → รันอีกครั้ง ตั้งชื่อ "หลังปรับปรุง" →
          ดาวน์โหลด CSV แล้วนำสอง CSV ไปเทียบเป็นกราฟ · การทดลองนี้ไม่บันทึกรายการลงบัญชีจริง
        </p>
      </Card>
    </div>
  );
}
