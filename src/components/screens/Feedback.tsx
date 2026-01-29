import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Send, MessageSquare, Bug, Lightbulb, HelpCircle, CheckCircle, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { useFeedback } from "@/hooks/useFeedback";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { th } from "date-fns/locale";

const feedbackTypes = [
  { value: "bug", label: "แจ้งปัญหา/บัก", icon: Bug, color: "text-red-500" },
  { value: "feature", label: "ขอฟีเจอร์ใหม่", icon: Lightbulb, color: "text-yellow-500" },
  { value: "general", label: "ข้อเสนอแนะทั่วไป", icon: MessageSquare, color: "text-blue-500" },
  { value: "question", label: "คำถาม", icon: HelpCircle, color: "text-purple-500" },
];

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  pending: { label: "รอดำเนินการ", variant: "secondary" },
  reviewed: { label: "กำลังตรวจสอบ", variant: "default" },
  resolved: { label: "แก้ไขแล้ว", variant: "outline" },
};

export function Feedback() {
  const { feedbacks, isLoading, createFeedback, isCreating } = useFeedback();
  const [type, setType] = useState("general");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;
    
    createFeedback(
      { type, subject: subject.trim(), message: message.trim() },
      {
        onSuccess: () => {
          setSubject("");
          setMessage("");
          setType("general");
        },
      }
    );
  };

  const getTypeIcon = (typeValue: string) => {
    const typeInfo = feedbackTypes.find(t => t.value === typeValue);
    if (!typeInfo) return MessageSquare;
    return typeInfo.icon;
  };

  const getTypeColor = (typeValue: string) => {
    const typeInfo = feedbackTypes.find(t => t.value === typeValue);
    return typeInfo?.color || "text-muted-foreground";
  };

  return (
    <div className="pb-20 px-4 pt-6">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/profile">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">ส่งข้อเสนอแนะ</h1>
      </div>

      {/* Feedback Form */}
      <Card className="p-6 mb-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="type">ประเภท</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue placeholder="เลือกประเภท" />
              </SelectTrigger>
              <SelectContent>
                {feedbackTypes.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    <div className="flex items-center gap-2">
                      <t.icon className={`h-4 w-4 ${t.color}`} />
                      <span>{t.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">หัวข้อ</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="หัวข้อข้อเสนอแนะ"
              maxLength={100}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">รายละเอียด</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="อธิบายรายละเอียดเพิ่มเติม..."
              rows={5}
              maxLength={1000}
              required
            />
            <p className="text-xs text-muted-foreground text-right">
              {message.length}/1000
            </p>
          </div>

          <Button type="submit" className="w-full" disabled={isCreating || !subject.trim() || !message.trim()}>
            <Send className="h-4 w-4 mr-2" />
            {isCreating ? "กำลังส่ง..." : "ส่งข้อเสนอแนะ"}
          </Button>
        </form>
      </Card>

      {/* Previous Feedbacks */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Clock className="h-5 w-5" />
          ประวัติการส่ง
        </h2>
        
        {isLoading ? (
          <Card className="p-4">
            <p className="text-muted-foreground text-center">กำลังโหลด...</p>
          </Card>
        ) : feedbacks.length === 0 ? (
          <Card className="p-4">
            <p className="text-muted-foreground text-center">ยังไม่มีข้อเสนอแนะ</p>
          </Card>
        ) : (
          feedbacks.map((feedback) => {
            const TypeIcon = getTypeIcon(feedback.type);
            const status = statusLabels[feedback.status] || statusLabels.pending;
            
            return (
              <Card key={feedback.id} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <TypeIcon className={`h-4 w-4 ${getTypeColor(feedback.type)}`} />
                    <span className="font-medium">{feedback.subject}</span>
                  </div>
                  <Badge variant={status.variant}>
                    {feedback.status === "resolved" && <CheckCircle className="h-3 w-3 mr-1" />}
                    {status.label}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                  {feedback.message}
                </p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(feedback.created_at), "d MMM yyyy HH:mm", { locale: th })}
                </p>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
