import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, KeyRound, Shield } from 'lucide-react';
import { usePin } from '@/hooks/usePin';
import { PinEntry } from '../PinEntry';
import { PinSetup } from '../PinSetup';

interface PinSettingsProps {
  onBack: () => void;
}

export function PinSettings({ onBack }: PinSettingsProps) {
  const [showPinEntry, setShowPinEntry] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [actionType, setActionType] = useState<'change' | 'disable'>('change');
  const { isPinEnabled, hasPin, disablePin, loading } = usePin();

  const handleTogglePin = (enabled: boolean) => {
    if (enabled && !hasPin) {
      // Enable PIN - show setup
      setShowSetup(true);
    } else if (!enabled && hasPin) {
      // Disable PIN - show PIN entry for verification
      setActionType('disable');
      setShowPinEntry(true);
    }
  };

  const handleChangePin = () => {
    setActionType('change');
    setShowPinEntry(true);
  };

  const handlePinVerification = async (pin: string): Promise<boolean> => {
    if (actionType === 'disable') {
      const success = await disablePin();
      if (success) {
        setShowPinEntry(false);
      }
      return success;
    }
    
    // For change PIN, we'll implement this later
    setShowPinEntry(false);
    setShowSetup(true);
    return true;
  };

  const handleSetupComplete = () => {
    setShowSetup(false);
  };

  const handleSetupCancel = () => {
    setShowSetup(false);
  };

  if (showSetup) {
    return (
      <PinSetup 
        onComplete={handleSetupComplete}
        onCancel={handleSetupCancel}
      />
    );
  }

  if (showPinEntry) {
    return (
      <PinEntry
        title={actionType === 'disable' ? 'ยืนยัน PIN เพื่อปิดใช้งาน' : 'ยืนยัน PIN เดิม'}
        subtitle={actionType === 'disable' ? 'ป้อน PIN เพื่อปิดใช้งานระบบ PIN' : 'ป้อน PIN เดิมเพื่อเปลี่ยนเป็น PIN ใหม่'}
        onPinSubmit={handlePinVerification}
        loading={loading}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold">การตั้งค่า PIN</h1>
        </div>

        {/* PIN Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>สถานะ PIN</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">เปิดใช้งาน PIN</h3>
                <p className="text-sm text-muted-foreground">
                  ใช้ PIN เพื่อรักษาความปลอดภัยของแอป
                </p>
              </div>
              <Switch
                checked={isPinEnabled}
                onCheckedChange={handleTogglePin}
                disabled={loading}
              />
            </div>

            {isPinEnabled && hasPin && (
              <div className="pt-4 border-t">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={handleChangePin}
                  disabled={loading}
                >
                  <KeyRound className="h-4 w-4 mr-2" />
                  เปลี่ยน PIN
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Information Card */}
        <Card>
          <CardHeader>
            <CardTitle>ข้อมูลเกี่ยวกับ PIN</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-start space-x-2">
                <span className="text-primary font-semibold">•</span>
                <span>PIN ต้องเป็นตัวเลข 6 หลัก</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="text-primary font-semibold">•</span>
                <span>PIN จะถูกถามทุกครั้งที่เปิดแอป</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="text-primary font-semibold">•</span>
                <span>PIN จะหมดอายุหลังจากไม่ใช้งาน 30 นาที</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="text-primary font-semibold">•</span>
                <span>ไม่ควรใช้ PIN ที่ง่ายต่อการเดา เช่น 123456 หรือ 000000</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}