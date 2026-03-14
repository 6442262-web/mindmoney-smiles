import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Plus, CreditCard, Building2, TrendingDown, Calendar, Percent, Trash2, Edit } from "lucide-react";
import { Link } from "react-router-dom";
import { useLiabilities, Liability } from "@/hooks/useLiabilities";
import { format } from "date-fns";
import { getLocalDateString } from "@/lib/dateUtils";
import { Textarea } from "@/components/ui/textarea";
import { sanitizeText, getAmountError } from "@/lib/validation";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

const liabilityTypeLabels: Record<string, string> = {
  loan: "เงินกู้",
  credit_card: "บัตรเครดิต",
  mortgage: "สินเชื่อบ้าน",
  car_loan: "สินเชื่อรถยนต์",
  personal_loan: "สินเชื่อส่วนบุคคล",
  other: "อื่นๆ"
};

export function LiabilitiesManagement() {
  const { liabilities, loading, createLiability, updateLiability, deleteLiability } = useLiabilities();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLiability, setEditingLiability] = useState<Liability | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'loan',
    creditor: '',
    principal_amount: '',
    current_balance: '',
    interest_rate: '',
    monthly_payment: '',
     start_date: getLocalDateString(),
    end_date: '',
    note: '',
    is_active: true,
  });

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'loan',
      creditor: '',
      principal_amount: '',
      current_balance: '',
      interest_rate: '',
      monthly_payment: '',
      start_date: getLocalDateString(),
      end_date: '',
      note: '',
      is_active: true,
    });
    setEditingLiability(null);
  };

  const openEditDialog = (liability: Liability) => {
    setEditingLiability(liability);
    setFormData({
      name: liability.name,
      type: liability.type || 'loan',
      creditor: liability.creditor || '',
      principal_amount: liability.principal_amount.toString(),
      current_balance: liability.current_balance.toString(),
      interest_rate: liability.interest_rate?.toString() || '',
      monthly_payment: liability.monthly_payment?.toString() || '',
      start_date: liability.start_date || getLocalDateString(),
      end_date: liability.end_date || '',
      note: liability.note || '',
      is_active: liability.is_active ?? true,
    });
    setIsDialogOpen(true);
  };

  // Calculate totals
  const activeLiabilities = liabilities.filter(l => l.is_active !== false);
  const totalDebt = activeLiabilities.reduce((sum, l) => sum + l.current_balance, 0);
  const totalMonthlyPayment = activeLiabilities.reduce((sum, l) => sum + (l.monthly_payment || 0), 0);
  const totalPrincipal = activeLiabilities.reduce((sum, l) => sum + l.principal_amount, 0);
  const paidOff = totalPrincipal > 0 ? ((totalPrincipal - totalDebt) / totalPrincipal) * 100 : 0;

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.principal_amount || !formData.current_balance) {
      return;
    }

    const principalErr = getAmountError(formData.principal_amount, 'จำนวนเงินต้น');
    const balanceErr = getAmountError(formData.current_balance, 'ยอดคงเหลือ');
    if (principalErr || balanceErr) return;

    const liabilityData = {
      name: sanitizeText(formData.name),
      type: formData.type,
      creditor: formData.creditor ? sanitizeText(formData.creditor) : null,
      principal_amount: parseFloat(formData.principal_amount),
      current_balance: parseFloat(formData.current_balance),
      interest_rate: formData.interest_rate ? parseFloat(formData.interest_rate) : null,
      monthly_payment: formData.monthly_payment ? parseFloat(formData.monthly_payment) : null,
      start_date: formData.start_date || null,
      end_date: formData.end_date || null,
      note: formData.note ? sanitizeText(formData.note) : null,
      is_active: formData.is_active,
    };

    if (editingLiability) {
      await updateLiability(editingLiability.id, liabilityData);
    } else {
      await createLiability(liabilityData);
    }

    setIsDialogOpen(false);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    await deleteLiability(id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="pb-20 px-4 pt-6">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/business">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">จัดการหนี้สิน</h1>
        <div className="ml-auto">
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                เพิ่มหนี้สิน
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingLiability ? 'แก้ไขหนี้สิน' : 'เพิ่มหนี้สินใหม่'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>ชื่อหนี้สิน *</Label>
                  <Input 
                    placeholder="เช่น สินเชื่อรถยนต์"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label>ประเภท</Label>
                  <Select value={formData.type} onValueChange={(value) => setFormData({...formData, type: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="เลือกประเภท" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(liabilityTypeLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>เจ้าหนี้/สถาบันการเงิน</Label>
                  <Input 
                    placeholder="ชื่อเจ้าหนี้"
                    value={formData.creditor}
                    onChange={(e) => setFormData({...formData, creditor: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>จำนวนเงินต้น (บาท) *</Label>
                    <Input 
                      type="number"
                      placeholder="0"
                      min="0"
                      max="999999999"
                      value={formData.principal_amount}
                      onChange={(e) => { const v = e.target.value; if (v === '' || Number(v) >= 0) setFormData({...formData, principal_amount: v}); }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>ยอดคงเหลือ (บาท) *</Label>
                    <Input 
                      type="number"
                      placeholder="0"
                      min="0"
                      max="999999999"
                      value={formData.current_balance}
                      onChange={(e) => { const v = e.target.value; if (v === '' || Number(v) >= 0) setFormData({...formData, current_balance: v}); }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>อัตราดอกเบี้ย (% ต่อปี)</Label>
                    <Input 
                      type="number"
                      step="0.01"
                      placeholder="0"
                      value={formData.interest_rate}
                      onChange={(e) => setFormData({...formData, interest_rate: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>ยอดชำระต่อเดือน (บาท)</Label>
                    <Input 
                      type="number"
                      placeholder="0"
                      min="0"
                      max="999999999"
                      value={formData.monthly_payment}
                      onChange={(e) => { const v = e.target.value; if (v === '' || Number(v) >= 0) setFormData({...formData, monthly_payment: v}); }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>วันที่เริ่มต้น</Label>
                    <Input 
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>วันครบกำหนด</Label>
                    <Input 
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>หมายเหตุ</Label>
                  <Textarea 
                    placeholder="รายละเอียดเพิ่มเติม"
                    value={formData.note}
                    onChange={(e) => setFormData({...formData, note: e.target.value})}
                  />
                </div>

                <Button className="w-full" onClick={handleSubmit}>
                  {editingLiability ? 'บันทึกการแก้ไข' : 'บันทึก'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 text-red-600 rounded-lg dark:bg-red-950 dark:text-red-400">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">หนี้สินรวม</p>
              <p className="text-xl font-bold text-red-600 dark:text-red-400">
                ฿{totalDebt.toLocaleString()}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 text-orange-600 rounded-lg dark:bg-orange-950 dark:text-orange-400">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">จ่ายต่อเดือน</p>
              <p className="text-xl font-bold text-orange-600 dark:text-orange-400">
                ฿{totalMonthlyPayment.toLocaleString()}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg dark:bg-blue-950 dark:text-blue-400">
              <Percent className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">จำนวนหนี้สิน</p>
              <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                {activeLiabilities.length} รายการ
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 text-green-600 rounded-lg dark:bg-green-950 dark:text-green-400">
              <TrendingDown className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">ชำระแล้ว</p>
              <p className="text-xl font-bold text-green-600 dark:text-green-400">
                {paidOff.toFixed(1)}%
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Liabilities List */}
      <Card className="p-4 mb-6">
        <Tabs defaultValue="active">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="active">กำลังใช้งาน</TabsTrigger>
            <TabsTrigger value="inactive">ปิดแล้ว</TabsTrigger>
          </TabsList>
          
          <TabsContent value="active" className="mt-4">
            <div className="space-y-3">
              {activeLiabilities.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  ไม่มีหนี้สินที่ใช้งาน
                </div>
              ) : (
                activeLiabilities.map((liability) => {
                  const progressPercent = liability.principal_amount > 0 
                    ? ((liability.principal_amount - liability.current_balance) / liability.principal_amount) * 100 
                    : 0;
                  
                  return (
                    <div key={liability.id} className="p-4 border rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="p-2 bg-blue-100 text-blue-600 rounded-lg dark:bg-blue-950 dark:text-blue-400">
                            {liability.type === 'credit_card' ? 
                              <CreditCard className="h-4 w-4" /> : 
                              <Building2 className="h-4 w-4" />
                            }
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{liability.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="secondary" className="text-xs">
                                {liabilityTypeLabels[liability.type || 'other'] || liability.type}
                              </Badge>
                              {liability.creditor && (
                                <span className="text-xs text-muted-foreground">
                                  {liability.creditor}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <div className="text-right mr-2">
                            <p className="font-bold text-red-600 dark:text-red-400">
                              ฿{liability.current_balance.toLocaleString()}
                            </p>
                            {liability.monthly_payment && (
                              <p className="text-sm text-muted-foreground">
                                ฿{liability.monthly_payment.toLocaleString()}/เดือน
                              </p>
                            )}
                          </div>
                          
                          <Button variant="ghost" size="icon" onClick={() => openEditDialog(liability)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>ยืนยันการลบ</AlertDialogTitle>
                                <AlertDialogDescription>
                                  คุณต้องการลบหนี้สิน "{liability.name}" ใช่หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(liability.id)}>
                                  ลบ
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="space-y-2 pt-2 border-t">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">ความคืบหน้าการชำระ</span>
                          <span className="font-medium">{progressPercent.toFixed(1)}%</span>
                        </div>
                        <Progress value={progressPercent} className="h-2" />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>เงินต้น: ฿{liability.principal_amount.toLocaleString()}</span>
                          <span>คงเหลือ: ฿{liability.current_balance.toLocaleString()}</span>
                        </div>
                      </div>

                      {/* Additional info */}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground pt-2 border-t">
                        {liability.interest_rate && (
                          <span>ดอกเบี้ย: {liability.interest_rate}%</span>
                        )}
                        {liability.end_date && (
                          <span>ครบกำหนด: {format(new Date(liability.end_date), 'dd/MM/yyyy')}</span>
                        )}
                      </div>

                      {liability.note && (
                        <p className="text-sm text-muted-foreground pt-2 border-t">
                          {liability.note}
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </TabsContent>

          <TabsContent value="inactive" className="mt-4">
            <div className="space-y-3">
              {liabilities.filter(l => l.is_active === false).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  ไม่มีหนี้สินที่ปิดแล้ว
                </div>
              ) : (
                liabilities.filter(l => l.is_active === false).map((liability) => (
                  <div key={liability.id} className="p-4 border rounded-lg opacity-60">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gray-100 text-gray-600 rounded-lg dark:bg-gray-800 dark:text-gray-400">
                          <Building2 className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium">{liability.name}</p>
                          <Badge variant="outline" className="text-xs">ปิดแล้ว</Badge>
                        </div>
                      </div>
                      <p className="font-medium">฿{liability.principal_amount.toLocaleString()}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </Card>

      {/* Payment Schedule */}
      {activeLiabilities.length > 0 && (
        <Card className="p-4">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <TrendingDown className="h-5 w-5" />
            ตารางการจ่ายหนี้
          </h3>
          <div className="space-y-3">
            {activeLiabilities.map((liability) => (
              <div key={liability.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div>
                  <p className="font-medium">{liability.name}</p>
                  {liability.creditor && (
                    <p className="text-sm text-muted-foreground">{liability.creditor}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-bold">
                    {liability.monthly_payment ? `฿${liability.monthly_payment.toLocaleString()}/เดือน` : '-'}
                  </p>
                  {liability.end_date && (
                    <p className="text-sm text-muted-foreground">
                      ครบกำหนด: {format(new Date(liability.end_date), 'dd/MM/yyyy')}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
