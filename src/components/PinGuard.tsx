import React, { ReactNode, useEffect, useState } from 'react';
import { usePin } from '@/hooks/usePin';
import { useUserSettings } from '@/hooks/useUserSettings';
import { isPinSessionValid, clearPinSession } from '@/lib/pinUtils';
import { PinEntry } from './PinEntry';
import { PinSetup } from './PinSetup';
import { PinReset } from './screens/PinReset';

interface PinGuardProps {
  children: ReactNode;
}

export function PinGuard({ children }: PinGuardProps) {
  const [pinVerified, setPinVerified] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [loading, setLoading] = useState(true);
  const { verifyUserPin, isPinEnabled, hasPin } = usePin();
  const { settings, loading: settingsLoading } = useUserSettings();

  useEffect(() => {
    const checkPinStatus = () => {
      // If PIN is not enabled, allow access
      if (!isPinEnabled) {
        setPinVerified(true);
        setLoading(false);
        return;
      }

      // If PIN is enabled but no PIN hash exists, show setup
      if (isPinEnabled && !hasPin) {
        setShowSetup(true);
        setLoading(false);
        return;
      }

      // If PIN session is valid, allow access
      if (isPinSessionValid()) {
        setPinVerified(true);
        setLoading(false);
        return;
      }

      // Otherwise, require PIN entry
      setLoading(false);
    };

    // เดิมรอ `settings` ซึ่งเป็น null ตลอดถ้าโหลด user_settings พลาด → จอหมุนค้างตลอดกาล
    // เปลี่ยนเป็นรอแค่ "โหลดเสร็จ" — โหลดพลาด (settings null) ถือว่า PIN ปิด ปล่อยเข้าแอป
    if (!settingsLoading) {
      checkPinStatus();
    }
  }, [settings, settingsLoading, isPinEnabled, hasPin]);

  // failsafe: ไม่ว่าอะไรจะเกิดขึ้น อย่าหมุนค้างเกิน 7 วินาที
  useEffect(() => {
    const failsafe = setTimeout(() => {
      setLoading(prev => {
        if (prev && !isPinEnabled) setPinVerified(true);
        return false;
      });
    }, 7000);
    return () => clearTimeout(failsafe);
  }, [isPinEnabled]);

  // Listen for app visibility change to re-check PIN session
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isPinEnabled && hasPin) {
        if (!isPinSessionValid()) {
          setPinVerified(false);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isPinEnabled, hasPin]);

  const handlePinVerification = async (pin: string): Promise<boolean> => {
    const success = await verifyUserPin(pin);
    if (success) {
      setPinVerified(true);
    }
    return success;
  };

  const handleSetupComplete = () => {
    setShowSetup(false);
    setPinVerified(true);
  };

  const handleSetupCancel = () => {
    setShowSetup(false);
    setPinVerified(true);
  };

  const handleForgotPin = () => {
    setShowReset(true);
  };

  const handleResetBack = () => {
    setShowReset(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (showSetup) {
    return (
      <PinSetup 
        onComplete={handleSetupComplete}
        onCancel={handleSetupCancel}
      />
    );
  }

  if (showReset) {
    return (
      <PinReset onBack={handleResetBack} />
    );
  }

  if (isPinEnabled && hasPin && !pinVerified) {
    return (
      <PinEntry
        title="ป้อน PIN"
        subtitle="ป้อน PIN เพื่อเข้าใช้แอปพลิเคชัน"
        onPinSubmit={handlePinVerification}
        showForgotPin={true}
        onForgotPin={handleForgotPin}
      />
    );
  }

  return <>{children}</>;
}
