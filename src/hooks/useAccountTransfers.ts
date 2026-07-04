import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export interface AccountTransfer {
  id: string;
  user_id: string;
  from_account_id: string;
  to_account_id: string;
  amount: number;
  from_currency?: string | null;
  to_currency?: string | null;
  exchange_rate?: number | null;
  converted_amount?: number | null;
  fee?: number | null;
  description?: string | null;
  transfer_date: string;
  status?: string | null;
  created_at: string;
  from_account?: { name: string; currency: string };
  to_account?: { name: string; currency: string };
}

export function useAccountTransfers() {
  const [transfers, setTransfers] = useState<AccountTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  // Fetch transfers
  const fetchTransfers = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('account_transfers')
        .select(`
          *,
          from_account:accounts!from_account_id(name, currency),
          to_account:accounts!to_account_id(name, currency)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTransfers((data || []) as AccountTransfer[]);
    } catch (error) {
      console.error('Error fetching transfers:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถโหลดข้อมูลการโอนได้",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Create transfer
  const createTransfer = async (transfer: Omit<AccountTransfer, 'id' | 'user_id' | 'created_at'>) => {
    if (!user) return;
    
    try {
      // ถ้าไม่ระบุอัตราแลกเปลี่ยน (โอนสกุลเดียวกัน) ใช้ 1 และกัน NaN จากค่าที่ผิดปกติ
      const rate = transfer.exchange_rate ?? 1;
      const computed = transfer.amount * rate;
      const convertedAmount = Number.isFinite(computed) && computed > 0 ? computed : transfer.amount;

      const { error } = await supabase
        .from('account_transfers')
        .insert({
          ...transfer,
          exchange_rate: rate,
          converted_amount: convertedAmount,
          user_id: user.id,
        });

      if (error) throw error;

      toast({
        title: "โอนเงินสำเร็จ",
        description: "โอนเงินระหว่างบัญชีเรียบร้อยแล้ว",
      });

      await fetchTransfers();
    } catch (error) {
      console.error('Error creating transfer:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถโอนเงินได้",
        variant: "destructive",
      });
    }
  };

  // Update transfer
  const updateTransfer = async (id: string, updates: Partial<AccountTransfer>) => {
    try {
      const { error } = await supabase
        .from('account_transfers')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "อัปเดตสำเร็จ",
        description: "แก้ไขการโอนเรียบร้อยแล้ว",
      });

      await fetchTransfers();
    } catch (error) {
      console.error('Error updating transfer:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถแก้ไขการโอนได้",
        variant: "destructive",
      });
    }
  };

  // Cancel transfer
  const cancelTransfer = async (id: string) => {
    try {
      const { error } = await supabase
        .from('account_transfers')
        .update({ status: 'cancelled' })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "ยกเลิกสำเร็จ",
        description: "ยกเลิกการโอนเรียบร้อยแล้ว",
      });

      await fetchTransfers();
    } catch (error) {
      console.error('Error cancelling transfer:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถยกเลิกการโอนได้",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (user) {
      fetchTransfers();
    }
  }, [user]);

  return {
    transfers,
    loading,
    createTransfer,
    updateTransfer,
    cancelTransfer,
    refetch: fetchTransfers,
  };
}