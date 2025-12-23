import { useState } from 'react';
import { useUserSettings } from './useUserSettings';
import { useToast } from '@/hooks/use-toast';
import { hashPin, verifyPin, storePinSession, clearPinSession } from '@/lib/pinUtils';

export function usePin() {
  const [loading, setLoading] = useState(false);
  const { settings, updateSettings } = useUserSettings();
  const { toast } = useToast();

  const setupPin = async (pin: string) => {
    setLoading(true);
    try {
      const pinHash = await hashPin(pin);
      await updateSettings({
        pin_enabled: true,
        pin_hash: pinHash
      });
      
      storePinSession();
      
      toast({
        title: "PIN ตั้งค่าสำเร็จ",
        description: "PIN ของคุณได้ถูกตั้งค่าเรียบร้อยแล้ว",
      });
      
      return true;
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถตั้งค่า PIN ได้",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const verifyUserPin = async (pin: string): Promise<boolean> => {
    if (!settings?.pin_hash) return false;
    
    setLoading(true);
    try {
      const isValid = await verifyPin(pin, settings.pin_hash);
      
      if (isValid) {
        storePinSession();
        toast({
          title: "ยืนยัน PIN สำเร็จ",
          description: "เข้าสู่แอปพลิเคชันสำเร็จ",
        });
      } else {
        toast({
          title: "PIN ไม่ถูกต้อง",
          description: "กรุณาตรวจสอบ PIN และลองอีกครั้ง",
          variant: "destructive",
        });
      }
      
      return isValid;
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถยืนยัน PIN ได้",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const changePin = async (oldPin: string, newPin: string): Promise<boolean> => {
    if (!settings?.pin_hash) return false;
    
    setLoading(true);
    try {
      // Verify old PIN first
      const isOldPinValid = await verifyPin(oldPin, settings.pin_hash);
      if (!isOldPinValid) {
        toast({
          title: "PIN เดิมไม่ถูกต้อง",
          description: "กรุณาตรวจสอบ PIN เดิมและลองอีกครั้ง",
          variant: "destructive",
        });
        return false;
      }
      
      // Set new PIN
      const newPinHash = await hashPin(newPin);
      await updateSettings({
        pin_hash: newPinHash
      });
      
      toast({
        title: "เปลี่ยน PIN สำเร็จ",
        description: "PIN ใหม่ของคุณได้ถูกบันทึกเรียบร้อยแล้ว",
      });
      
      return true;
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถเปลี่ยน PIN ได้",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const disablePin = async () => {
    setLoading(true);
    try {
      await updateSettings({
        pin_enabled: false,
        pin_hash: null
      });
      
      clearPinSession();
      
      toast({
        title: "ปิด PIN สำเร็จ",
        description: "ระบบ PIN ถูกปิดใช้งานแล้ว",
      });
      
      return true;
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถปิด PIN ได้",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const resetPin = async (newPin: string): Promise<boolean> => {
    setLoading(true);
    try {
      const newPinHash = await hashPin(newPin);
      await updateSettings({
        pin_enabled: true,
        pin_hash: newPinHash
      });
      
      storePinSession();
      
      toast({
        title: "รีเซ็ต PIN สำเร็จ",
        description: "PIN ใหม่ของคุณได้ถูกตั้งค่าเรียบร้อยแล้ว",
      });
      
      return true;
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถรีเซ็ต PIN ได้",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    setupPin,
    verifyUserPin,
    changePin,
    disablePin,
    resetPin,
    isPinEnabled: settings?.pin_enabled || false,
    hasPin: !!(settings?.pin_hash)
  };
}