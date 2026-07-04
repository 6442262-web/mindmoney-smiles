import React, { useState, useMemo } from 'react';
import { ArrowLeft, Filter, X, BarChart3, PieChart, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval } from 'date-fns';
import { th } from 'date-fns/locale';
import { parseLocalDate } from '@/lib/dateUtils';
interface Transaction {
  id: string;
  date: string;
  description: string;
  category: string;
  amount: number;
  type: 'income' | 'expense';
}

interface TransactionFilterProps {
  onBack: () => void;
  transactions?: Transaction[];
}

export function TransactionFilter({ onBack, transactions = [] }: TransactionFilterProps) {
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [transactionType, setTransactionType] = useState<string>('all');
  const [activeQuickFilter, setActiveQuickFilter] = useState<string>('');
  const [viewMode, setViewMode] = useState<'table' | 'chart'>('table');

  // Quick filter functions
  const applyQuickFilter = (filterType: string) => {
    const today = new Date();
    setActiveQuickFilter(filterType);

    switch (filterType) {
      case 'today':
        setStartDate(startOfDay(today));
        setEndDate(endOfDay(today));
        break;
      case 'week':
        setStartDate(startOfWeek(today, { weekStartsOn: 1 }));
        setEndDate(endOfWeek(today, { weekStartsOn: 1 }));
        break;
      case 'month':
        setStartDate(startOfMonth(today));
        setEndDate(endOfMonth(today));
        break;
      case 'year':
        setStartDate(startOfYear(today));
        setEndDate(endOfYear(today));
        break;
      case 'custom':
        setActiveQuickFilter('custom');
        break;
      default:
        break;
    }
  };

  // Clear all filters
  const clearFilters = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    setTransactionType('all');
    setActiveQuickFilter('');
  };

  // Filter transactions based on current filters
  const filteredTransactions = useMemo(() => {
    return transactions.filter(transaction => {
      const transactionDate = parseLocalDate(transaction.date);
      
      // Date range filter
      if (startDate && endDate) {
        if (!isWithinInterval(transactionDate, { start: startDate, end: endDate })) {
          return false;
        }
      }

      // Transaction type filter
      if (transactionType !== 'all' && transaction.type !== transactionType) {
        return false;
      }

      return true;
    });
  }, [transactions, startDate, endDate, transactionType]);

  // Calculate summary totals
  const summary = useMemo(() => {
    const income = filteredTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const expense = filteredTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      income,
      expense,
      balance: income - expense,
      count: filteredTransactions.length
    };
  }, [filteredTransactions]);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border p-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-semibold text-card-foreground">
              กรองข้อมูลตามวันที่
            </h1>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant={viewMode === 'table' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('table')}
            >
              <Filter className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'chart' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('chart')}
            >
              <BarChart3 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Quick Filter Buttons */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">ช่วงเวลา</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { key: 'today', label: 'วันนี้' },
                { key: 'week', label: 'สัปดาห์นี้' },
                { key: 'month', label: 'เดือนนี้' },
                { key: 'year', label: 'ปีนี้' },
              ].map((filter) => (
                <Button
                  key={filter.key}
                  variant={activeQuickFilter === filter.key ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => applyQuickFilter(filter.key)}
                  className="w-full"
                >
                  {filter.label}
                </Button>
              ))}
            </div>

            {/* Custom Date Range */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>วันที่เริ่มต้น</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      {startDate ? format(startDate, 'dd/MM/yyyy', { locale: th }) : 'เลือกวันที่'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={(date) => {
                        setStartDate(date);
                        if (date) setActiveQuickFilter('custom');
                      }}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>วันที่สิ้นสุด</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      {endDate ? format(endDate, 'dd/MM/yyyy', { locale: th }) : 'เลือกวันที่'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={(date) => {
                        setEndDate(date);
                        if (date) setActiveQuickFilter('custom');
                      }}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transaction Type Filter */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">ประเภทรายการ</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={transactionType} onValueChange={setTransactionType}>
              <SelectTrigger>
                <SelectValue placeholder="เลือกประเภทรายการ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทั้งหมด</SelectItem>
                <SelectItem value="income">รายรับเท่านั้น</SelectItem>
                <SelectItem value="expense">รายจ่ายเท่านั้น</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Clear Filters Button */}
        {(startDate || endDate || transactionType !== 'all') && (
          <Button
            variant="outline"
            onClick={clearFilters}
            className="w-full"
          >
            <X className="h-4 w-4 mr-2" />
            ล้างการกรอง
          </Button>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">จำนวนรายการ</div>
              <div className="text-2xl font-bold text-card-foreground">{summary.count}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">รวมรายรับ</div>
              <div className="text-2xl font-bold text-income">{formatCurrency(summary.income)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">รวมรายจ่าย</div>
              <div className="text-2xl font-bold text-expense">{formatCurrency(summary.expense)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">คงเหลือ</div>
              <div className={`text-2xl font-bold ${summary.balance >= 0 ? 'text-balance-positive' : 'text-balance-negative'}`}>
                {formatCurrency(summary.balance)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Data Display */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">ผลการกรอง</CardTitle>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                ส่งออก
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'table' | 'chart')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="table">ตาราง</TabsTrigger>
                <TabsTrigger value="chart">กราฟ</TabsTrigger>
              </TabsList>

              <TabsContent value="table" className="mt-4">
                {filteredTransactions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    ไม่มีข้อมูลในช่วงวันที่ที่เลือก
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredTransactions.map((transaction) => (
                      <div
                        key={transaction.id}
                        className="flex items-center justify-between p-3 bg-card-accent rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="font-medium text-card-foreground">
                            {transaction.description}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {format(parseLocalDate(transaction.date), 'dd/MM/yyyy', { locale: th })}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`font-semibold ${
                            transaction.type === 'income' ? 'text-income' : 'text-expense'
                          }`}>
                            {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                          </div>
                          <Badge
                            variant={transaction.type === 'income' ? 'default' : 'destructive'}
                            className="text-xs"
                          >
                            {transaction.type === 'income' ? 'รายรับ' : 'รายจ่าย'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="chart" className="mt-4">
                <div className="text-center py-8">
                  <PieChart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <div className="text-muted-foreground">
                    การแสดงผลแบบกราฟจะพัฒนาในเวอร์ชันถัดไป
                  </div>
                  <div className="mt-4 space-y-2 max-w-sm mx-auto">
                    <div className="flex justify-between items-center p-2 bg-income-accent rounded">
                      <span className="text-sm">รายรับ</span>
                      <span className="font-semibold text-income">{formatCurrency(summary.income)}</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-expense-accent rounded">
                      <span className="text-sm">รายจ่าย</span>
                      <span className="font-semibold text-expense">{formatCurrency(summary.expense)}</span>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}