import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useInvestments } from '@/hooks/useInvestments';
import { Link } from 'react-router-dom';
import { ArrowLeft, List, Loader2, Trash2 } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from '@/components/ui/alert-dialog';

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  buy: { label: 'ซื้อ', color: 'bg-green-100 text-green-800' },
  sell: { label: 'ขาย', color: 'bg-red-100 text-red-800' },
  dividend: { label: 'ปันผล', color: 'bg-blue-100 text-blue-800' },
  interest: { label: 'ดอกเบี้ย', color: 'bg-purple-100 text-purple-800' },
};

export function InvestmentTransactions() {
  const { investments, transactions, loading, deleteInvestmentTransaction } = useInvestments();

  const getInvestmentName = (id: string | null) => {
    if (!id) return 'ไม่ระบุ';
    return investments.find(i => i.id === id)?.name || 'ไม่พบ';
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
        <List className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">ประวัติรายการลงทุน</h1>
      </div>

      {transactions.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">ยังไม่มีรายการ</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {transactions.map(txn => {
            const typeInfo = TYPE_LABELS[txn.transaction_type] || { label: txn.transaction_type, color: '' };
            return (
              <Card key={txn.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge className={typeInfo.color}>{typeInfo.label}</Badge>
                      <span className="font-medium text-sm">{getInvestmentName(txn.investment_id)}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 space-x-3">
                      <span>{txn.date}</span>
                      {txn.quantity > 0 && txn.transaction_type !== 'dividend' && txn.transaction_type !== 'interest' && (
                        <span>{txn.quantity} หน่วย @ ฿{txn.price_per_unit.toLocaleString()}</span>
                      )}
                      {txn.fee > 0 && <span>ค่าธรรมเนียม: ฿{txn.fee}</span>}
                    </div>
                    {txn.note && <p className="text-xs text-muted-foreground mt-1">{txn.note}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold ${txn.transaction_type === 'sell' ? 'text-red-600' : 'text-green-600'}`}>
                      {txn.transaction_type === 'sell' ? '-' : '+'}฿{txn.total_amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </span>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="ghost"><Trash2 className="h-3 w-3 text-destructive" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>ลบรายการ?</AlertDialogTitle>
                          <AlertDialogDescription>จำนวนหน่วยในพอร์ตจะไม่ถูกปรับอัตโนมัติ</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteInvestmentTransaction(txn.id)}>ลบ</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
