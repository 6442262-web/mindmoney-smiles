import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ArrowLeft, Download, TrendingUp, TrendingDown, DollarSign, PieChart, Pencil, Save } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface ReportData {
  revenue: {
    sales: number;
    services: number;
    other: number;
  };
  expenses: {
    cogs: number;
    rent: number;
    utilities: number;
    marketing: number;
    salaries: number;
    other: number;
  };
  cashFlow: {
    operating: number;
    investing: number;
    financing: number;
  };
  balanceSheet: {
    assets: {
      current: number;
      fixed: number;
      intangible: number;
    };
    liabilities: {
      current: number;
      longTerm: number;
    };
    equity: number;
  };
}

const defaultData: ReportData = {
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
  },
  cashFlow: {
    operating: 45000,
    investing: -15000,
    financing: 25000
  },
  balanceSheet: {
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
  }
};

export function BusinessReports() {
  const [reportData, setReportData] = useState<ReportData>(defaultData);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<'revenue' | 'expenses' | 'cashFlow' | 'balanceSheet'>('revenue');
  const [editForm, setEditForm] = useState<any>({});
  const { toast } = useToast();

  const totalRevenue = Object.values(reportData.revenue).reduce((sum, val) => sum + val, 0);
  const totalExpenses = Object.values(reportData.expenses).reduce((sum, val) => sum + val, 0);
  const netIncome = totalRevenue - totalExpenses;

  const totalAssets = Object.values(reportData.balanceSheet.assets).reduce((sum, val) => sum + val, 0);
  const totalLiabilities = Object.values(reportData.balanceSheet.liabilities).reduce((sum, val) => sum + val, 0);

  const netCashFlow = Object.values(reportData.cashFlow).reduce((sum, val) => sum + val, 0);

  const handleExport = (format: 'pdf' | 'excel') => {
    console.log(`Exporting as ${format}`);
    toast({
      title: "กำลังส่งออก",
      description: `กำลังส่งออกรายงานเป็น ${format.toUpperCase()}`,
    });
  };

  const openEditDialog = (section: 'revenue' | 'expenses' | 'cashFlow' | 'balanceSheet') => {
    setEditingSection(section);
    if (section === 'revenue') {
      setEditForm({ ...reportData.revenue });
    } else if (section === 'expenses') {
      setEditForm({ ...reportData.expenses });
    } else if (section === 'cashFlow') {
      setEditForm({ ...reportData.cashFlow });
    } else if (section === 'balanceSheet') {
      setEditForm({
        assets: { ...reportData.balanceSheet.assets },
        liabilities: { ...reportData.balanceSheet.liabilities },
        equity: reportData.balanceSheet.equity
      });
    }
    setEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (editingSection === 'revenue') {
      setReportData(prev => ({ ...prev, revenue: editForm }));
    } else if (editingSection === 'expenses') {
      setReportData(prev => ({ ...prev, expenses: editForm }));
    } else if (editingSection === 'cashFlow') {
      setReportData(prev => ({ ...prev, cashFlow: editForm }));
    } else if (editingSection === 'balanceSheet') {
      setReportData(prev => ({ ...prev, balanceSheet: editForm }));
    }
    setEditDialogOpen(false);
    toast({
      title: "บันทึกสำเร็จ",
      description: "อัพเดทข้อมูลรายงานแล้ว",
    });
  };

  const getSectionTitle = () => {
    switch (editingSection) {
      case 'revenue': return 'แก้ไขรายได้';
      case 'expenses': return 'แก้ไขค่าใช้จ่าย';
      case 'cashFlow': return 'แก้ไขกระแสเงินสด';
      case 'balanceSheet': return 'แก้ไขงบดุล';
    }
  };

  const renderEditForm = () => {
    if (editingSection === 'revenue') {
      return (
        <div className="space-y-4">
          <div>
            <Label>รายได้จากการขาย</Label>
            <Input
              type="number"
              value={editForm.sales || 0}
              onChange={(e) => setEditForm({ ...editForm, sales: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <div>
            <Label>รายได้จากบริการ</Label>
            <Input
              type="number"
              value={editForm.services || 0}
              onChange={(e) => setEditForm({ ...editForm, services: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <div>
            <Label>รายได้อื่นๆ</Label>
            <Input
              type="number"
              value={editForm.other || 0}
              onChange={(e) => setEditForm({ ...editForm, other: parseFloat(e.target.value) || 0 })}
            />
          </div>
        </div>
      );
    }

    if (editingSection === 'expenses') {
      return (
        <div className="space-y-4">
          <div>
            <Label>ต้นทุนขาย</Label>
            <Input
              type="number"
              value={editForm.cogs || 0}
              onChange={(e) => setEditForm({ ...editForm, cogs: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <div>
            <Label>ค่าเช่า</Label>
            <Input
              type="number"
              value={editForm.rent || 0}
              onChange={(e) => setEditForm({ ...editForm, rent: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <div>
            <Label>ค่าไฟฟ้าน้ำ</Label>
            <Input
              type="number"
              value={editForm.utilities || 0}
              onChange={(e) => setEditForm({ ...editForm, utilities: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <div>
            <Label>ค่าโฆษณา</Label>
            <Input
              type="number"
              value={editForm.marketing || 0}
              onChange={(e) => setEditForm({ ...editForm, marketing: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <div>
            <Label>เงินเดือนพนักงาน</Label>
            <Input
              type="number"
              value={editForm.salaries || 0}
              onChange={(e) => setEditForm({ ...editForm, salaries: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <div>
            <Label>อื่นๆ</Label>
            <Input
              type="number"
              value={editForm.other || 0}
              onChange={(e) => setEditForm({ ...editForm, other: parseFloat(e.target.value) || 0 })}
            />
          </div>
        </div>
      );
    }

    if (editingSection === 'cashFlow') {
      return (
        <div className="space-y-4">
          <div>
            <Label>กระแสเงินสดจากการดำเนินงาน</Label>
            <Input
              type="number"
              value={editForm.operating || 0}
              onChange={(e) => setEditForm({ ...editForm, operating: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <div>
            <Label>กระแสเงินสดจากการลงทุน</Label>
            <Input
              type="number"
              value={editForm.investing || 0}
              onChange={(e) => setEditForm({ ...editForm, investing: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <div>
            <Label>กระแสเงินสดจากการจัดหาเงิน</Label>
            <Input
              type="number"
              value={editForm.financing || 0}
              onChange={(e) => setEditForm({ ...editForm, financing: parseFloat(e.target.value) || 0 })}
            />
          </div>
        </div>
      );
    }

    if (editingSection === 'balanceSheet') {
      return (
        <div className="space-y-4">
          <h4 className="font-medium text-blue-600">สินทรัพย์</h4>
          <div>
            <Label>สินทรัพย์หมุนเวียน</Label>
            <Input
              type="number"
              value={editForm.assets?.current || 0}
              onChange={(e) => setEditForm({ 
                ...editForm, 
                assets: { ...editForm.assets, current: parseFloat(e.target.value) || 0 } 
              })}
            />
          </div>
          <div>
            <Label>สินทรัพย์ถาวร</Label>
            <Input
              type="number"
              value={editForm.assets?.fixed || 0}
              onChange={(e) => setEditForm({ 
                ...editForm, 
                assets: { ...editForm.assets, fixed: parseFloat(e.target.value) || 0 } 
              })}
            />
          </div>
          <div>
            <Label>สินทรัพย์ไม่มีตัวตน</Label>
            <Input
              type="number"
              value={editForm.assets?.intangible || 0}
              onChange={(e) => setEditForm({ 
                ...editForm, 
                assets: { ...editForm.assets, intangible: parseFloat(e.target.value) || 0 } 
              })}
            />
          </div>
          
          <h4 className="font-medium text-red-600 pt-2">หนี้สิน</h4>
          <div>
            <Label>หนี้สินหมุนเวียน</Label>
            <Input
              type="number"
              value={editForm.liabilities?.current || 0}
              onChange={(e) => setEditForm({ 
                ...editForm, 
                liabilities: { ...editForm.liabilities, current: parseFloat(e.target.value) || 0 } 
              })}
            />
          </div>
          <div>
            <Label>หนี้สินระยะยาว</Label>
            <Input
              type="number"
              value={editForm.liabilities?.longTerm || 0}
              onChange={(e) => setEditForm({ 
                ...editForm, 
                liabilities: { ...editForm.liabilities, longTerm: parseFloat(e.target.value) || 0 } 
              })}
            />
          </div>
          
          <h4 className="font-medium text-green-600 pt-2">ส่วนของผู้ถือหุ้น</h4>
          <div>
            <Label>ทุนและกำไรสะสม</Label>
            <Input
              type="number"
              value={editForm.equity || 0}
              onChange={(e) => setEditForm({ ...editForm, equity: parseFloat(e.target.value) || 0 })}
            />
          </div>
        </div>
      );
    }
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
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-green-600">รายได้</h4>
                  <Button variant="ghost" size="sm" onClick={() => openEditDialog('revenue')}>
                    <Pencil className="h-4 w-4 mr-1" />
                    แก้ไข
                  </Button>
                </div>
                <div className="pl-4 space-y-1">
                  <div className="flex justify-between">
                    <span>รายได้จากการขาย</span>
                    <span>฿{reportData.revenue.sales.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>รายได้จากบริการ</span>
                    <span>฿{reportData.revenue.services.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>รายได้อื่นๆ</span>
                    <span>฿{reportData.revenue.other.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-medium border-t pt-1">
                    <span>รวมรายได้</span>
                    <span className="text-green-600">฿{totalRevenue.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Expenses Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-red-600">ค่าใช้จ่าย</h4>
                  <Button variant="ghost" size="sm" onClick={() => openEditDialog('expenses')}>
                    <Pencil className="h-4 w-4 mr-1" />
                    แก้ไข
                  </Button>
                </div>
                <div className="pl-4 space-y-1">
                  <div className="flex justify-between">
                    <span>ต้นทุนขาย</span>
                    <span>฿{reportData.expenses.cogs.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ค่าเช่า</span>
                    <span>฿{reportData.expenses.rent.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ค่าไฟฟ้าน้ำ</span>
                    <span>฿{reportData.expenses.utilities.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ค่าโฆษณา</span>
                    <span>฿{reportData.expenses.marketing.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>เงินเดือนพนักงาน</span>
                    <span>฿{reportData.expenses.salaries.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>อื่นๆ</span>
                    <span>฿{reportData.expenses.other.toLocaleString()}</span>
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
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">งบกระแสเงินสด</h3>
                <Button variant="ghost" size="sm" onClick={() => openEditDialog('cashFlow')}>
                  <Pencil className="h-4 w-4 mr-1" />
                  แก้ไข
                </Button>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>กระแสเงินสดจากการดำเนินงาน</span>
                  <span className={reportData.cashFlow.operating >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {reportData.cashFlow.operating >= 0 ? '+' : ''}฿{reportData.cashFlow.operating.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>กระแสเงินสดจากการลงทุน</span>
                  <span className={reportData.cashFlow.investing >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {reportData.cashFlow.investing >= 0 ? '+' : ''}฿{reportData.cashFlow.investing.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>กระแสเงินสดจากการจัดหาเงิน</span>
                  <span className={reportData.cashFlow.financing >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {reportData.cashFlow.financing >= 0 ? '+' : ''}฿{reportData.cashFlow.financing.toLocaleString()}
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
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">งบดุล</h3>
                <Button variant="ghost" size="sm" onClick={() => openEditDialog('balanceSheet')}>
                  <Pencil className="h-4 w-4 mr-1" />
                  แก้ไข
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Assets & Liabilities + Equity */}
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-blue-600 mb-2">สินทรัพย์</h4>
                    <div className="pl-4 space-y-1">
                      <div className="flex justify-between">
                        <span>สินทรัพย์หมุนเวียน</span>
                        <span>฿{reportData.balanceSheet.assets.current.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>สินทรัพย์ถาวร</span>
                        <span>฿{reportData.balanceSheet.assets.fixed.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>สินทรัพย์ไม่มีตัวตน</span>
                        <span>฿{reportData.balanceSheet.assets.intangible.toLocaleString()}</span>
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
                        <span>฿{reportData.balanceSheet.liabilities.current.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>หนี้สินระยะยาว</span>
                        <span>฿{reportData.balanceSheet.liabilities.longTerm.toLocaleString()}</span>
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
                        <span>฿{reportData.balanceSheet.equity.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between text-lg font-bold">
                  <span>รวมหนี้สินและส่วนของผู้ถือหุ้น</span>
                  <span>฿{(totalLiabilities + reportData.balanceSheet.equity).toLocaleString()}</span>
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

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{getSectionTitle()}</DialogTitle>
          </DialogHeader>
          {renderEditForm()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              ยกเลิก
            </Button>
            <Button onClick={handleSaveEdit}>
              <Save className="h-4 w-4 mr-2" />
              บันทึก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}