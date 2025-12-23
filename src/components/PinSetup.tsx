import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { KeyRound, ArrowLeft } from 'lucide-react';
import { PinEntry } from './PinEntry';
import { usePin } from '@/hooks/usePin';
import { isValidPinFormat } from '@/lib/pinUtils';

interface PinSetupProps {
  onComplete: () => void;
  onCancel: () => void;
}

export function PinSetup({ onComplete, onCancel }: PinSetupProps) {
  const [step, setStep] = useState<'welcome' | 'create' | 'confirm'>('welcome');
  const [firstPin, setFirstPin] = useState('');
  const { setupPin, loading } = usePin();

  const handleCreatePin = async (pin: string): Promise<boolean> => {
    if (!isValidPinFormat(pin)) return false;
    setFirstPin(pin);
    setStep('confirm');
    return true;
  };

  const handleConfirmPin = async (pin: string): Promise<boolean> => {
    if (pin !== firstPin) {
      setStep('create');
      setFirstPin('');
      return false;
    }
    
    const success = await setupPin(pin);
    if (success) {
      onComplete();
    }
    return success;
  };

  if (step === 'create') {
    return (
      <PinEntry
        title="สร้าง PIN"
        subtitle="ป้อน PIN 6 หลักเพื่อรักษาความปลอดภัย"
        onPinSubmit={handleCreatePin}
        loading={loading}
      />
    );
  }

  if (step === 'confirm') {
    return (
      <PinEntry
        title="ยืนยัน PIN"
        subtitle="ป้อน PIN อีกครั้งเพื่อยืนยัน"
        onPinSubmit={handleConfirmPin}
        loading={loading}
      />
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-3 rounded-full bg-primary/10">
              <KeyRound className="h-8 w-8 text-primary" />
            </div>
          </div>
          <div>
            <CardTitle className="text-xl">ตั้งค่า PIN</CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              เพิ่มความปลอดภัยให้แอปด้วยการตั้ง PIN 6 หลัก
            </p>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-start space-x-2">
              <span className="text-primary font-semibold">•</span>
              <span>PIN จะถูกใช้เพื่อเข้าสู่แอปพลิเคชัน</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-primary font-semibold">•</span>
              <span>PIN ต้องเป็นตัวเลข 6 หลัก</span>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-primary font-semibold">•</span>
              <span>สามารถเปลี่ยน PIN ได้ในหน้าการตั้งค่า</span>
            </div>
          </div>

          <div className="space-y-3 pt-4">
            <Button 
              className="w-full" 
              onClick={() => setStep('create')}
              disabled={loading}
            >
              เริ่มตั้งค่า PIN
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={onCancel}
              disabled={loading}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              ข้าม
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}