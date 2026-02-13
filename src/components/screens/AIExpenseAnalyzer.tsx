import React, { useState } from 'react';
import { ArrowLeft, Plus, Trash2, RotateCcw, FileDown, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { getLocalDateString } from '@/lib/dateUtils';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/hooks/useLanguage';

interface Expense {
  detail: string;
  amount: number;
  category?: string;
  status?: string;
  suggestion?: string;
}

interface AnalysisResult {
  expenses: Expense[];
  summary: {
    total: number;
    warnings: string[];
    insights: string[];
  };
}

interface AIExpenseAnalyzerProps {
  onBack: () => void;
}

export const AIExpenseAnalyzer: React.FC<AIExpenseAnalyzerProps> = ({ onBack }) => {
  const [expenses, setExpenses] = useState<Expense[]>([{ detail: '', amount: 0 }]);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { toast } = useToast();
  const { language } = useLanguage();

  const translations = {
    th: {
      title: 'AI วิเคราะห์รายจ่าย',
      description: 'ให้ AI ช่วยตรวจสอบและจัดหมวดหมู่รายจ่ายของคุณ',
      inputExpenses: 'ใส่รายการรายจ่าย',
      expenseDetail: 'รายละเอียด',
      amount: 'จำนวนเงิน',
      addExpense: 'เพิ่มรายการ',
      analyze: 'วิเคราะห์',
      analyzing: 'กำลังวิเคราะห์...',
      reAnalyze: 'ตรวจสอบอีกครั้ง',
      exportReport: 'ส่งออกรายงาน',
      analysisResults: 'ผลการวิเคราะห์',
      category: 'หมวดหมู่',
      status: 'สถานะ',
      suggestion: 'คำแนะนำ',
      summary: 'สรุปผล',
      total: 'ยอดรวม',
      warnings: 'คำเตือน',
      insights: 'ข้อสังเกต',
      normal: 'ปกติ',
      review: 'ตรวจสอบ',
      abnormal: 'ผิดปกติ',
      noWarnings: 'ไม่มีคำเตือน',
      noInsights: 'ไม่มีข้อสังเกต',
      enterExpenseDetail: 'ใส่รายละเอียดรายจ่าย...',
      analysisError: 'เกิดข้อผิดพลาดในการวิเคราะห์',
      analysisSuccess: 'วิเคราะห์เสร็จสิ้น',
      invalidAmount: 'กรุณาใส่จำนวนเงินที่ถูกต้อง',
      fillAllFields: 'กรุณากรอกข้อมูลให้ครบถ้วน'
    },
    en: {
      title: 'AI Expense Analyzer',
      description: 'Let AI help verify and categorize your expenses',
      inputExpenses: 'Input Expenses',
      expenseDetail: 'Detail',
      amount: 'Amount',
      addExpense: 'Add Expense',
      analyze: 'Analyze',
      analyzing: 'Analyzing...',
      reAnalyze: 'Re-analyze',
      exportReport: 'Export Report',
      analysisResults: 'Analysis Results',
      category: 'Category',
      status: 'Status',
      suggestion: 'Suggestion',
      summary: 'Summary',
      total: 'Total',
      warnings: 'Warnings',
      insights: 'Insights',
      normal: 'Normal',
      review: 'Review',
      abnormal: 'Abnormal',
      noWarnings: 'No warnings',
      noInsights: 'No insights',
      enterExpenseDetail: 'Enter expense detail...',
      analysisError: 'Analysis failed',
      analysisSuccess: 'Analysis completed',
      invalidAmount: 'Please enter a valid amount',
      fillAllFields: 'Please fill in all fields'
    }
  };

  const text = translations[language];

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

  const validateExpenses = () => {
    for (const expense of expenses) {
      if (!expense.detail.trim()) {
        toast({
          title: text.analysisError,
          description: text.fillAllFields,
          variant: "destructive",
        });
        return false;
      }
      if (expense.amount <= 0) {
        toast({
          title: text.analysisError,
          description: text.invalidAmount,
          variant: "destructive",
        });
        return false;
      }
    }
    return true;
  };

  const analyzeExpenses = async () => {
    if (!validateExpenses()) return;

    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-expense', {
        body: { expenses }
      });

      if (error) {
        throw error;
      }

      setAnalysisResult(data);
      toast({
        title: text.analysisSuccess,
        description: `วิเคราะห์รายการ ${data.expenses?.length || 0} รายการเรียบร้อย`,
      });
    } catch (error) {
      console.error('Error analyzing expenses:', error);
      toast({
        title: text.analysisError,
        description: 'กรุณาลองใหม่อีกครั้ง',
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const exportReport = () => {
    if (!analysisResult) return;

    const reportData = {
      timestamp: new Date().toLocaleString('th-TH'),
      expenses: analysisResult.expenses,
      summary: analysisResult.summary
    };

    const jsonString = JSON.stringify(reportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `expense-analysis-${getLocalDateString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "ส่งออกรายงานสำเร็จ",
      description: "ดาวน์โหลดไฟล์รายงานเรียบร้อยแล้ว",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ปกติ':
      case 'Normal':
        return <Badge variant="default" className="bg-green-100 text-green-800">{text.normal}</Badge>;
      case 'ตรวจสอบ':
      case 'Review':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">{text.review}</Badge>;
      case 'ผิดปกติ':
      case 'Abnormal':
        return <Badge variant="destructive">{text.abnormal}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          กลับ
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{text.title}</h1>
          <p className="text-muted-foreground">{text.description}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <Card>
          <CardHeader>
            <CardTitle>{text.inputExpenses}</CardTitle>
            <CardDescription>
              กรอกรายการรายจ่ายที่ต้องการให้ AI วิเคราะห์
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {expenses.map((expense, index) => (
              <div key={index} className="grid grid-cols-1 gap-2 p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">รายการที่ {index + 1}</Label>
                  {expenses.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeExpenseRow(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                <div className="space-y-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">{text.expenseDetail}</Label>
                    <Input
                      placeholder={text.enterExpenseDetail}
                      value={expense.detail}
                      onChange={(e) => updateExpense(index, 'detail', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">{text.amount}</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={expense.amount || ''}
                      onChange={(e) => updateExpense(index, 'amount', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>
              </div>
            ))}

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={addExpenseRow}
                className="flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                {text.addExpense}
              </Button>
              
              <Button
                onClick={analyzeExpenses}
                disabled={isAnalyzing}
                className="flex items-center gap-2"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {text.analyzing}
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    {text.analyze}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results Section */}
        <Card>
          <CardHeader>
            <CardTitle>{text.analysisResults}</CardTitle>
            <CardDescription>
              {analysisResult ? 'ผลการวิเคราะห์จาก AI' : 'ยังไม่มีผลการวิเคราะห์'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {analysisResult ? (
              <div className="space-y-6">
                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={analyzeExpenses}
                    disabled={isAnalyzing}
                    className="flex items-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    {text.reAnalyze}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={exportReport}
                    className="flex items-center gap-2"
                  >
                    <FileDown className="w-4 h-4" />
                    {text.exportReport}
                  </Button>
                </div>

                <Separator />

                {/* Analyzed Expenses */}
                <div className="space-y-3">
                  {analysisResult.expenses?.map((expense, index) => (
                    <div key={index} className="p-3 border rounded-lg space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium">{expense.detail}</p>
                          <p className="text-sm text-muted-foreground">
                            ฿{expense.amount?.toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right space-y-1">
                          {getStatusBadge(expense.status || '')}
                          <Badge variant="outline" className="ml-2">
                            {expense.category}
                          </Badge>
                        </div>
                      </div>
                      {expense.suggestion && (
                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            {expense.suggestion}
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  ))}
                </div>

                <Separator />

                {/* Summary */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <span className="font-medium">{text.total}:</span>
                    <span className="text-lg font-bold">
                      ฿{analysisResult.summary?.total?.toLocaleString()}
                    </span>
                  </div>

                  {/* Warnings */}
                  {analysisResult.summary?.warnings?.length > 0 && (
                    <div>
                      <h4 className="font-medium text-amber-600 mb-2">{text.warnings}:</h4>
                      <div className="space-y-1">
                        {analysisResult.summary.warnings.map((warning, index) => (
                          <Alert key={index} className="border-amber-200 bg-amber-50">
                            <AlertCircle className="h-4 w-4 text-amber-600" />
                            <AlertDescription className="text-amber-800">
                              {warning}
                            </AlertDescription>
                          </Alert>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Insights */}
                  {analysisResult.summary?.insights?.length > 0 && (
                    <div>
                      <h4 className="font-medium text-blue-600 mb-2">{text.insights}:</h4>
                      <div className="space-y-1">
                        {analysisResult.summary.insights.map((insight, index) => (
                          <Alert key={index} className="border-blue-200 bg-blue-50">
                            <AlertCircle className="h-4 w-4 text-blue-600" />
                            <AlertDescription className="text-blue-800">
                              {insight}
                            </AlertDescription>
                          </Alert>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>กรุณากรอกข้อมูลรายจ่ายและกดปุ่ม "วิเคราะห์" เพื่อเริ่มต้น</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};