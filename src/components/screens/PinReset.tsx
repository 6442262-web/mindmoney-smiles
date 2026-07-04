import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Mail, KeyRound, Delete, RefreshCw } from 'lucide-react';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { usePin } from '@/hooks/usePin';
import { isValidPinFormat } from '@/lib/pinUtils';
import { getErrorMessage } from '@/lib/getErrorMessage';

interface PinResetProps {
  onBack: () => void;
}

export function PinReset({ onBack }: PinResetProps) {
  const [step, setStep] = useState<'email' | 'otp' | 'create' | 'confirm'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const { resetPin } = usePin();

  const handleSendOTP = async () => {
    if (!email) {
      toast({
        title: "กรุณากรอก Email",
        description: "กรุณาใส่ Email ที่ใช้สมัครบัญชี",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email,
        options: {
          shouldCreateUser: false,
        }
      });

      if (error) throw error;

      toast({
        title: "ส่ง OTP สำเร็จ",
        description: "กรุณาตรวจสอบ Email ของคุณ",
      });
      
      setStep('otp');
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: getErrorMessage(error) || "ไม่สามารถส่ง OTP ได้",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      toast({
        title: "OTP ไม่ถูกต้อง",
        description: "กรุณาใส่ OTP 6 หลัก",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: email,
        token: otp,
        type: 'email',
      });

      if (error) throw error;

      toast({
        title: "ยืนยันตัวตนสำเร็จ",
        description: "กรุณาตั้ง PIN ใหม่",
      });
      
      setStep('create');
    } catch {
      toast({
        title: "OTP ไม่ถูกต้อง",
        description: "กรุณาตรวจสอบ OTP และลองอีกครั้ง",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNumberClick = (number: string, currentPin: string, setter: (pin: string) => void) => {
    if (currentPin.length < 6) {
      const newValue = currentPin + number;
      setter(newValue);
      
      // Auto submit when 6 digits for confirm step
      if (step === 'confirm' && newValue.length === 6) {
        setTimeout(() => handleConfirmPin(newValue), 100);
      } else if (step === 'create' && newValue.length === 6) {
        setTimeout(() => handleCreatePin(), 100);
      }
    }
  };

  const handleBackspace = (currentPin: string, setter: (pin: string) => void) => {
    setter(currentPin.slice(0, -1));
  };

  const handleCreatePin = () => {
    if (!isValidPinFormat(newPin)) {
      toast({
        title: "PIN ไม่ถูกต้อง",
        description: "PIN ต้องเป็นตัวเลข 6 หลัก",
        variant: "destructive",
      });
      return;
    }
    setStep('confirm');
  };

  const handleConfirmPin = async (pinToConfirm: string) => {
    if (pinToConfirm !== newPin) {
      toast({
        title: "PIN ไม่ตรงกัน",
        description: "กรุณาตรวจสอบ PIN และลองอีกครั้ง",
        variant: "destructive",
      });
      setNewPin('');
      setConfirmPin('');
      setStep('create');
      return;
    }
    
    const success = await resetPin(newPin);
    if (success) {
      onBack();
    }
  };

  const renderPinDots = (pin: string) => {
    return Array.from({ length: 6 }, (_, index) => (
      <div
        key={index}
        className={`w-4 h-4 rounded-full border-2 transition-colors ${
          index < pin.length
            ? 'bg-primary border-primary'
            : 'border-muted-foreground'
        }`}
      />
    ));
  };

  const numberPad = [
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 9],
    ['', 0, 'backspace']
  ];

  const renderNumberPad = (currentPin: string, setter: (pin: string) => void) => (
    <div className="space-y-4">
      <div className="flex justify-center space-x-3">
        {renderPinDots(currentPin)}
      </div>
      <div className="grid grid-cols-3 gap-3">
        {numberPad.flat().map((item, index) => {
          if (item === '') {
            return <div key={index} />;
          }
          
          if (item === 'backspace') {
            return (
              <Button
                key={index}
                variant="outline"
                size="lg"
                className="h-14 w-full"
                onClick={() => handleBackspace(currentPin, setter)}
                disabled={loading || currentPin.length === 0}
              >
                <Delete className="h-5 w-5" />
              </Button>
            );
          }

          return (
            <Button
              key={index}
              variant="outline"
              size="lg"
              className="h-14 w-full text-lg font-semibold"
              onClick={() => handleNumberClick(item.toString(), currentPin, setter)}
              disabled={loading}
            >
              {item}
            </Button>
          );
        })}
      </div>
    </div>
  );

  // Create PIN step
  if (step === 'create') {
    return (
      <div className="min-h-screen bg-background">
        <div className="p-4">
          <div className="flex items-center space-x-4 mb-6">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-semibold">ตั้ง PIN ใหม่</h1>
          </div>

          <div className="flex items-center justify-center min-h-[calc(100vh-120px)]">
            <Card className="w-full max-w-sm">
              <CardHeader className="text-center space-y-4">
                <div className="flex justify-center">
                  <div className="p-3 rounded-full bg-primary/10">
                    <KeyRound className="h-8 w-8 text-primary" />
                  </div>
                </div>
                <div>
                  <CardTitle className="text-xl">สร้าง PIN ใหม่</CardTitle>
                  <p className="text-sm text-muted-foreground mt-2">
                    ป้อน PIN 6 หลักเพื่อรักษาความปลอดภัย
                  </p>
                </div>
              </CardHeader>
              
              <CardContent>
                {renderNumberPad(newPin, setNewPin)}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Confirm PIN step
  if (step === 'confirm') {
    return (
      <div className="min-h-screen bg-background">
        <div className="p-4">
          <div className="flex items-center space-x-4 mb-6">
            <Button variant="ghost" size="icon" onClick={() => {
              setNewPin('');
              setConfirmPin('');
              setStep('create');
            }}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-semibold">ยืนยัน PIN</h1>
          </div>

          <div className="flex items-center justify-center min-h-[calc(100vh-120px)]">
            <Card className="w-full max-w-sm">
              <CardHeader className="text-center space-y-4">
                <div className="flex justify-center">
                  <div className="p-3 rounded-full bg-primary/10">
                    <KeyRound className="h-8 w-8 text-primary" />
                  </div>
                </div>
                <div>
                  <CardTitle className="text-xl">ยืนยัน PIN</CardTitle>
                  <p className="text-sm text-muted-foreground mt-2">
                    ป้อน PIN อีกครั้งเพื่อยืนยัน
                  </p>
                </div>
              </CardHeader>
              
              <CardContent>
                {renderNumberPad(confirmPin, setConfirmPin)}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Email and OTP steps
  return (
    <div className="min-h-screen bg-background">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center space-x-4 mb-6">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold">รีเซ็ตรหัส PIN</h1>
        </div>

        <div className="flex items-center justify-center min-h-[calc(100vh-120px)]">
          <Card className="w-full max-w-sm">
            <CardHeader className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="p-3 rounded-full bg-primary/10">
                  {step === 'email' ? (
                    <Mail className="h-8 w-8 text-primary" />
                  ) : (
                    <KeyRound className="h-8 w-8 text-primary" />
                  )}
                </div>
              </div>
              <div>
                <CardTitle className="text-xl">
                  {step === 'email' ? 'ยืนยันตัวตน' : 'ยืนยัน OTP'}
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-2">
                  {step === 'email' 
                    ? 'กรุณากรอก Email ที่ใช้สมัครบัญชี'
                    : 'กรุณาใส่รหัส OTP ที่ส่งไปยัง Email ของคุณ'
                  }
                </p>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {step === 'email' ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loading}
                    />
                  </div>

                  <Button 
                    className="w-full" 
                    onClick={handleSendOTP}
                    disabled={loading || !email}
                  >
                    {loading ? 'กำลังส่ง...' : 'ส่ง OTP'}
                  </Button>
                </>
              ) : (
                <>
                  <div className="space-y-4">
                    <Label className="text-center block">รหัส OTP (6 หลัก)</Label>
                    <div className="flex justify-center">
                      <InputOTP
                        maxLength={6}
                        value={otp}
                        onChange={(value) => setOtp(value)}
                        disabled={loading}
                      >
                        <InputOTPGroup>
                          <InputOTPSlot index={0} className="w-12 h-14 text-xl" />
                          <InputOTPSlot index={1} className="w-12 h-14 text-xl" />
                          <InputOTPSlot index={2} className="w-12 h-14 text-xl" />
                          <InputOTPSlot index={3} className="w-12 h-14 text-xl" />
                          <InputOTPSlot index={4} className="w-12 h-14 text-xl" />
                          <InputOTPSlot index={5} className="w-12 h-14 text-xl" />
                        </InputOTPGroup>
                      </InputOTP>
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                      กรุณาตรวจสอบ Email ของคุณสำหรับรหัส OTP
                    </p>
                  </div>

                  <Button 
                    className="w-full" 
                    onClick={handleVerifyOTP}
                    disabled={loading || otp.length !== 6}
                  >
                    {loading ? 'กำลังตรวจสอบ...' : 'ยืนยัน OTP'}
                  </Button>

                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={handleSendOTP}
                    disabled={loading}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    ส่ง OTP อีกครั้ง
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}