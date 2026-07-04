import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useInvestments } from '@/hooks/useInvestments';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, DollarSign, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function AddInvestmentTransaction() {
  const { investments, loading, createInvestmentTransaction } = useInvestments();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [form, setForm] = useState({
    investment_id: '',
    transaction_type: 'buy',
    quantity: '',
    price_per_unit: '',
    fee: '0',
    tax: '0',
    date: new Date().toISOString().split('T')[0],
    note: '',
  });

  const totalAmount = (Number(form.quantity) || 0) * (Number(form.price_per_unit) || 0);
  const totalWithFees = totalAmount + (Number(form.fee) || 0) + (Number(form.tax) || 0);

  const handleSubmit = async () => {
    const qty = Number(form.quantity);
    const price = Number(form.price_per_unit);
    if (!form.investment_id || !form.quantity || !form.price_per_unit) {
      toast({
        title: 'กรอกข้อมูลไม่ครบ',
        description: 'กรุณาเลือกสินทรัพย์และกรอกจำนวนกับราคาให้ครบ',
        variant: 'destructive',
      });
      return;
    }
    if (qty <= 0 || price <= 0 || qty > 999999999 || price > 999999999) {
      toast({
        title: 'ข้อมูลไม่ถูกต้อง',
        description: 'จำนวนและราคาต้องมากกว่า 0',
        variant: 'destructive',
      });
      return;
    }

    await createInvestmentTransaction({
      investment_id: form.investment_id,
      transaction_type: form.transaction_type,
      quantity: qty,
      price_per_unit: price,
      total_amount: totalAmount,
      fee: Math.max(0, Number(form.fee) || 0),
      tax: Math.max(0, Number(form.tax) || 0),
      date: form.date,
      note: form.note || null,
    });

    navigate('/investment');
  };

  if (loading) {
    return (
      <div className="pb-20 px-4 pt-6 flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="pb-20 px-4 pt-6">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/investment">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <DollarSign className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">บันทึกรายการลงทุน</h1>
      </div>

      <Card className="p-4 space-y-4">
        {/* Transaction type */}
        <div>
          <Label>ประเภทรายการ</Label>
          <div className="grid grid-cols-4 gap-2 mt-2">
            {[
              { value: 'buy', label: '🟢 ซื้อ' },
              { value: 'sell', label: '🔴 ขาย' },
              { value: 'dividend', label: '💰 ปันผล' },
              { value: 'interest', label: '🏦 ดอกเบี้ย' },
            ].map(t => (
              <Button
                key={t.value}
                variant={form.transaction_type === t.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setForm(f => ({ ...f, transaction_type: t.value }))}
              >
                {t.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Investment selector */}
        <div>
          <Label>สินทรัพย์ *</Label>
          <Select value={form.investment_id} onValueChange={v => setForm(f => ({ ...f, investment_id: v }))}>
            <SelectTrigger><SelectValue placeholder="เลือกสินทรัพย์" /></SelectTrigger>
            <SelectContent>
              {investments.map(inv => (
                <SelectItem key={inv.id} value={inv.id}>
                  {inv.name} {inv.symbol ? `(${inv.symbol})` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {investments.length === 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              ยังไม่มีสินทรัพย์ กรุณา<Link to="/investment" className="text-primary underline">เพิ่มสินทรัพย์</Link>ก่อน
            </p>
          )}
        </div>

        {/* Quantity & Price */}
        {(form.transaction_type === 'buy' || form.transaction_type === 'sell') && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>จำนวน (หน่วย) *</Label>
                <Input type="number" min="0" max="999999999" step="any" value={form.quantity} onChange={e => { const v = e.target.value; if (v === '' || Number(v) >= 0) setForm(f => ({ ...f, quantity: v })); }} placeholder="0" />
              </div>
              <div>
                <Label>ราคาต่อหน่วย *</Label>
                <Input type="number" min="0" max="999999999" step="0.01" value={form.price_per_unit} onChange={e => { const v = e.target.value; if (v === '' || Number(v) >= 0) setForm(f => ({ ...f, price_per_unit: v })); }} placeholder="0.00" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>ค่าธรรมเนียม</Label>
                <Input type="number" value={form.fee} onChange={e => setForm(f => ({ ...f, fee: e.target.value }))} />
              </div>
              <div>
                <Label>ภาษี</Label>
                <Input type="number" value={form.tax} onChange={e => setForm(f => ({ ...f, tax: e.target.value }))} />
              </div>
            </div>
          </>
        )}

        {/* Dividend/Interest amount */}
        {(form.transaction_type === 'dividend' || form.transaction_type === 'interest') && (
          <div>
            <Label>จำนวนเงิน *</Label>
            <Input 
              type="number" 
              value={form.price_per_unit} 
              onChange={e => setForm(f => ({ ...f, price_per_unit: e.target.value, quantity: '1' }))} 
              placeholder="0.00" 
            />
          </div>
        )}

        {/* Date */}
        <div>
          <Label>วันที่</Label>
          <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
        </div>

        {/* Note */}
        <div>
          <Label>หมายเหตุ</Label>
          <Textarea value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="บันทึกเพิ่มเติม..." />
        </div>

        {/* Total */}
        {(form.transaction_type === 'buy' || form.transaction_type === 'sell') && totalAmount > 0 && (
          <Card className="p-3 bg-muted/30">
            <div className="flex justify-between text-sm">
              <span>มูลค่ารวม</span>
              <span className="font-semibold">฿{totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
            </div>
            {(Number(form.fee) > 0 || Number(form.tax) > 0) && (
              <div className="flex justify-between text-sm mt-1">
                <span>รวมค่าธรรมเนียม+ภาษี</span>
                <span className="font-semibold">฿{totalWithFees.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
              </div>
            )}
          </Card>
        )}

        <Button className="w-full" onClick={handleSubmit} disabled={!form.investment_id || !form.quantity || !form.price_per_unit}>
          บันทึกรายการ
        </Button>
      </Card>
    </div>
  );
}
