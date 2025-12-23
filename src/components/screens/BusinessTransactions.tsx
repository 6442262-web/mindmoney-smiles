import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Search, Filter, ArrowUp, ArrowDown, Edit, Trash2, Download } from "lucide-react";
import { Link } from "react-router-dom";

const businessTransactions = [
  { id: "1", type: "income", amount: 15000, description: "ยอดขายสินค้าปลีก", category: "sales", date: "2024-01-17", note: "ขายสินค้าประจำวัน" },
  { id: "2", type: "expense", amount: 8000, description: "ซื้อสินค้าเข้าใหม่", category: "goods", date: "2024-01-17", note: "สินค้าลอตใหม่" },
  { id: "3", type: "expense", amount: 2500, description: "ค่าเช่าร้านเดือนมกราคม", category: "rent", date: "2024-01-16", note: "" },
  { id: "4", type: "income", amount: 12000, description: "ยอดขายเมื่อวาน", category: "sales", date: "2024-01-16", note: "" },
  { id: "5", type: "expense", amount: 1500, description: "ค่าไฟฟ้าเดือนธันวาคม", category: "utilities", date: "2024-01-15", note: "" },
  { id: "6", type: "income", amount: 18000, description: "ขายสินค้าส่ง", category: "sales", date: "2024-01-15", note: "ลูกค้าขายส่ง A" },
  { id: "7", type: "expense", amount: 3000, description: "ค่าขนส่งสินค้า", category: "transport", date: "2024-01-14", note: "" },
  { id: "8", type: "expense", amount: 5000, description: "ค่าโฆษณาออนไลน์", category: "marketing", date: "2024-01-14", note: "Facebook Ads" },
];

const categoryLabels = {
  sales: "ยอดขาย",
  service: "ค่าบริการ",
  goods: "ค่าสินค้า",
  rent: "ค่าเช่า",
  utilities: "ค่าไฟฟ้า/น้ำ",
  transport: "ค่าขนส่ง",
  marketing: "ค่าโฆษณา",
  office: "ค่าสำนักงาน",
};

export function BusinessTransactions() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedPeriod, setSelectedPeriod] = useState("all");
  const [activeTab, setActiveTab] = useState("all");

  const filteredTransactions = businessTransactions.filter((transaction) => {
    const matchesSearch = transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.note.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || transaction.category === selectedCategory;
    const matchesType = activeTab === "all" || transaction.type === activeTab;
    
    // TODO: Add date filtering based on selectedPeriod
    
    return matchesSearch && matchesCategory && matchesType;
  });

  const totalIncome = filteredTransactions
    .filter(t => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);
    
  const totalExpense = filteredTransactions
    .filter(t => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  const handleExport = () => {
    // TODO: Implement export functionality
    console.log("Exporting transactions...");
  };

  return (
    <div className="pb-20 px-4 pt-6">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/business">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">รายการธุรกิจ</h1>
        <div className="ml-auto">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            ส่งออก
          </Button>
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
              <p className="text-sm text-muted-foreground">รายรับรวม</p>
              <p className="text-lg font-bold text-green-600">
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
              <p className="text-sm text-muted-foreground">รายจ่ายรวม</p>
              <p className="text-lg font-bold text-red-600">
                ฿{totalExpense.toLocaleString()}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${(totalIncome - totalExpense) >= 0 ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'}`}>
              <ArrowUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">กำไรสุทธิ</p>
              <p className={`text-lg font-bold ${(totalIncome - totalExpense) >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                {(totalIncome - totalExpense) >= 0 ? '+' : ''}฿{(totalIncome - totalExpense).toLocaleString()}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4 mb-6">
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="ค้นหารายการ..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Filter dropdowns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="หมวดหมู่" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">หมวดหมู่ทั้งหมด</SelectItem>
                {Object.entries(categoryLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger>
                <SelectValue placeholder="ช่วงเวลา" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทั้งหมด</SelectItem>
                <SelectItem value="today">วันนี้</SelectItem>
                <SelectItem value="week">สัปดาห์นี้</SelectItem>
                <SelectItem value="month">เดือนนี้</SelectItem>
                <SelectItem value="year">ปีนี้</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Transactions List */}
      <Card className="p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">ทั้งหมด</TabsTrigger>
            <TabsTrigger value="income">รายรับ</TabsTrigger>
            <TabsTrigger value="expense">รายจ่าย</TabsTrigger>
          </TabsList>
          
          <TabsContent value={activeTab} className="mt-4">
            <div className="space-y-3">
              {filteredTransactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  ไม่พบรายการที่ตรงกับเงื่อนไขการค้นหา
                </div>
              ) : (
                filteredTransactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3 flex-1">
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
                      <div className="flex-1">
                        <p className="font-medium">{transaction.description}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {categoryLabels[transaction.category] || transaction.category}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(transaction.date).toLocaleDateString('th-TH')}
                          </span>
                        </div>
                        {transaction.note && (
                          <p className="text-sm text-muted-foreground mt-1">{transaction.note}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className={`font-bold ${
                          transaction.type === "income" ? "text-green-600" : "text-red-600"
                        }`}>
                          {transaction.type === "income" ? "+" : "-"}฿{transaction.amount.toLocaleString()}
                        </p>
                      </div>
                      
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </Card>

      {/* Add Transaction Button */}
      <div className="fixed bottom-24 right-4">
        <Link to="/business/add-transaction">
          <Button className="rounded-full w-14 h-14 shadow-lg">
            <ArrowUp className="h-6 w-6" />
          </Button>
        </Link>
      </div>
    </div>
  );
}