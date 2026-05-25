import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Camera, Upload, X, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface SlipScanResult {
  success: boolean;
  amount?: number;
  date?: string;
  recipient?: string;
  description?: string;
  transactionType?: "expense" | "income";
  suggestedCategory?: string;
  confidence?: number;
  error?: string;
}

interface SlipScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScanComplete: (result: SlipScanResult) => void;
  onQuickSave?: (result: SlipScanResult) => Promise<void>;
}

export function SlipScanner({ open, onOpenChange, onScanComplete, onQuickSave }: SlipScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<SlipScanResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { t } = useLanguage();
  const { toast } = useToast();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "ไฟล์ไม่ถูกต้อง",
        description: "กรุณาเลือกไฟล์รูปภาพ",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "ไฟล์ใหญ่เกินไป",
        description: "กรุณาเลือกไฟล์ที่มีขนาดไม่เกิน 10MB",
        variant: "destructive",
      });
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setPreview(base64);
      scanSlip(base64);
    };
    reader.readAsDataURL(file);
  };

  const scanSlip = async (imageBase64: string) => {
    setIsScanning(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("scan-slip", {
        body: { imageBase64 },
      });

      if (error) {
        console.error("Scan error:", error);
        setResult({
          success: false,
          error: "ไม่สามารถเชื่อมต่อกับระบบสแกนได้",
        });
        return;
      }

      setResult(data);

      if (data.success) {
        toast({
          title: "สแกนสำเร็จ",
          description: `พบยอดเงิน ฿${data.amount?.toLocaleString("th-TH")}`,
        });
      }
    } catch (error) {
      console.error("Scan error:", error);
      setResult({
        success: false,
        error: "เกิดข้อผิดพลาดในการสแกน",
      });
    } finally {
      setIsScanning(false);
    }
  };

  const handleQuickSave = async () => {
    if (result?.success && onQuickSave) {
      setIsSaving(true);
      try {
        await onQuickSave(result);
        toast({
          title: "บันทึกสำเร็จ",
          description: `บันทึกรายการ ฿${result.amount?.toLocaleString("th-TH")} เรียบร้อยแล้ว`,
        });
        handleClose();
      } catch (error) {
        toast({
          title: "เกิดข้อผิดพลาด",
          description: "ไม่สามารถบันทึกรายการได้",
          variant: "destructive",
        });
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleConfirm = () => {
    if (result?.success) {
      onScanComplete(result);
      handleClose();
    }
  };

  const handleClose = () => {
    setPreview(null);
    setResult(null);
    setIsScanning(false);
    setIsSaving(false);
    onOpenChange(false);
  };

  const handleRetry = () => {
    setPreview(null);
    setResult(null);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            สแกนสลิป
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!preview ? (
            // Upload options
            <div className="grid grid-cols-2 gap-4">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                ref={cameraInputRef}
                onChange={handleFileSelect}
              />
              <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileSelect}
              />

              <Button
                variant="outline"
                className="h-24 flex-col gap-2"
                onClick={() => cameraInputRef.current?.click()}
              >
                <Camera className="h-8 w-8" />
                <span>ถ่ายรูป</span>
              </Button>

              <Button
                variant="outline"
                className="h-24 flex-col gap-2"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-8 w-8" />
                <span>เลือกรูป</span>
              </Button>
            </div>
          ) : (
            // Preview and results
            <div className="space-y-4">
              {/* Image preview */}
              <div className="relative">
                <img
                  src={preview}
                  alt="Slip preview"
                  className="w-full rounded-lg max-h-64 object-contain bg-muted"
                />
                {!isScanning && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 bg-background/80"
                    onClick={handleRetry}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Scanning indicator */}
              {isScanning && (
                <Card className="p-4">
                  <div className="flex items-center justify-center gap-3">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <span>กำลังวิเคราะห์สลิป...</span>
                  </div>
                </Card>
              )}

              {/* Results */}
              {result && (
                <Card className="p-4">
                  {result.success ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle className="h-5 w-5" />
                        <span className="font-medium">สแกนสำเร็จ</span>
                        {result.confidence && (
                          <span className="text-sm text-muted-foreground">
                            ({result.confidence}% ความมั่นใจ)
                          </span>
                        )}
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">จำนวนเงิน:</span>
                          <span className="font-semibold text-lg">
                            ฿{result.amount?.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                          </span>
                        </div>

                        {result.date && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">วันที่:</span>
                            <span>{result.date}</span>
                          </div>
                        )}

                        {result.recipient && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">ผู้รับ:</span>
                            <span>{result.recipient}</span>
                          </div>
                        )}

                        {result.suggestedCategory && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">หมวดหมู่:</span>
                            <span>{result.suggestedCategory}</span>
                          </div>
                        )}

                        {result.description && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">รายละเอียด:</span>
                            <span className="text-right max-w-[200px]">{result.description}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-destructive">
                      <AlertCircle className="h-5 w-5" />
                      <span>{result.error || "ไม่สามารถอ่านข้อมูลจากสลิปได้"}</span>
                    </div>
                  )}
                </Card>
              )}

              {/* Actions */}
              {result && (
                <div className="space-y-2">
                  {result.success && onQuickSave && (
                    <Button 
                      className="w-full bg-green-600 hover:bg-green-700" 
                      onClick={handleQuickSave}
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          กำลังบันทึก...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          บันทึกทันที
                        </>
                      )}
                    </Button>
                  )}
                  <div className="flex gap-3">
                    <Button variant="outline" className="flex-1" onClick={handleRetry} disabled={isSaving}>
                      สแกนใหม่
                    </Button>
                    {result.success && (
                      <Button variant="outline" className="flex-1" onClick={handleConfirm} disabled={isSaving}>
                        แก้ไขก่อนบันทึก
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
