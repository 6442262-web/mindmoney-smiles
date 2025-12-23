import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ArrowUp, ArrowDown, TrendingUp, Store, User, BarChart3, PlusCircle, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { useAppMode } from "@/hooks/useAppMode";
import { useBusinessTransactions } from "@/hooks/useBusinessTransactions";
import { useLiabilities } from "@/hooks/useLiabilities";

export function BusinessDashboard() {
  const { mode, toggleMode } = useAppMode();
  const { transactions, loading } = useBusinessTransactions();
  const { liabilities } = useLiabilities();
  
  const today = new Date().toISOString().split('T')[0];
  const todaysTransactions = transactions.filter(t => t.date === today);
  
  const totalIncome = todaysTransactions
    .filter(t => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);
    
  const totalExpense = todaysTransactions
    .filter(t => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);
    
  const netProfit = totalIncome - totalExpense;
  
  const totalDebt = liabilities
    .filter(l => l.status === 'active')
    .reduce((sum, l) => sum + l.current_balance, 0);

  return (
    <div className="pb-20 px-4 pt-6">
      {/* Header with Mode Switch */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Store className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">บัญชีร้านค้า</h1>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4" />
            <span className={mode === "personal" ? "font-medium" : ""}>ส่วนตัว</span>
            <Switch
              checked={mode === "business"}
              onCheckedChange={toggleMode}
            />
            <Store className="h-4 w-4" />
            <span className={mode === "business" ? "font-medium" : ""}>ร้านค้า</span>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 text-green-600 rounded-lg">
              <ArrowUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">รายรับวันนี้</p>
              <p className="text-xl font-bold text-green-600">
                ฿{totalIncome.toLocaleString()}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 text-red-600 rounded-lg">
              <ArrowDown className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">รายจ่ายวันนี้</p>
              <p className="text-xl font-bold text-red-600">
                ฿{totalExpense.toLocaleString()}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${netProfit >= 0 ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'}`}>
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">กำไร/ขาดทุน</p>
              <p className={`text-xl font-bold ${netProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                {netProfit >= 0 ? '+' : ''}฿{netProfit.toLocaleString()}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Link to="/business/add-transaction">
          <Card className="p-4 hover:bg-accent transition-colors cursor-pointer">
            <div className="flex items-center gap-3">
              <PlusCircle className="h-6 w-6 text-primary" />
              <div>
                <h3 className="font-medium">เพิ่มรายการ</h3>
                <p className="text-sm text-muted-foreground">บันทึกรายรับ-รายจ่าย</p>
              </div>
            </div>
          </Card>
        </Link>

        <Link to="/business/reports">
          <Card className="p-4 hover:bg-accent transition-colors cursor-pointer">
            <div className="flex items-center gap-3">
              <BarChart3 className="h-6 w-6 text-primary" />
              <div>
                <h3 className="font-medium">รายงาน</h3>
                <p className="text-sm text-muted-foreground">สรุปและวิเคราะห์</p>
              </div>
            </div>
          </Card>
        </Link>
      </div>

      {/* Additional Business Features */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Link to="/business/liabilities">
          <Card className="p-4 hover:bg-accent transition-colors cursor-pointer">
            <div className="flex items-center gap-3">
              <FileText className="h-6 w-6 text-primary" />
              <div>
                <h3 className="font-medium">จัดการหนี้สิน</h3>
                <p className="text-sm text-muted-foreground">เจ้าหนี้และการจ่ายหนี้</p>
              </div>
            </div>
          </Card>
        </Link>

        <Card className="p-4 hover:bg-accent transition-colors cursor-pointer">
          <div className="flex items-center gap-3">
            <PlusCircle className="h-6 w-6 text-primary" />
            <div>
              <h3 className="font-medium">โอนเงิน</h3>
              <p className="text-sm text-muted-foreground">ระหว่างบัญชี</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card className="p-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">รายการล่าสุด</h3>
          <Link to="/business/transactions">
            <Button variant="ghost" size="sm">
              ดูทั้งหมด
            </Button>
          </Link>
        </div>

        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              ยังไม่มีรายการธุรกรรม
            </div>
          ) : (
            transactions.slice(0, 5).map((transaction) => (
            <div key={transaction.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  transaction.type === "income" 
                    ? "bg-green-100 text-green-600" 
                    : "bg-red-100 text-red-600"
                }`}>
                  {transaction.type === "income" ? 
                    <ArrowUp className="h-4 w-4" /> : 
                    <ArrowDown className="h-4 w-4" />
                  }
                </div>
                <div>
                  <p className="font-medium">{transaction.description}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {transaction.category}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(transaction.date).toLocaleDateString('th-TH')}
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className={`font-bold ${
                  transaction.type === "income" ? "text-green-600" : "text-red-600"
                }`}>
                  {transaction.type === "income" ? "+" : "-"}฿{transaction.amount.toLocaleString()}
                </p>
              </div>
            </div>
          ))
          )}
        </div>
      </Card>

      {/* Export Section */}
      <Card className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <FileText className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-medium">ส่งออกข้อมูล</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" size="sm">
            ส่งออก Excel
          </Button>
          <Button variant="outline" size="sm">
            ส่งออก PDF
          </Button>
        </div>
      </Card>
    </div>
  );
}