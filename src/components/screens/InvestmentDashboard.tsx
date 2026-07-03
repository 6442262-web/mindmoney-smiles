import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useInvestments, Investment } from '@/hooks/useInvestments';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, TrendingUp, TrendingDown, Plus, PieChart, 
  Wallet, DollarSign, BarChart3, Loader2, Trash2, Pencil, Search
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';

const ASSET_TYPES = [
  { value: 'stock_th', label: 'หุ้นไทย' },
  { value: 'stock_us', label: 'หุ้นต่างประเทศ' },
  { value: 'mutual_fund', label: 'กองทุนรวม' },
  { value: 'crypto', label: 'คริปโต' },
  { value: 'gold', label: 'ทองคำ' },
  { value: 'commodity', label: 'สินค้าโภคภัณฑ์' },
  { value: 'bond', label: 'พันธบัตร/ตราสารหนี้' },
  { value: 'other', label: 'อื่นๆ' },
];

interface YahooQuote {
  symbol: string;
  name: string;
  type: string;
  exchange: string;
}

function getAssetLabel(type: string) {
  return ASSET_TYPES.find(a => a.value === type)?.label || type;
}

function formatNumber(n: number) {
  return n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function InvestmentDashboard() {
  const {
    investments, loading, createInvestment, deleteInvestment, updateInvestment,
    totalInvested, totalCurrentValue, totalPnL, totalPnLPercent, totalDividends,
  } = useInvestments();

  const [showAdd, setShowAdd] = useState(false);
  const [editingInv, setEditingInv] = useState<Investment | null>(null);
  const [form, setForm] = useState({
    name: '', symbol: '', asset_type: 'stock_th', currency: 'THB', note: '',
    current_price: '', quantity: '', buy_price: '',
  });
  const [searchResults, setSearchResults] = useState<YahooQuote[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);

  // Fetch THB/USD exchange rate on mount
  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke('yahoo-finance', {
          body: { action: 'quote', symbol: 'THBUSD=X' },
        });
        if (!error && data?.price) {
          setExchangeRate(data.price);
        }
      } catch (e) {
        console.error('Exchange rate fetch error:', e);
      }
    })();
  }, []);

  const resetForm = () => {
    setForm({ name: '', symbol: '', asset_type: 'stock_th', currency: 'THB', note: '', current_price: '', quantity: '', buy_price: '' });
    setSearchResults([]);
    setShowResults(false);
  };

  // Search Yahoo Finance when symbol changes
  const handleSymbolChange = (value: string) => {
    setForm(f => ({ ...f, symbol: value }));
    
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    
    if (value.length < 1) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setSearching(true);
    searchTimeout.current = setTimeout(async () => {
      try {
        const { data, error } = await supabase.functions.invoke('yahoo-finance', {
          body: { action: 'search', symbol: value },
        });
        if (!error && data?.quotes) {
          setSearchResults(data.quotes);
          setShowResults(true);
        }
      } catch (e) {
        console.error('Symbol search error:', e);
      } finally {
        setSearching(false);
      }
    }, 400);
  };

  const selectSymbol = async (quote: YahooQuote) => {
    setForm(f => ({ ...f, symbol: quote.symbol, name: quote.name }));
    setShowResults(false);

    // Fetch current price
    try {
      const { data, error } = await supabase.functions.invoke('yahoo-finance', {
        body: { action: 'quote', symbol: quote.symbol },
      });
      if (!error && data?.price) {
        setForm(f => ({ 
          ...f, 
          current_price: String(data.price),
          currency: data.currency || f.currency,
        }));
      }
    } catch (e) {
      console.error('Quote fetch error:', e);
    }
  };

  const handleAdd = async () => {
    const assetName = form.name || form.symbol;
    if (!assetName) return;
    const qty = Number(form.quantity) || 0;
    const buyPrice = Number(form.buy_price) || 0;
    await createInvestment({
      name: assetName,
      symbol: form.symbol || null,
      asset_type: form.asset_type,
      quantity: qty,
      avg_cost: buyPrice,
      current_price: Number(form.current_price) || buyPrice,
      currency: form.currency,
      note: form.note || null,
      is_active: true,
    });
    // If quantity & buy_price provided, also create a buy transaction
    if (qty > 0 && buyPrice > 0) {
      // We need to get the newly created investment id — refetch will update state
      // The createInvestment already handles this, but we also want a transaction record
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        let lookup = supabase
          .from('investments')
          .select('id')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false })
          .limit(1);
        lookup = form.symbol
          ? lookup.eq('symbol', form.symbol)
          : lookup.is('symbol', null).eq('name', assetName);
        const { data: newInvList, error: lookupError } = await lookup;
        if (lookupError) {
          console.error('Error looking up new investment:', lookupError);
        }
        const newInv = newInvList?.[0];
        if (newInv) {
          await supabase.from('investment_transactions').insert({
            user_id: session.user.id,
            investment_id: newInv.id,
            transaction_type: 'buy',
            quantity: qty,
            price_per_unit: buyPrice,
            total_amount: qty * buyPrice,
            fee: 0,
            tax: 0,
            date: new Date().toISOString().split('T')[0],
          });
        }
      }
    }
    resetForm();
    setShowAdd(false);
  };

  const handleUpdatePrice = async () => {
    if (!editingInv) return;
    await updateInvestment(editingInv.id, { current_price: Number(form.current_price) || 0 });
    setEditingInv(null);
    resetForm();
  };

  // Group by asset type
  const grouped = investments.reduce((acc, inv) => {
    const key = inv.asset_type;
    if (!acc[key]) acc[key] = [];
    acc[key].push(inv);
    return acc;
  }, {} as Record<string, Investment[]>);

  if (loading) {
    return (
      <div className="pb-20 px-4 pt-6 flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="pb-20 px-4 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link to="/settings">
            <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <TrendingUp className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">พอร์ตการลงทุน</h1>
        </div>
        {exchangeRate && (
          <div className="text-xs text-muted-foreground text-right">
            <span className="font-medium">USD/THB</span>{' '}
            <span className="text-foreground font-semibold">{(1 / exchangeRate).toFixed(2)}</span>
            <br />
            <span className="font-medium">THB/USD</span>{' '}
            <span className="text-foreground font-semibold">{exchangeRate.toFixed(6)}</span>
          </div>
        )}
      </div>
      <div className="flex justify-end gap-2 mb-4">
          <Link to="/investment/add-transaction">
            <Button size="sm" variant="outline">
              <DollarSign className="h-4 w-4 mr-1" /> ซื้อ/ขาย
            </Button>
          </Link>
          <Dialog open={showAdd} onOpenChange={setShowAdd}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> เพิ่มสินทรัพย์</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>เพิ่มสินทรัพย์ใหม่</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="relative">
                  <Label>สัญลักษณ์ (Symbol) *</Label>
                  <div className="relative">
                    <Input 
                      value={form.symbol} 
                      onChange={e => handleSymbolChange(e.target.value)} 
                      placeholder="พิมพ์ตัวย่อ เช่น PTT, AAPL, BTC-USD"
                      autoComplete="off"
                    />
                    {searching && <Loader2 className="h-4 w-4 animate-spin absolute right-3 top-3 text-muted-foreground" />}
                  </div>
                  {showResults && searchResults.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
                      {searchResults.map((q) => (
                        <button
                          key={q.symbol}
                          className="w-full text-left px-3 py-2 hover:bg-accent text-sm flex justify-between items-center"
                          onClick={() => selectSymbol(q)}
                        >
                          <div>
                            <span className="font-semibold">{q.symbol}</span>
                            <span className="text-muted-foreground ml-2 text-xs">{q.name}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">{q.exchange}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <Label>ชื่อสินทรัพย์</Label>
                  <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="ชื่อจะกรอกอัตโนมัติ" />
                  <Select value={form.asset_type} onValueChange={v => setForm(f => ({ ...f, asset_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ASSET_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>สกุลเงิน</Label>
                  <Select value={form.currency} onValueChange={v => setForm(f => ({ ...f, currency: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['THB','USD','EUR','GBP','JPY','CNY','HKD','SGD','KRW','AUD','BTC'].map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">เปลี่ยนอัตโนมัติเมื่อเลือก Symbol</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>จำนวน (หน่วย)</Label>
                    <Input type="number" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} placeholder="0" />
                  </div>
                  <div>
                    <Label>ราคาซื้อต่อหน่วย</Label>
                    <Input type="number" value={form.buy_price} onChange={e => setForm(f => ({ ...f, buy_price: e.target.value }))} placeholder="0.00" />
                  </div>
                </div>
                {Number(form.quantity) > 0 && Number(form.buy_price) > 0 && (
                  <p className="text-xs text-muted-foreground">
                    มูลค่ารวม: ฿{(Number(form.quantity) * Number(form.buy_price)).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </p>
                )}
                <div>
                  <Label>ราคาปัจจุบัน</Label>
                  <Input type="number" value={form.current_price} onChange={e => setForm(f => ({ ...f, current_price: e.target.value }))} placeholder="ดึงอัตโนมัติจาก Yahoo Finance" />
                </div>
                <div>
                  <Label>หมายเหตุ</Label>
                  <Input value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
                </div>
                <Button className="w-full" onClick={handleAdd} disabled={!form.symbol && !form.name}>เพิ่มสินทรัพย์</Button>
              </div>
            </DialogContent>
          </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Wallet className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">มูลค่าพอร์ต</span>
          </div>
          <p className="text-lg font-bold">฿{formatNumber(totalCurrentValue)}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            {totalPnL >= 0 ? <TrendingUp className="h-4 w-4 text-green-500" /> : <TrendingDown className="h-4 w-4 text-red-500" />}
            <span className="text-xs text-muted-foreground">กำไร/ขาดทุน</span>
          </div>
          <p className={`text-lg font-bold ${totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {totalPnL >= 0 ? '+' : ''}{formatNumber(totalPnL)}
          </p>
          <p className={`text-xs ${totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {totalPnL >= 0 ? '+' : ''}{totalPnLPercent.toFixed(2)}%
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">ต้นทุนรวม</span>
          </div>
          <p className="text-lg font-bold">฿{formatNumber(totalInvested)}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">เงินปันผลรวม</span>
          </div>
          <p className="text-lg font-bold text-green-600">฿{formatNumber(totalDividends)}</p>
        </Card>
      </div>

      {/* Quick links */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        <Link to="/investment/transactions">
          <Button variant="outline" size="sm">📋 ประวัติรายการ</Button>
        </Link>
      </div>

      <Separator className="mb-6" />

      {/* Holdings by asset type */}
      {investments.length === 0 ? (
        <Card className="p-8 text-center">
          <PieChart className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground">ยังไม่มีสินทรัพย์</p>
          <p className="text-xs text-muted-foreground mt-1">กดปุ่ม "เพิ่มสินทรัพย์" เพื่อเริ่มต้น</p>
        </Card>
      ) : (
        Object.entries(grouped).map(([type, items]) => (
          <div key={type} className="mb-6">
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">{getAssetLabel(type)}</h3>
            <div className="space-y-2">
              {items.map(inv => {
                const value = ((inv.current_price || inv.avg_cost) || 0) * (inv.quantity || 0);
                const cost = (inv.avg_cost || 0) * (inv.quantity || 0);
                const pnl = value - cost;
                const pnlPct = cost > 0 ? (pnl / cost) * 100 : 0;

                return (
                  <Card key={inv.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{inv.name}</span>
                          {inv.symbol && <Badge variant="secondary" className="text-xs">{inv.symbol}</Badge>}
                        </div>
                        <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                          <span>จำนวน: {inv.quantity}</span>
                          <span>ต้นทุน: ฿{formatNumber(inv.avg_cost)}</span>
                          <span>ราคา: ฿{formatNumber(inv.current_price || 0)}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">฿{formatNumber(value)}</p>
                        <p className={`text-xs ${pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {pnl >= 0 ? '+' : ''}{formatNumber(pnl)} ({pnlPct.toFixed(2)}%)
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-2 justify-end">
                      <Button size="sm" variant="ghost" onClick={() => {
                        setEditingInv(inv);
                        setForm(f => ({ ...f, current_price: String(inv.current_price || 0) }));
                      }}>
                        <Pencil className="h-3 w-3 mr-1" /> อัปเดตราคา
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost" className="text-destructive">
                            <Trash2 className="h-3 w-3 mr-1" /> ลบ
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>ลบสินทรัพย์?</AlertDialogTitle>
                            <AlertDialogDescription>การลบจะลบรายการซื้อ-ขายทั้งหมดที่เกี่ยวข้องด้วย</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteInvestment(inv.id)}>ลบ</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        ))
      )}

      {/* Update price dialog */}
      <Dialog open={!!editingInv} onOpenChange={(open) => { if (!open) setEditingInv(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>อัปเดตราคาปัจจุบัน - {editingInv?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>ราคาปัจจุบัน</Label>
              <Input type="number" value={form.current_price} onChange={e => setForm(f => ({ ...f, current_price: e.target.value }))} />
            </div>
            <Button className="w-full" onClick={handleUpdatePrice}>บันทึก</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
