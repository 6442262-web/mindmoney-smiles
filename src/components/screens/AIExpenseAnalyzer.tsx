import React, { useState, useMemo } from 'react';
import { ArrowLeft, Plus, Trash2, RotateCcw, FileDown, Loader2, AlertCircle, CheckCircle, Upload, Sparkles, TrendingUp, TrendingDown, Shield, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useTransactions } from '@/hooks/useTransactions';
import { useCategories } from '@/hooks/useCategories';
import { getLocalDateString } from '@/lib/dateUtils';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/hooks/useLanguage';
import { exportTransactionsCsv } from '@/lib/exportCsv';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { th } from 'date-fns/locale';

interface Expense {
  detail: string;
  amount: number;
  category?: string;
  status?: string;
  suggestion?: string;
  risk_score?: number;
}

interface AnalysisResult {
  expenses: Expense[];
  summary: {
    total: number;
    warnings: string[];
    insights: string[];
    risk_level?: string;
    savings_potential?: number;
    top_category?: string;
    anomaly_count?: number;
  };
}

interface AIExpenseAnalyzerProps {
  onBack: () => void;
}

export const AIExpenseAnalyzer: React.FC<AIExpenseAnalyzerProps> = ({ onBack }) => {
  const [expenses, setExpenses] = useState<Expense[]>([{ detail: '', amount: 0 }]);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importPeriod, setImportPeriod] = useState<'week' | 'month' | '3months'>('month');
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const { toast } = useToast();
  const { language } = useLanguage();
  const { transactions } = useTransactions();
  const { categories } = useCategories();

  const text = language === 'th' ? {
    title: 'AI วิเคราะห์รายจ่าย',
    description: 'วิเคราะห์เชิงลึก ตรวจสอบความผิดปกติ และคำแนะนำการออม',
    inputExpenses: 'ใส่รายการรายจ่าย',
    expenseDetail: 'รายละเอียด',
    amount: 'จำนวนเงิน (บาท)',
    addExpense: 'เพิ่มรายการ',
    analyze: 'วิเคราะห์ด้วย AI',
    analyzing: 'กำลังวิเคราะห์...',
    reAnalyze: 'วิเคราะห์ใหม่',
    exportCsv: 'ส่งออก CSV',
    exportJson: 'ส่งออก JSON',
    analysisResults: 'ผลการวิเคราะห์',
    category: 'หมวดหมู่',
    status: 'สถานะ',
    suggestion: 'คำแนะนำ',
    summary: 'สรุปผล',
    total: 'ยอดรวม',
    warnings: 'คำเตือน',
    insights: 'ข้อสังเกตและคำแนะนำ',
    normal: 'ปกติ',
    review: 'ตรวจสอบ',
    abnormal: 'ผิดปกติ',
    enterExpenseDetail: 'เช่น ค่าอาหารกลางวัน, ค่าน้ำมัน...',
    analysisError: 'เกิดข้อผิดพลาด',
    analysisSuccess: 'วิเคราะห์เสร็จสิ้น',
    invalidAmount: 'กรุณาใส่จำนวนเงินที่ถูกต้อง (มากกว่า 0)',
    fillAllFields: 'กรุณากรอกรายละเอียดให้ครบทุกรายการ',
    importFromTxns: 'นำเข้าจากรายการจริง',
    importTitle: 'นำเข้ารายจ่ายจากระบบ',
    riskLevel: 'ระดับความเสี่ยง',
    savingsPotential: 'โอกาสประหยัด',
    anomalies: 'รายการผิดปกติ',
  } : {
    title: 'AI Expense Analyzer',
    description: 'Deep analysis, anomaly detection, and savings recommendations',
    inputExpenses: 'Input Expenses',
    expenseDetail: 'Detail',
    amount: 'Amount (THB)',
    addExpense: 'Add Expense',
    analyze: 'Analyze with AI',
    analyzing: 'Analyzing...',
    reAnalyze: 'Re-analyze',
    exportCsv: 'Export CSV',
    exportJson: 'Export JSON',
    analysisResults: 'Analysis Results',
    category: 'Category',
    status: 'Status',
    suggestion: 'Suggestion',
    summary: 'Summary',
    total: 'Total',
    warnings: 'Warnings',
    insights: 'Insights & Recommendations',
    normal: 'Normal',
    review: 'Review',
    abnormal: 'Abnormal',
    enterExpenseDetail: 'e.g. lunch, gas, coffee...',
    analysisError: 'Analysis failed',
    analysisSuccess: 'Analysis completed',
    invalidAmount: 'Please enter a valid amount (greater than 0)',
    fillAllFields: 'Please fill in all expense details',
    importFromTxns: 'Import from transactions',
    importTitle: 'Import expenses from system',
    riskLevel: 'Risk Level',
    savingsPotential: 'Savings Potential',
    anomalies: 'Anomalies',
  };

  // Stats from analysis result
  const analysisStats = useMemo(() => {
    if (!analysisResult) return null;
    const expenses = analysisResult.expenses || [];
    const abnormalCount = expenses.filter(e => e.status === 'ผิดปกติ' || e.status === 'Abnormal').length;
    const reviewCount = expenses.filter(e => e.status === 'ตรวจสอบ' || e.status === 'Review').length;
    const normalCount = expenses.filter(e => e.status === 'ปกติ' || e.status === 'Normal').length;
    const total = analysisResult.summary?.total || 0;
    
    // Group by category
    const catMap = new Map<string, number>();
    expenses.forEach(e => {
      const cat = e.category || 'อื่นๆ';
      catMap.set(cat, (catMap.get(cat) || 0) + (e.amount || 0));
    });
    const topCategories = Array.from(catMap.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);
    
    return { abnormalCount, reviewCount, normalCount, total, topCategories };
  }, [analysisResult]);

  const addExpenseRow = () => {
    setExpenses([...expenses, { detail: '', amount: 0 }]);
  };

  const removeExpenseRow = (index: number) => {
    if (expenses.length > 1) {
      setExpenses(expenses.filter((_, i) => i !== index));
    }
  };

  const updateExpense = (index: number, field: keyof Expense, value: string | number) => {
    const updatedExpenses = [...expenses];
    updatedExpenses[index] = { ...updatedExpenses[index], [field]: value };
    setExpenses(updatedExpenses);
  };

  const importFromTransactions = () => {
    const now = new Date();
    let startDate: Date;
    
    switch (importPeriod) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '3months':
        startDate = subMonths(now, 3);
        break;
      default:
        startDate = startOfMonth(now);
    }

    const filtered = transactions
      .filter(t => t.type === 'expense' && new Date(t.date) >= startDate)
      .slice(0, 50); // Limit to 50 for AI analysis

    if (filtered.length === 0) {
      toast({ title: text.analysisError, description: 'ไม่พบรายการรายจ่ายในช่วงเวลาที่เลือก', variant: 'destructive' });
      return;
    }

    const imported: Expense[] = filtered.map(t => {
      const cat = categories.find(c => c.id === t.category_id);
      return {
        detail: t.description || cat?.name || 'ไม่ระบุ',
        amount: t.amount,
      };
    });

    setExpenses(imported);
    setShowImportDialog(false);
    toast({
      title: `นำเข้า ${imported.length} รายการ`,
      description: 'พร้อมวิเคราะห์ด้วย AI แล้ว',
    });
  };

  const validateExpenses = () => {
    for (const expense of expenses) {
      if (!expense.detail.trim()) {
        toast({ title: text.analysisError, description: text.fillAllFields, variant: "destructive" });
        return false;
      }
      if (expense.amount <= 0 || expense.amount > 999999999) {
        toast({ title: text.analysisError, description: text.invalidAmount, variant: "destructive" });
        return false;
      }
    }
    return true;
  };

  const analyzeExpenses = async () => {
    if (!validateExpenses()) return;

    setIsAnalyzing(true);
    setAnalysisProgress(0);
    
    // Simulate progress
    const progressInterval = setInterval(() => {
      setAnalysisProgress(prev => Math.min(prev + Math.random() * 15, 90));
    }, 500);

    try {
      const { data, error } = await supabase.functions.invoke('analyze-expense', {
        body: { expenses }
      });

      if (error) throw error;

      setAnalysisProgress(100);
      setAnalysisResult(data);
      toast({
        title: text.analysisSuccess,
        description: `วิเคราะห์ ${data.expenses?.length || 0} รายการเรียบร้อย`,
      });
    } catch (error) {
      console.error('Error analyzing expenses:', error);
      toast({ title: text.analysisError, description: 'กรุณาลองใหม่อีกครั้ง', variant: "destructive" });
    } finally {
      clearInterval(progressInterval);
      setIsAnalyzing(false);
      setTimeout(() => setAnalysisProgress(0), 1000);
    }
  };

  const exportJson = () => {
    if (!analysisResult) return;
    const reportData = {
      timestamp: new Date().toISOString(),
      generated: new Date().toLocaleString('th-TH'),
      expenses: analysisResult.expenses,
      summary: analysisResult.summary
    };
    const jsonString = JSON.stringify(reportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-analysis-${getLocalDateString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "ส่งออก JSON สำเร็จ" });
  };

  const exportCsv = () => {
    if (!analysisResult) return;
    const rows = analysisResult.expenses.map(e => ({
      date: getLocalDateString(),
      description: e.detail,
      type: 'expense' as const,
      amount: e.amount,
      category: e.category || '',
      account: '',
      note: `สถานะ: ${e.status || '-'} | ${e.suggestion || ''}`,
    }));
    exportTransactionsCsv(rows, `ai-analysis-${getLocalDateString()}`);
    toast({ title: "ส่งออก CSV สำเร็จ" });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ปกติ':
      case 'Normal':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-0"><CheckCircle className="w-3 h-3 mr-1" />{text.normal}</Badge>;
      case 'ตรวจสอบ':
      case 'Review':
        return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-0"><AlertCircle className="w-3 h-3 mr-1" />{text.review}</Badge>;
      case 'ผิดปกติ':
      case 'Abnormal':
        return <Badge variant="destructive"><Shield className="w-3 h-3 mr-1" />{text.abnormal}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getRiskColor = (level: string | undefined) => {
    if (!level) return 'text-muted-foreground';
    if (level.includes('ต่ำ') || level.includes('Low')) return 'text-green-600';
    if (level.includes('ปานกลาง') || level.includes('Medium')) return 'text-amber-600';
    return 'text-red-600';
  };

  return (
    <div className="p-4 pb-20 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            {text.title}
          </h1>
          <p className="text-xs text-muted-foreground">{text.description}</p>
        </div>
      </div>

      {/* Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{text.importTitle}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            {[
              { value: 'week' as const, label: '7 วันล่าสุด', count: transactions.filter(t => t.type === 'expense' && new Date(t.date) >= new Date(Date.now() - 7 * 86400000)).length },
              { value: 'month' as const, label: 'เดือนนี้', count: transactions.filter(t => t.type === 'expense' && new Date(t.date) >= startOfMonth(new Date())).length },
              { value: '3months' as const, label: '3 เดือนล่าสุด', count: transactions.filter(t => t.type === 'expense' && new Date(t.date) >= subMonths(new Date(), 3)).length },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setImportPeriod(opt.value)}
                className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors text-left ${
                  importPeriod === opt.value ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:bg-muted/50'
                }`}
              >
                <div>
                  <div className="font-medium text-sm">{opt.label}</div>
                  <div className="text-xs text-muted-foreground">{Math.min(opt.count, 50)} รายการ {opt.count > 50 ? '(จำกัด 50)' : ''}</div>
                </div>
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowImportDialog(false)}>ยกเลิก</Button>
            <Button onClick={importFromTransactions}>
              <Upload className="w-4 h-4 mr-1" />นำเข้า
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Analysis Progress */}
      {isAnalyzing && (
        <Card className="mb-4 border-primary/30">
          <CardContent className="py-4">
            <div className="flex items-center gap-3 mb-2">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span className="text-sm font-medium">{text.analyzing}</span>
              <span className="text-xs text-muted-foreground ml-auto">{Math.round(analysisProgress)}%</span>
            </div>
            <Progress value={analysisProgress} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              AI กำลังตรวจสอบรายการ {expenses.length} รายการ วิเคราะห์หมวดหมู่ ตรวจจับความผิดปกติ และสร้างคำแนะนำ...
            </p>
          </CardContent>
        </Card>
      )}

      {/* Results Section - Show on top when available */}
      {analysisResult && !isAnalyzing && (
        <div className="space-y-4 mb-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-3">
              <div className="text-xs text-muted-foreground mb-1">{text.total}</div>
              <div className="text-lg font-bold text-foreground">
                ฿{analysisStats?.total?.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground">{analysisResult.expenses?.length} รายการ</div>
            </Card>
            <Card className="p-3">
              <div className="text-xs text-muted-foreground mb-1">{text.riskLevel}</div>
              <div className={`text-lg font-bold ${getRiskColor(analysisResult.summary?.risk_level)}`}>
                {analysisResult.summary?.risk_level || 'ปกติ'}
              </div>
              <div className="text-xs text-muted-foreground">{analysisStats?.abnormalCount || 0} {text.anomalies}</div>
            </Card>
          </div>

          {/* Status Overview */}
          {analysisStats && (
            <Card className="p-4">
              <h4 className="text-sm font-medium mb-3">สถานะรายการ</h4>
              <div className="flex gap-2 mb-3">
                <div className="flex-1 text-center p-2 rounded-lg bg-green-50 dark:bg-green-900/20">
                  <div className="text-lg font-bold text-green-600">{analysisStats.normalCount}</div>
                  <div className="text-[10px] text-green-600">ปกติ</div>
                </div>
                <div className="flex-1 text-center p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20">
                  <div className="text-lg font-bold text-amber-600">{analysisStats.reviewCount}</div>
                  <div className="text-[10px] text-amber-600">ตรวจสอบ</div>
                </div>
                <div className="flex-1 text-center p-2 rounded-lg bg-red-50 dark:bg-red-900/20">
                  <div className="text-lg font-bold text-red-600">{analysisStats.abnormalCount}</div>
                  <div className="text-[10px] text-red-600">ผิดปกติ</div>
                </div>
              </div>
              
              {/* Top categories bar */}
              {analysisStats.topCategories.length > 0 && (
                <div className="space-y-2">
                  <h5 className="text-xs font-medium text-muted-foreground">สัดส่วนตามหมวดหมู่</h5>
                  {analysisStats.topCategories.map(([cat, amount], i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-xs w-20 truncate">{cat}</span>
                      <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${(amount / (analysisStats.topCategories[0]?.[1] || 1)) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-16 text-right">฿{amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* Savings Potential */}
          {analysisResult.summary?.savings_potential && analysisResult.summary.savings_potential > 0 && (
            <Card className="p-4 border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10">
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-700 dark:text-green-400">{text.savingsPotential}</span>
              </div>
              <div className="text-xl font-bold text-green-600">
                ฿{analysisResult.summary.savings_potential.toLocaleString()}/เดือน
              </div>
            </Card>
          )}

          {/* Warnings */}
          {analysisResult.summary?.warnings?.length > 0 && (
            <Card className="p-4">
              <h4 className="text-sm font-medium text-amber-600 mb-2 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />{text.warnings}
              </h4>
              <div className="space-y-2">
                {analysisResult.summary.warnings.map((w, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm p-2 rounded bg-amber-50 dark:bg-amber-900/20">
                    <span className="text-amber-500 mt-0.5">⚠️</span>
                    <span className="text-amber-800 dark:text-amber-300">{w}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Insights */}
          {analysisResult.summary?.insights?.length > 0 && (
            <Card className="p-4">
              <h4 className="text-sm font-medium text-blue-600 mb-2 flex items-center gap-1">
                <Sparkles className="w-4 h-4" />{text.insights}
              </h4>
              <div className="space-y-2">
                {analysisResult.summary.insights.map((insight, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm p-2 rounded bg-blue-50 dark:bg-blue-900/20">
                    <span className="text-blue-500 mt-0.5">💡</span>
                    <span className="text-blue-800 dark:text-blue-300">{insight}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Detailed Expense List */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium">รายละเอียดแต่ละรายการ</h4>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={exportCsv} className="h-7 text-xs">
                  <FileDown className="w-3 h-3 mr-1" />CSV
                </Button>
                <Button variant="ghost" size="sm" onClick={exportJson} className="h-7 text-xs">
                  <FileDown className="w-3 h-3 mr-1" />JSON
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              {analysisResult.expenses?.map((expense, index) => (
                <div key={index} className="p-3 border rounded-lg space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{expense.detail}</p>
                      <p className="text-xs text-muted-foreground">฿{expense.amount?.toLocaleString()}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {getStatusBadge(expense.status || '')}
                      <Badge variant="outline" className="text-[10px]">{expense.category}</Badge>
                    </div>
                  </div>
                  {expense.suggestion && (
                    <div className="text-xs p-2 rounded bg-muted text-muted-foreground">
                      💡 {expense.suggestion}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* Re-analyze button */}
          <Button variant="outline" onClick={analyzeExpenses} disabled={isAnalyzing} className="w-full">
            <RotateCcw className="w-4 h-4 mr-2" />{text.reAnalyze}
          </Button>
        </div>
      )}

      {/* Input Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">{text.inputExpenses}</CardTitle>
              <CardDescription className="text-xs">{expenses.length} รายการ</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowImportDialog(true)} className="text-xs h-8">
              <Upload className="w-3 h-3 mr-1" />{text.importFromTxns}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {expenses.map((expense, index) => (
            <div key={index} className="flex gap-2 items-end">
              <div className="flex-1">
                {index === 0 && <Label className="text-[10px] text-muted-foreground">{text.expenseDetail}</Label>}
                <Input
                  placeholder={text.enterExpenseDetail}
                  value={expense.detail}
                  onChange={(e) => updateExpense(index, 'detail', e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div className="w-28">
                {index === 0 && <Label className="text-[10px] text-muted-foreground">{text.amount}</Label>}
                <Input
                  type="number"
                  min="0"
                  max="999999999"
                  step="0.01"
                  value={expense.amount || ''}
                  onChange={(e) => updateExpense(index, 'amount', parseFloat(e.target.value) || 0)}
                  className="h-9 text-sm"
                />
              </div>
              {expenses.length > 1 && (
                <Button variant="ghost" size="icon" onClick={() => removeExpenseRow(index)} className="h-9 w-9 text-destructive shrink-0">
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}

          <div className="flex gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={addExpenseRow} className="text-xs">
              <Plus className="w-3 h-3 mr-1" />{text.addExpense}
            </Button>
            <Button size="sm" onClick={analyzeExpenses} disabled={isAnalyzing} className="flex-1 text-xs">
              {isAnalyzing ? (
                <><Loader2 className="w-3 h-3 animate-spin mr-1" />{text.analyzing}</>
              ) : (
                <><Sparkles className="w-3 h-3 mr-1" />{text.analyze}</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Empty State */}
      {!analysisResult && !isAnalyzing && (
        <Card className="mt-4 border-dashed">
          <CardContent className="py-8 text-center">
            <BarChart3 className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground mb-1">ยังไม่มีผลการวิเคราะห์</p>
            <p className="text-xs text-muted-foreground">กรอกรายจ่ายหรือนำเข้าจากรายการจริง แล้วกด "วิเคราะห์ด้วย AI"</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
