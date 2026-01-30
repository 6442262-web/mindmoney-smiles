import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

interface RedeemResult {
  success: boolean;
  error?: string;
  role?: string;
}

export function useInviteCode() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const redeemCode = async (code: string): Promise<RedeemResult> => {
    if (!code.trim()) {
      toast({
        title: "กรุณากรอกรหัส",
        description: "โปรดกรอกรหัสเชิญ",
        variant: "destructive",
      });
      return { success: false, error: "กรุณากรอกรหัส" };
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('redeem_invite_code', {
        p_code: code.trim().toUpperCase()
      });

      if (error) {
        console.error('Error redeeming invite code:', error);
        toast({
          title: "ไม่สามารถใช้รหัสได้",
          description: error.message,
          variant: "destructive",
        });
        return { success: false, error: error.message };
      }

      const result = data as unknown as RedeemResult;
      
      if (result.success) {
        toast({
          title: "สำเร็จ! 🎉",
          description: `คุณได้รับ role: ${result.role}`,
        });
        // Invalidate user roles query to refresh the UI
        queryClient.invalidateQueries({ queryKey: ['userRoles'] });
        return result;
      } else {
        toast({
          title: "ไม่สามารถใช้รหัสได้",
          description: result.error,
          variant: "destructive",
        });
        return result;
      }
    } catch (err) {
      console.error('Error redeeming invite code:', err);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถใช้รหัสได้ กรุณาลองใหม่อีกครั้ง",
        variant: "destructive",
      });
      return { success: false, error: "เกิดข้อผิดพลาด" };
    } finally {
      setLoading(false);
    }
  };

  return {
    redeemCode,
    loading,
  };
}
