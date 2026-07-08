import { useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Upload, FileText, CheckCircle2, AlertTriangle, Loader2, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useTransactions } from "@/hooks/useTransactions";
import { useCategories } from "@/hooks/useCategories";
import { useAccounts } from "@/hooks/useAccounts";
import { useToast } from "@/hooks/use-toast";
import { parseTransactionsCsv, type ParseResult, type ParsedTransaction } from "@/lib/importCsv";
import { parseTransactionsXlsx, isExcelFile } from "@/lib/importXlsx";
import { cn } from "@/lib/utils";

const fmt = (n: number) =>
  new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", minimumFractionDigits: 0 }).format(n);

interface PreparedRow extends ParsedTransaction {
  categoryId: string | null;
  accountId: string | null;
  categoryLabel: string;
  accountLabel: string;
}

export function ImportTransactions() {
  const { createTransactionsBulk } = useTransactions();
  const { categories } = useCategories();
  const { accounts, currentAccount } = useAccounts();
  const { toast } = useToast();

  const [fileName, setFileName] = useState<string | null>(null);
  const [result, setResult] = useState<ParseResult | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState<{ inserted: number; failed: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Name -> entity lookups (case-insensitive).
  const categoryByName = useMemo(() => {
    const map = new Map<string, { id: string; type: string }>();
    categories.forEach((c) => {
      const key = `${c.name.trim().toLowerCase()}|${c.type}`;
      map.set(key, { id: c.id, type: c.type });
      // also a type-agnostic fallback
      const anyKey = c.name.trim().toLowerCase();
      if (!map.has(anyKey)) map.set(anyKey, { id: c.id, type: c.type });
    });
    return map;
  }, [categories]);

  const accountByName = useMemo(() => {
    const map = new Map<string, string>();
    accounts.forEach((a) => map.set(a.name.trim().toLowerCase(), a.id));
    return map;
  }, [accounts]);

  const prepared: PreparedRow[] = useMemo(() => {
    if (!result) return [];
    return result.valid.map((t) => {
      let categoryId: string | null = null;
      if (t.categoryName) {
        const typed = categoryByName.get(`${t.categoryName.trim().toLowerCase()}|${t.type}`);
        const any = categoryByName.get(t.categoryName.trim().toLowerCase());
        categoryId = typed?.id ?? any?.id ?? null;
      }
      const accountId = (t.accountName && accountByName.get(t.accountName.trim().toLowerCase())) || currentAccount?.id || null;
      return {
        ...t,
        categoryId,
        accountId,
        categoryLabel: t.categoryName ? (categoryId ? t.categoryName : `${t.categoryName} (ไม่ระบุหมวด)`) : "ไม่ระบุหมวด",
        accountLabel: accounts.find((a) => a.id === accountId)?.name ?? "—",
      };
    });
  }, [result, categoryByName, accountByName, currentAccount, accounts]);

  const handleFile = async (file: File) => {
    setDone(null);
    setFileName(file.name);
    try {
      if (isExcelFile(file.name)) {
        const buffer = await file.arrayBuffer();
        setResult(await parseTransactionsXlsx(buffer));
      } else {
        const text = await file.text();
        setResult(parseTransactionsCsv(text));
      }
    } catch {
      toast({ title: "อ่านไฟล์ไม่สำเร็จ", description: "กรุณาตรวจสอบไฟล์แล้วลองใหม่", variant: "destructive" });
      setResult(null);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const reset = () => {
    setResult(null);
    setFileName(null);
    setDone(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleImport = async () => {
    if (prepared.length === 0) return;
    if (!currentAccount && prepared.some((p) => !p.accountId)) {
      toast({ title: "ยังไม่มีบัญชี", description: "กรุณาสร้างบัญชีก่อนนำเข้าข้อมูล", variant: "destructive" });
      return;
    }
    setImporting(true);
    try {
      const items = prepared.map((p) => ({
        type: p.type,
        amount: p.amount,
        description: p.description ?? null,
        note: p.note ?? null,
        date: p.date,
        time: p.time ?? null,
        account_id: p.accountId,
        category_id: p.categoryId,
      }));
      const res = await createTransactionsBulk(items);
      setDone(res);
      if (res.inserted > 0) {
        toast({ title: "นำเข้าสำเร็จ", description: `เพิ่ม ${res.inserted} รายการแล้ว` });
      }
      if (res.failed > 0) {
        toast({ title: "บางรายการนำเข้าไม่สำเร็จ", description: `ล้มเหลว ${res.failed} รายการ`, variant: "destructive" });
      }
    } finally {
      setImporting(false);
    }
  };

  const totalIncome = prepared.filter((p) => p.type === "income").reduce((s, p) => s + p.amount, 0);
  const totalExpense = prepared.filter((p) => p.type === "expense").reduce((s, p) => s + p.amount, 0);

  return (
    <div className="pb-20 px-4 pt-6 space-y-4">
      <div className="flex items-center gap-4 mb-2">
        <Link to="/settings">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold">📥 นำเข้าข้อมูลจาก Excel/CSV</h1>
          <p className="text-xs text-muted-foreground">ลากไฟล์ Excel (.xlsx) หรือ CSV รายรับ-รายจ่ายมาวาง แล้วระบบจะแปลงเป็นรายการให้อัตโนมัติ</p>
        </div>
      </div>

      {/* Dropzone */}
      {!result && (
        <Card
          className={cn(
            "p-8 border-2 border-dashed text-center cursor-pointer transition-colors",
            dragActive ? "border-primary bg-primary/5" : "border-muted"
          )}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={onDrop}
        >
          <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm font-medium">ลากไฟล์ Excel (.xlsx) หรือ CSV มาวางที่นี่</p>
          <p className="text-xs text-muted-foreground mt-1">หรือคลิกเพื่อเลือกไฟล์</p>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
          <div className="mt-4 text-[11px] text-muted-foreground">
            รองรับหัวตาราง: วันที่, ประเภท (รายรับ/รายจ่าย), จำนวนเงิน, หมวดหมู่, รายละเอียด, บัญชี
          </div>
        </Card>
      )}

      {/* Header error */}
      {result?.headerError && (
        <Card className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <div className="flex gap-2 text-sm text-red-700 dark:text-red-400">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">ไม่สามารถอ่านไฟล์ได้</p>
              <p className="text-xs mt-0.5">{result.headerError}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="mt-3" onClick={reset}>เลือกไฟล์ใหม่</Button>
        </Card>
      )}

      {/* Preview */}
      {result && !result.headerError && (
        <>
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="flex items-center gap-2 text-sm font-medium min-w-0">
                <FileText className="h-4 w-4 shrink-0" />
                <span className="truncate">{fileName}</span>
              </span>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={reset}><X className="h-4 w-4" /></Button>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded-lg bg-muted/40">
                <p className="text-[10px] text-muted-foreground">พร้อมนำเข้า</p>
                <p className="text-lg font-bold text-primary">{result.valid.length}</p>
              </div>
              <div className="p-2 rounded-lg bg-muted/40">
                <p className="text-[10px] text-muted-foreground">รายรับ</p>
                <p className="text-sm font-bold text-green-600">{fmt(totalIncome)}</p>
              </div>
              <div className="p-2 rounded-lg bg-muted/40">
                <p className="text-[10px] text-muted-foreground">รายจ่าย</p>
                <p className="text-sm font-bold text-red-600">{fmt(totalExpense)}</p>
              </div>
            </div>
          </Card>

          {done ? (
            <Card className="p-6 text-center space-y-2">
              <CheckCircle2 className="h-10 w-10 mx-auto text-green-500" />
              <p className="font-medium">นำเข้าเสร็จสิ้น</p>
              <p className="text-sm text-muted-foreground">
                เพิ่ม {done.inserted} รายการ{done.failed > 0 ? ` · ล้มเหลว ${done.failed} รายการ` : ""}
              </p>
              <div className="flex gap-2 justify-center pt-2">
                <Button variant="outline" size="sm" onClick={reset}>นำเข้าไฟล์อื่น</Button>
                <Link to="/transactions"><Button size="sm">ดูรายการ</Button></Link>
              </div>
            </Card>
          ) : (
            <Button className="w-full" onClick={handleImport} disabled={importing || result.valid.length === 0}>
              {importing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
              นำเข้า {result.valid.length} รายการ
            </Button>
          )}

          {/* Errors */}
          {result.errors.length > 0 && (
            <Card className="p-4">
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2 text-amber-600">
                <AlertTriangle className="h-4 w-4" /> ข้ามไป {result.errors.length} แถว (ข้อมูลผิด)
              </h3>
              <div className="space-y-1 max-h-40 overflow-auto">
                {result.errors.slice(0, 50).map((e) => (
                  <p key={e.line} className="text-[11px] text-muted-foreground">
                    บรรทัด {e.line}: {e.error}
                  </p>
                ))}
              </div>
            </Card>
          )}

          {/* Row preview */}
          {prepared.length > 0 && !done && (
            <Card className="p-4">
              <h3 className="text-sm font-semibold mb-3">ตัวอย่างข้อมูล (สูงสุด 20 แถวแรก)</h3>
              <div className="space-y-2">
                {prepared.slice(0, 20).map((p) => (
                  <div key={p.line} className="flex items-center justify-between gap-2 text-sm border-b border-muted pb-2 last:border-0">
                    <div className="min-w-0">
                      <p className="truncate">{p.description || p.categoryLabel}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {p.date}{p.time ? ` ${p.time}` : ""} · {p.categoryLabel} · {p.accountLabel}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn("shrink-0", p.type === "income" ? "text-green-600" : "text-red-600")}
                    >
                      {p.type === "income" ? "+" : "-"}{fmt(p.amount)}
                    </Badge>
                  </div>
                ))}
                {prepared.length > 20 && (
                  <p className="text-[11px] text-muted-foreground text-center pt-1">และอีก {prepared.length - 20} รายการ…</p>
                )}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
