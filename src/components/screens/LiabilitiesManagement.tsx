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
import { ArrowLeft, Plus, CreditCard, Building2, AlertTriangle, TrendingDown, Calendar, Percent } from "lucide-react";
import { Link } from "react-router-dom";
import { useLiabilities } from "@/hooks/useLiabilities";
import { useAccounts } from "@/hooks/useAccounts";
import { format } from "date-fns";
import { Textarea } from "@/components/ui/textarea";

const liabilityTypeLabels = {
  loan: "เงินกู้",
  trade_payable: "เจ้าหนี้การค้า",
  short_term: "หนี้สินระยะสั้น",
  long_term: "หนี้สินระยะยาว",
  credit_card: "บัตรเครดิต",
  other: "อื่นๆ"
};

const statusLabels = {
  active: "ใช้งานอยู่",
  paid_off: "ชำระครบแล้ว",
  defaulted: "ค้างชำระ"
};

export function LiabilitiesManagement() {
  const { liabilities, loading, createLiability, updateLiability, deleteLiability } = useLiabilities();
  const { accounts } = useAccounts();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedLiability, setSelectedLiability] = useState<any>(null);
  const [formData, setFormData] = useState({
    liability_type: 'credit_card',
    creditor_name: '',
    principal_amount: '',
    current_balance: '',
    interest_rate: '',
    start_date: new Date().toISOString().split('T')[0],
    due_date: '',
    payment_frequency: 'monthly',
    payment_amount: '',
    description: '',
    status: 'active',
    credit_limit: '',
    min_payment: '',
    billing_cycle_day: '',
    payment_due_day: '',
    account_id: '',
  });

  // Sample data for demonstration
  const sampleLiabilities = [
    {
      id: "1",
      user_id: "",
      account_id: "",
      liability_type: "loan" as const,
      creditor_name: "ธนาคาร ABC",
      principal_amount: 500000,
      current_balance: 350000,
      interest_rate: 0.05,
      start_date: "2024-01-01",
      due_date: "2026-12-31",
      payment_frequency: "monthly" as const,
      payment_amount: 15000,
      status: "active" as const,
      description: "สินเชื่อรถยนต์",
      created_at: "",
      updated_at: ""
    },
    {
      id: "2",
      user_id: "",
      account_id: "",
      liability_type: "credit_card" as const,
      creditor_name: "บัตรเครดิต XYZ",
      principal_amount: 100000,
      current_balance: 45000,
      interest_rate: 0.18,
      start_date: "2023-06-15",
      payment_frequency: "monthly" as const,
      payment_amount: 5000,
      status: "active" as const,
      description: "บัตรเครดิตส่วนตัว",
      credit_limit: 100000,
      min_payment: 2250,
      billing_cycle_day: 15,
      payment_due_day: 5,
      created_at: "",
      updated_at: ""
    }
  ];

  // Use real liabilities or sample data
  const displayLiabilities = liabilities.length > 0 ? liabilities : sampleLiabilities;
  
  const totalDebt = displayLiabilities.reduce((sum, liability) => sum + liability.current_balance, 0);
  const monthlyPayment = displayLiabilities.reduce((sum, liability) => sum + (liability.payment_amount || 0), 0);
  
  // Calculate total credit limit and available credit
  const creditCards = displayLiabilities.filter(l => l.liability_type === 'credit_card');
  const totalCreditLimit = creditCards.reduce((sum, card) => sum + (card.credit_limit || 0), 0);
  const totalCreditUsed = creditCards.reduce((sum, card) => sum + card.current_balance, 0);
  const availableCredit = totalCreditLimit - totalCreditUsed;
  
  // Calculate upcoming payments (next 30 days)
  const upcomingPayments = displayLiabilities.filter(liability => {
    if (!liability.due_date) return false;
    const dueDate = new Date(liability.due_date);
    const today = new Date();
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    return dueDate <= thirtyDaysFromNow;
  });

  const handleSubmit = async () => {
    if (!formData.account_id || !formData.creditor_name) {
      return;
    }

    // For credit cards, use credit_limit as principal_amount
    const principalAmount = formData.liability_type === 'credit_card' 
      ? parseFloat(formData.credit_limit) || 0
      : parseFloat(formData.principal_amount) || 0;

    await createLiability({
      ...formData,
      principal_amount: principalAmount,
      current_balance: parseFloat(formData.current_balance) || 0,
      interest_rate: parseFloat(formData.interest_rate) || 0,
      payment_amount: formData.payment_amount ? parseFloat(formData.payment_amount) : undefined,
      credit_limit: formData.credit_limit ? parseFloat(formData.credit_limit) : undefined,
      min_payment: formData.min_payment ? parseFloat(formData.min_payment) : undefined,
      billing_cycle_day: formData.billing_cycle_day ? parseInt(formData.billing_cycle_day) : undefined,
      payment_due_day: formData.payment_due_day ? parseInt(formData.payment_due_day) : undefined,
    } as any);

    setIsDialogOpen(false);
    setFormData({
      liability_type: 'credit_card',
      creditor_name: '',
      principal_amount: '',
      current_balance: '',
      interest_rate: '',
      start_date: new Date().toISOString().split('T')[0],
      due_date: '',
      payment_frequency: 'monthly',
      payment_amount: '',
      description: '',
      status: 'active',
      credit_limit: '',
      min_payment: '',
      billing_cycle_day: '',
      payment_due_day: '',
      account_id: '',
    });
  };

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
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                เพิ่มหนี้สิน
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>เพิ่มหนี้สินใหม่</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>บัญชี *</Label>
                  <Select value={formData.account_id} onValueChange={(value) => setFormData({...formData, account_id: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="เลือกบัญชี" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>{account.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>ประเภทหนี้สิน *</Label>
                  <Select value={formData.liability_type} onValueChange={(value) => setFormData({...formData, liability_type: value})}>
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
                  <Label>ชื่อเจ้าหนี้/สถาบันการเงิน *</Label>
                  <Input 
                    placeholder="ชื่อเจ้าหนี้" 
                    value={formData.creditor_name}
                    onChange={(e) => setFormData({...formData, creditor_name: e.target.value})}
                  />
                </div>

                {formData.liability_type === 'credit_card' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>วงเงิน (บาท)</Label>
                        <Input 
                          type="number" 
                          placeholder="0"
                          value={formData.credit_limit}
                          onChange={(e) => setFormData({...formData, credit_limit: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>ยอดใช้ปัจจุบัน (บาท) *</Label>
                        <Input 
                          type="number" 
                          placeholder="0"
                          value={formData.current_balance}
                          onChange={(e) => setFormData({...formData, current_balance: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>ยอดชำระขั้นต่ำ (บาท)</Label>
                        <Input 
                          type="number" 
                          placeholder="0"
                          value={formData.min_payment}
                          onChange={(e) => setFormData({...formData, min_payment: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>ยอดชำระต่องวด (บาท)</Label>
                        <Input 
                          type="number" 
                          placeholder="0"
                          value={formData.payment_amount}
                          onChange={(e) => setFormData({...formData, payment_amount: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>วันปิดบิล (1-31)</Label>
                        <Input 
                          type="number" 
                          min="1"
                          max="31"
                          placeholder="15"
                          value={formData.billing_cycle_day}
                          onChange={(e) => setFormData({...formData, billing_cycle_day: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>วันครบกำหนดชำระ (1-31)</Label>
                        <Input 
                          type="number" 
                          min="1"
                          max="31"
                          placeholder="20"
                          value={formData.payment_due_day}
                          onChange={(e) => setFormData({...formData, payment_due_day: e.target.value})}
                        />
                      </div>
                    </div>
                  </>
                )}

                {formData.liability_type !== 'credit_card' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>จำนวนเงินต้น (บาท) *</Label>
                        <Input 
                          type="number" 
                          placeholder="0"
                          value={formData.principal_amount}
                          onChange={(e) => setFormData({...formData, principal_amount: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>ยอดคงเหลือ (บาท) *</Label>
                        <Input 
                          type="number" 
                          placeholder="0"
                          value={formData.current_balance}
                          onChange={(e) => setFormData({...formData, current_balance: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>จำนวนชำระต่องวด (บาท)</Label>
                        <Input 
                          type="number" 
                          placeholder="0"
                          value={formData.payment_amount}
                          onChange={(e) => setFormData({...formData, payment_amount: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>วันครบกำหนด</Label>
                        <Input 
                          type="date"
                          value={formData.due_date}
                          onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                        />
                      </div>
                    </div>
                  </>
                )}

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
                    <Label>ความถี่การจ่าย</Label>
                    <Select value={formData.payment_frequency} onValueChange={(value) => setFormData({...formData, payment_frequency: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="เลือก" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">รายเดือน</SelectItem>
                        <SelectItem value="quarterly">รายไตรมาส</SelectItem>
                        <SelectItem value="yearly">รายปี</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>คำอธิบาย</Label>
                  <Textarea 
                    placeholder="รายละเอียดเพิ่มเติม"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                  />
                </div>

                <Button className="w-full" onClick={handleSubmit}>บันทึก</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 text-red-600 rounded-lg">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">หนี้สินรวม</p>
              <p className="text-xl font-bold text-red-600">
                ฿{totalDebt.toLocaleString()}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">การจ่ายรายเดือน</p>
              <p className="text-xl font-bold text-orange-600">
                ฿{monthlyPayment.toLocaleString()}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
              <Percent className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">วงเงินบัตรเครดิต</p>
              <p className="text-xl font-bold text-blue-600">
                ฿{totalCreditLimit.toLocaleString()}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 text-green-600 rounded-lg">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">วงเงินคงเหลือ</p>
              <p className="text-xl font-bold text-green-600">
                ฿{availableCredit.toLocaleString()}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Credit Card Summary */}
      {creditCards.length > 0 && (
        <Card className="p-4 mb-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            สรุปบัตรเครดิตทั้งหมด
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">จำนวนบัตร</p>
              <p className="text-2xl font-bold text-blue-600">{creditCards.length} บัตร</p>
            </div>
            <div className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">วงเงินรวมทั้งหมด</p>
              <p className="text-2xl font-bold text-purple-600">฿{totalCreditLimit.toLocaleString()}</p>
            </div>
            <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">ยอดใช้รวม</p>
              <p className="text-2xl font-bold text-red-600">฿{totalCreditUsed.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {((totalCreditUsed / totalCreditLimit) * 100).toFixed(1)}% ของวงเงิน
              </p>
            </div>
            <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">วงเงินคงเหลือ</p>
              <p className="text-2xl font-bold text-green-600">฿{availableCredit.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {((availableCredit / totalCreditLimit) * 100).toFixed(1)}% คงเหลือ
              </p>
            </div>
          </div>
          
          <div className="p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-orange-800 dark:text-orange-200">ยอดชำระขั้นต่ำรวม</p>
              <p className="text-xl font-bold text-orange-600">
                ฿{creditCards.reduce((sum, card) => sum + (card.min_payment || 0), 0).toLocaleString()}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              ยอดขั้นต่ำที่ต้องชำระในรอบบิลนี้
            </p>
          </div>
        </Card>
      )}

      {/* Credit Card Usage Overview */}
      {creditCards.length > 0 && (
        <Card className="p-4 mb-6">
          <h3 className="font-semibold mb-4">รายละเอียดแต่ละบัตร</h3>
          <div className="space-y-4">
            {creditCards.map((card) => {
              const usagePercent = card.credit_limit 
                ? (card.current_balance / card.credit_limit) * 100 
                : 0;
              const available = (card.credit_limit || 0) - card.current_balance;
              
              return (
                <div key={card.id} className="space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{card.creditor_name}</p>
                      <p className="text-sm text-muted-foreground">
                        ใช้ไป ฿{card.current_balance.toLocaleString()} / ฿{card.credit_limit?.toLocaleString() || 0}
                      </p>
                    </div>
                    <Badge variant={usagePercent > 80 ? "destructive" : usagePercent > 50 ? "secondary" : "default"}>
                      {usagePercent.toFixed(1)}%
                    </Badge>
                  </div>
                  <Progress value={usagePercent} className="h-2" />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">คงเหลือ: ฿{available.toLocaleString()}</span>
                    {card.min_payment && (
                      <span className="text-muted-foreground">ชำระขั้นต่ำ: ฿{card.min_payment.toLocaleString()}</span>
                    )}
                  </div>
                  {card.payment_due_day && (
                    <p className="text-xs text-muted-foreground">
                      วันชำระ: ทุกวันที่ {card.payment_due_day} ของเดือน
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Liabilities List */}
      <Card className="p-4 mb-6">
        <Tabs defaultValue="active">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="active">หนี้ที่ใช้งาน</TabsTrigger>
            <TabsTrigger value="paid">ชำระครบแล้ว</TabsTrigger>
            <TabsTrigger value="overdue">ค้างชำระ</TabsTrigger>
          </TabsList>
          
          <TabsContent value="active" className="mt-4">
            <div className="space-y-3">
              {displayLiabilities.filter(l => l.status === 'active').map((liability) => (
                <div key={liability.id} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                        {liability.liability_type === 'credit_card' ? 
                          <CreditCard className="h-4 w-4" /> : 
                          <Building2 className="h-4 w-4" />
                        }
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{liability.creditor_name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {liabilityTypeLabels[liability.liability_type]}
                          </Badge>
                          {liability.description && (
                            <span className="text-xs text-muted-foreground">
                              {liability.description}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="font-bold text-red-600">
                        ฿{liability.current_balance.toLocaleString()}
                      </p>
                      {liability.payment_amount && (
                        <p className="text-sm text-muted-foreground">
                          จ่าย: ฿{liability.payment_amount.toLocaleString()}/เดือน
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Credit card specific info */}
                  {liability.liability_type === 'credit_card' && liability.credit_limit && (
                    <div className="space-y-2 pt-2 border-t">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">วงเงิน:</span>
                        <span className="font-medium">฿{liability.credit_limit.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">คงเหลือ:</span>
                        <span className="font-medium text-green-600">
                          ฿{(liability.credit_limit - liability.current_balance).toLocaleString()}
                        </span>
                      </div>
                      {liability.min_payment && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">ชำระขั้นต่ำ:</span>
                          <span className="font-medium">฿{liability.min_payment.toLocaleString()}</span>
                        </div>
                      )}
                      {liability.billing_cycle_day && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">วันปิดบิล:</span>
                          <span>วันที่ {liability.billing_cycle_day}</span>
                        </div>
                      )}
                      {liability.payment_due_day && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">วันครบกำหนด:</span>
                          <span>วันที่ {liability.payment_due_day}</span>
                        </div>
                      )}
                      <Progress 
                        value={(liability.current_balance / liability.credit_limit) * 100} 
                        className="h-2"
                      />
                    </div>
                  )}

                  {/* Other liability types */}
                  {liability.liability_type !== 'credit_card' && (
                    <div className="flex items-center gap-4 text-sm text-muted-foreground pt-2 border-t">
                      <span>ดอกเบี้ย: {(liability.interest_rate * 100).toFixed(1)}%</span>
                      {liability.due_date && (
                        <span>ครบกำหนด: {format(new Date(liability.due_date), 'dd/MM/yyyy')}</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {displayLiabilities.filter(l => l.status === 'active').length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  ไม่มีหนี้ที่ใช้งาน
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="paid" className="mt-4">
            <div className="text-center py-8 text-muted-foreground">
              ไม่มีหนี้ที่ชำระครบแล้ว
            </div>
          </TabsContent>

          <TabsContent value="overdue" className="mt-4">
            <div className="text-center py-8 text-muted-foreground">
              ไม่มีหนี้ค้างชำระ
            </div>
          </TabsContent>
        </Tabs>
      </Card>

      {/* Payment Schedule */}
      <Card className="p-4">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <TrendingDown className="h-5 w-5" />
          ตารางการจ่ายหนี้
        </h3>
        <div className="space-y-3">
          {displayLiabilities.map((liability) => (
            <div key={liability.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div>
                <p className="font-medium">{liability.creditor_name}</p>
                <p className="text-sm text-muted-foreground">
                  การจ่าย: {
                    liability.payment_frequency === 'monthly' ? 'รายเดือน' : 
                    liability.payment_frequency === 'quarterly' ? 'รายไตรมาส' :
                    liability.payment_frequency === 'yearly' ? 'รายปี' : 'ตามกำหนด'
                  }
                </p>
                {liability.liability_type === 'credit_card' && liability.payment_due_day && (
                  <p className="text-xs text-muted-foreground">
                    ครบกำหนด: วันที่ {liability.payment_due_day} ของทุกเดือน
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="font-bold">
                  {liability.min_payment ? 
                    `฿${liability.min_payment.toLocaleString()}+` : 
                    liability.payment_amount ? 
                    `฿${liability.payment_amount.toLocaleString()}` : 
                    '-'
                  }
                </p>
                {liability.due_date && (
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(liability.due_date), 'dd/MM/yyyy')}
                  </p>
                )}
              </div>
            </div>
          ))}
          {displayLiabilities.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              ไม่มีข้อมูลตารางการจ่ายหนี้
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}