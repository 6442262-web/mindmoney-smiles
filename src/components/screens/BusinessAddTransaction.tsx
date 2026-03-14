import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ArrowLeft, CalendarIcon, ArrowUp, ArrowDown } from "lucide-react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const businessTransactionSchema = z.object({
  type: z.enum(["income", "expense"], {
    required_error: "กรุณาเลือกประเภทรายการ",
  }),
  amount: z.string()
    .min(1, "กรุณากรอกจำนวนเงิน")
    .regex(/^\d+(\.\d{1,2})?$/, "จำนวนเงินต้องเป็นตัวเลขเท่านั้น")
    .refine(val => {
      const num = parseFloat(val);
      return num > 0 && num <= 999999999;
    }, "จำนวนเงินต้องมากกว่า 0 และไม่เกิน 999,999,999"),
  description: z.string()
    .max(100, "รายละเอียดต้องไม่เกิน 100 ตัวอักษร")
    .optional(),
  category: z.string({
    required_error: "กรุณาเลือกหมวดหมู่",
  }),
  date: z.date({
    required_error: "กรุณาเลือกวันที่",
  }),
  note: z.string().optional(),
});

type BusinessTransactionFormData = z.infer<typeof businessTransactionSchema>;

const incomeCategories = [
  { value: "sales", label: "ยอดขาย" },
  { value: "service", label: "ค่าบริการ" },
  { value: "interest", label: "ดอกเบี้ย" },
  { value: "other-income", label: "รายได้อื่นๆ" },
];

const expenseCategories = [
  { value: "goods", label: "ค่าสินค้า" },
  { value: "rent", label: "ค่าเช่า" },
  { value: "utilities", label: "ค่าไฟฟ้า/น้ำ" },
  { value: "transport", label: "ค่าขนส่ง" },
  { value: "marketing", label: "ค่าโฆษณา" },
  { value: "office", label: "ค่าสำนักงาน" },
  { value: "maintenance", label: "ค่าซ่อมแซม" },
  { value: "staff", label: "ค่าแรงพนักงาน" },
  { value: "tax", label: "ภาษี" },
  { value: "other-expense", label: "ค่าใช้จ่ายอื่นๆ" },
];

export function BusinessAddTransaction() {
  const { toast } = useToast();
  const [selectedType, setSelectedType] = useState<"income" | "expense" | "">("");

  const form = useForm<BusinessTransactionFormData>({
    resolver: zodResolver(businessTransactionSchema),
    defaultValues: {
      date: new Date(),
    },
  });

  const onSubmit = (data: BusinessTransactionFormData) => {
    console.log("Business transaction data:", data);
    // Here you would typically send the data to your backend
    toast({
      title: "บันทึกสำเร็จ",
      description: `บันทึก${data.type === "income" ? "รายรับ" : "รายจ่าย"}เรียบร้อยแล้ว`,
    });
    form.reset({
      date: new Date(),
    });
    setSelectedType("");
  };

  const currentCategories = selectedType === "income" ? incomeCategories : expenseCategories;

  return (
    <div className="pb-20 px-4 pt-6">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/business">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">เพิ่มรายการธุรกิจ</h1>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Transaction Type */}
          <Card className="p-6">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-lg font-semibold">ประเภทรายการ</FormLabel>
                  <div className="grid grid-cols-2 gap-4 mt-3">
                    <Button
                      type="button"
                      variant={field.value === "income" ? "default" : "outline"}
                      className="h-20 flex-col gap-2"
                      onClick={() => {
                        field.onChange("income");
                        setSelectedType("income");
                        form.setValue("category", "");
                      }}
                    >
                      <ArrowUp className="h-6 w-6" />
                      <span>รายรับ</span>
                    </Button>
                    <Button
                      type="button"
                      variant={field.value === "expense" ? "default" : "outline"}
                      className="h-20 flex-col gap-2"
                      onClick={() => {
                        field.onChange("expense");
                        setSelectedType("expense");
                        form.setValue("category", "");
                      }}
                    >
                      <ArrowDown className="h-6 w-6" />
                      <span>รายจ่าย</span>
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </Card>

          {/* Amount */}
          <Card className="p-6">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>จำนวนเงิน (บาท)</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                        ฿
                      </span>
                      <Input
                        {...field}
                        type="text"
                        inputMode="decimal"
                        placeholder="0.00"
                        className="pl-8 text-lg font-mono"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </Card>

          {/* Description and Category */}
          <Card className="p-6 space-y-4">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>รายละเอียด (ไม่บังคับ)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="ระบุรายละเอียดรายการ (ไม่บังคับ)"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>หมวดหมู่</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={!selectedType}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="เลือกหมวดหมู่" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {currentCategories.map((category) => (
                        <SelectItem key={category.value} value={category.value}>
                          {category.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                  {!selectedType && (
                    <p className="text-sm text-muted-foreground">
                      กรุณาเลือกประเภทรายการก่อน
                    </p>
                  )}
                </FormItem>
              )}
            />
          </Card>

          {/* Date */}
          <Card className="p-6">
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>วันที่</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "dd/MM/yyyy")
                          ) : (
                            <span>เลือกวันที่</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date > new Date() || date < new Date("2020-01-01")}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
          </Card>

          {/* Note */}
          <Card className="p-6">
            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>หมายเหตุ (ไม่บังคับ)</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="หมายเหตุเพิ่มเติม..."
                      className="min-h-[80px]"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </Card>

          {/* Submit Button */}
          <Card className="p-4">
            <Button type="submit" className="w-full" size="lg">
              บันทึกรายการ
            </Button>
          </Card>
        </form>
      </Form>
    </div>
  );
}