import { useState, useRef, useEffect } from "react";
import { ArrowLeft, Send, Check, X, Bot, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useTransactions } from "@/hooks/useTransactions";
import { useCategories } from "@/hooks/useCategories";
import { useAccounts } from "@/hooks/useAccounts";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  transaction?: {
    type: "income" | "expense";
    amount: number;
    description: string;
    category_id: string | null;
    category_name: string;
  } | null;
  transactionAdded?: boolean;
}

export function ChatTransaction() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "สวัสดีครับ! 👋 ผมเป็นผู้ช่วยการเงินส่วนตัว สามารถ:\n\n📝 บันทึกรายการ เช่น\n• \"กินข้าว 50 บาท\"\n• \"เงินเดือน 30,000\"\n\n💬 ตอบคำถามจากข้อมูลของคุณ เช่น\n• \"เดือนนี้ใช้เงินไปเท่าไหร่\"\n• \"หมวดไหนใช้เยอะสุด\"\n• \"หนี้บัตรเครดิตเหลือเท่าไหร่\"\n• \"พอร์ตลงทุนกำไรเท่าไหร่\"\n• \"เป้าหมายการออมไปถึงไหนแล้ว\"",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { createTransaction } = useTransactions();
  const { categories } = useCategories();
  const { currentAccount } = useAccounts();
  const { toast } = useToast();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: text,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const history = messages
        .filter((m) => m.id !== "welcome")
        .slice(-10)
        .map((m) => ({ role: m.role, content: m.content }));

      const { data, error } = await supabase.functions.invoke("chat-transaction", {
        body: {
          message: text,
          categories: categories.map((c) => ({ id: c.id, name: c.name, type: c.type })),
          history,
        },
      });

      if (error) throw error;

      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.reply || "ไม่สามารถวิเคราะห์ได้",
        transaction: data.transaction || null,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error("Chat error:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "ขออภัย เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง",
        },
      ]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleAddTransaction = async (msgId: string, transaction: NonNullable<ChatMessage["transaction"]>) => {
    if (!currentAccount) {
      toast({ title: "ไม่พบบัญชี", description: "กรุณาสร้างบัญชีก่อน", variant: "destructive" });
      return;
    }

    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    const result = await createTransaction({
      type: transaction.type,
      amount: transaction.amount,
      description: transaction.description,
      date: dateStr,
      account_id: currentAccount.id,
      category_id: transaction.category_id,
    });

    if (result) {
      setMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, transactionAdded: true } : m))
      );
    }
  };

  const handleReject = (msgId: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, transaction: null, transactionAdded: false } : m))
    );
    toast({ title: "ยกเลิกแล้ว", description: "ไม่ได้เพิ่มรายการนี้" });
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-card">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Bot className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h1 className="text-sm font-semibold">แชทบันทึกรายรับรายจ่าย</h1>
            <p className="text-xs text-muted-foreground">พิมพ์บอก AI จัดให้อัตโนมัติ</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-4 py-3" ref={scrollRef}>
        <div className="space-y-4 pb-4">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "assistant" && (
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                  <Bot className="h-3.5 w-3.5 text-primary" />
                </div>
              )}
              <div className={`max-w-[80%] space-y-2`}>
                <div
                  className={`rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-muted rounded-bl-md"
                  }`}
                >
                  {msg.content}
                </div>

                {/* Transaction card */}
                {msg.transaction && !msg.transactionAdded && (
                  <Card className="p-3 space-y-2 border-dashed">
                    <div className="flex items-center justify-between">
                      <Badge variant={msg.transaction.type === "income" ? "default" : "destructive"} className="text-xs">
                        {msg.transaction.type === "income" ? "รายรับ" : "รายจ่าย"}
                      </Badge>
                      <span className={`font-bold text-sm ${msg.transaction.type === "income" ? "text-green-600" : "text-red-500"}`}>
                        {msg.transaction.type === "income" ? "+" : "-"}
                        {msg.transaction.amount.toLocaleString()} ฿
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{msg.transaction.description}</p>
                    {msg.transaction.category_name && (
                      <Badge variant="outline" className="text-xs">
                        {msg.transaction.category_name}
                      </Badge>
                    )}
                    <div className="flex gap-2 pt-1">
                      <Button
                        size="sm"
                        className="flex-1 h-8 text-xs"
                        onClick={() => handleAddTransaction(msg.id, msg.transaction!)}
                      >
                        <Check className="h-3 w-3 mr-1" /> เพิ่มรายการ
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs"
                        onClick={() => handleReject(msg.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </Card>
                )}

                {msg.transactionAdded && (
                  <div className="flex items-center gap-1 text-xs text-green-600">
                    <Check className="h-3 w-3" /> เพิ่มรายการแล้ว
                  </div>
                )}
              </div>

              {msg.role === "user" && (
                <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 mt-1">
                  <User className="h-3.5 w-3.5 text-secondary-foreground" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-2 justify-start">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Bot className="h-3.5 w-3.5 text-primary" />
              </div>
              <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t bg-card px-4 py-3 pb-24">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
          className="flex gap-2"
        >
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="พิมพ์รายการ เช่น กินข้าว 50 บาท..."
            className="flex-1 rounded-full"
            disabled={isLoading}
          />
          <Button type="submit" size="icon" className="rounded-full" disabled={!input.trim() || isLoading}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
