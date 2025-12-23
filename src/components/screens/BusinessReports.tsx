import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Download, TrendingUp, TrendingDown, DollarSign, PieChart } from "lucide-react";
import { Link } from "react-router-dom";

// Sample data for demonstration
const profitLossData = {
  revenue: {
    sales: 150000,
    services: 45000,
    other: 8000
  },
  expenses: {
    cogs: 80000,
    rent: 15000,
    utilities: 5000,
    marketing: 12000,
    salaries: 35000,
    other: 8000
  }
};

const cashFlowData = {
  operating: 45000,
  investing: -15000,
  financing: 25000
};

const balanceSheetData = {
  assets: {
    current: 120000,
    fixed: 280000,
    intangible: 15000
  },
  liabilities: {
    current: 45000,
    longTerm: 150000
  },
  equity: 220000
};

export function BusinessReports() {
  const totalRevenue = Object.values(profitLossData.revenue).reduce((sum, val) => sum + val, 0);
  const totalExpenses = Object.values(profitLossData.expenses).reduce((sum, val) => sum + val, 0);
  const netIncome = totalRevenue - totalExpenses;

  const totalAssets = Object.values(balanceSheetData.assets).reduce((sum, val) => sum + val, 0);
  const totalLiabilities = Object.values(balanceSheetData.liabilities).reduce((sum, val) => sum + val, 0);

  const netCashFlow = Object.values(cashFlowData).reduce((sum, val) => sum + val, 0);

  const handleExport = (format: 'pdf' | 'excel') => {
    console.log(`Exporting as ${format}`);
    // Implement export functionality
  };

  return (
    <div className="pb-20 px-4 pt-6">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/business">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">รายงานทางการเงิน</h1>
        <div className="ml-auto flex gap-2">
          <Select defaultValue="current-month">
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current-month">เดือนนี้</SelectItem>
              <SelectItem value="current-quarter">ไตรมาสนี้</SelectItem>
              <SelectItem value="current-year">ปีนี้</SelectItem>
              <SelectItem value="custom">กำหนดเอง</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => handleExport('excel')}>
            <Download className="h-4 w-4 mr-2" />
            Excel
          </Button>
          <Button variant="outline" onClick={() => handleExport('pdf')}>
            <Download className="h-4 w-4 mr-2" />
            PDF
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 text-green-600 rounded-lg">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">รายได้รวม</p>
              <p className="text-lg font-bold text-green-600">
                ฿{totalRevenue.toLocaleString()}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 text-red-600 rounded-lg">
              <TrendingDown className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">ค่าใช้จ่ายรวม</p>
              <p className="text-lg font-bold text-red-600">
                ฿{totalExpenses.toLocaleString()}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${netIncome >= 0 ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'}`}>
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">กำไร/ขาดทุน</p>
              <p className={`text-lg font-bold ${netIncome >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                {netIncome >= 0 ? '+' : ''}฿{netIncome.toLocaleString()}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
              <PieChart className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">กระแสเงินสุทธิ</p>
              <p className={`text-lg font-bold ${netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {netCashFlow >= 0 ? '+' : ''}฿{netCashFlow.toLocaleString()}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Reports */}
      <Card className="p-4">
        <Tabs defaultValue="profit-loss">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profit-loss">งบกำไรขาดทุน</TabsTrigger>
            <TabsTrigger value="cash-flow">กระแสเงินสด</TabsTrigger>
            <TabsTrigger value="balance-sheet">งบดุล</TabsTrigger>
            <TabsTrigger value="project-reports">รายงานโปรเจกต์</TabsTrigger>
          </TabsList>
          
          {/* Profit & Loss Statement */}
          <TabsContent value="profit-loss" className="mt-4">
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">งบกำไรขาดทุน</h3>
              
              {/* Revenue Section */}
              <div className="space-y-2">
                <h4 className="font-medium text-green-600">รายได้</h4>
                <div className="pl-4 space-y-1">
                  <div className="flex justify-between">
                    <span>รายได้จากการขาย</span>
                    <span>฿{profitLossData.revenue.sales.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>รายได้จากบริการ</span>
                    <span>฿{profitLossData.revenue.services.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>รายได้อื่นๆ</span>
                    <span>฿{profitLossData.revenue.other.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-medium border-t pt-1">
                    <span>รวมรายได้</span>
                    <span className="text-green-600">฿{totalRevenue.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Expenses Section */}
              <div className="space-y-2">
                <h4 className="font-medium text-red-600">ค่าใช้จ่าย</h4>
                <div className="pl-4 space-y-1">
                  <div className="flex justify-between">
                    <span>ต้นทุนขาย</span>
                    <span>฿{profitLossData.expenses.cogs.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ค่าเช่า</span>
                    <span>฿{profitLossData.expenses.rent.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ค่าไฟฟ้าน้ำ</span>
                    <span>฿{profitLossData.expenses.utilities.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ค่าโฆษณา</span>
                    <span>฿{profitLossData.expenses.marketing.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>เงินเดือนพนักงาน</span>
                    <span>฿{profitLossData.expenses.salaries.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>อื่นๆ</span>
                    <span>฿{profitLossData.expenses.other.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-medium border-t pt-1">
                    <span>รวมค่าใช้จ่าย</span>
                    <span className="text-red-600">฿{totalExpenses.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Net Income */}
              <div className="border-t pt-4">
                <div className="flex justify-between text-lg font-bold">
                  <span>กำไร/ขาดทุนสุทธิ</span>
                  <span className={netIncome >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {netIncome >= 0 ? '+' : ''}฿{netIncome.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Cash Flow Statement */}
          <TabsContent value="cash-flow" className="mt-4">
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">งบกระแสเงินสด</h3>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>กระแสเงินสดจากการดำเนินงาน</span>
                  <span className={cashFlowData.operating >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {cashFlowData.operating >= 0 ? '+' : ''}฿{cashFlowData.operating.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>กระแสเงินสดจากการลงทุน</span>
                  <span className={cashFlowData.investing >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {cashFlowData.investing >= 0 ? '+' : ''}฿{cashFlowData.investing.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>กระแสเงินสดจากการจัดหาเงิน</span>
                  <span className={cashFlowData.financing >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {cashFlowData.financing >= 0 ? '+' : ''}฿{cashFlowData.financing.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>กระแสเงินสดสุทธิ</span>
                  <span className={netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {netCashFlow >= 0 ? '+' : ''}฿{netCashFlow.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Balance Sheet */}
          <TabsContent value="balance-sheet" className="mt-4">
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">งบดุล</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Assets & Liabilities + Equity */}
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-blue-600 mb-2">สินทรัพย์</h4>
                    <div className="pl-4 space-y-1">
                      <div className="flex justify-between">
                        <span>สินทรัพย์หมุนเวียน</span>
                        <span>฿{balanceSheetData.assets.current.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>สินทรัพย์ถาวร</span>
                        <span>฿{balanceSheetData.assets.fixed.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>สินทรัพย์ไม่มีตัวตน</span>
                        <span>฿{balanceSheetData.assets.intangible.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between font-medium border-t pt-1">
                        <span>รวมสินทรัพย์</span>
                        <span>฿{totalAssets.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-red-600 mb-2">หนี้สิน</h4>
                    <div className="pl-4 space-y-1">
                      <div className="flex justify-between">
                        <span>หนี้สินหมุนเวียน</span>
                        <span>฿{balanceSheetData.liabilities.current.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>หนี้สินระยะยาว</span>
                        <span>฿{balanceSheetData.liabilities.longTerm.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between font-medium border-t pt-1">
                        <span>รวมหนี้สิน</span>
                        <span>฿{totalLiabilities.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-green-600 mb-2">ส่วนของผู้ถือหุ้น</h4>
                    <div className="pl-4 space-y-1">
                      <div className="flex justify-between">
                        <span>ทุนและกำไรสะสม</span>
                        <span>฿{balanceSheetData.equity.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between text-lg font-bold">
                  <span>รวมหนี้สินและส่วนของผู้ถือหุ้น</span>
                  <span>฿{(totalLiabilities + balanceSheetData.equity).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Project Reports */}
          <TabsContent value="project-reports" className="mt-4">
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">รายงานตามโปรเจกต์</h3>
              <div className="text-center py-8 text-muted-foreground">
                รายงานโปรเจกต์จะแสดงที่นี่เมื่อมีข้อมูลโปรเจกต์
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}