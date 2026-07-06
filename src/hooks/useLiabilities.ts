import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export interface Liability {
  id: string;
  user_id: string;
  name: string;
  type?: string;
  principal_amount: number;
  current_balance: number;
  interest_rate?: number | null;
  monthly_payment?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  creditor?: string | null;
  note?: string | null;
  is_active?: boolean;
  created_at: string;
  updated_at: string;
}

export interface LiabilityPayment {
  id: string;
  liability_id: string;
  amount: number;
  principal_amount?: number | null;
  interest_amount?: number | null;
  payment_date: string;
  note?: string | null;
  created_at: string;
}

export function useLiabilities() {
  const [liabilities, setLiabilities] = useState<Liability[]>([]);
  const [payments, setPayments] = useState<LiabilityPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  // Fetch liabilities
  const fetchLiabilities = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('liabilities')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLiabilities((data || []) as Liability[]);
    } catch (error) {
      // โหลดพื้นหลังพลาดไม่ต้องเด้ง toast แดงใส่ผู้ใช้ — log พอ (toast เฉพาะ action ที่ผู้ใช้กดเอง)
      console.error('Error fetching liabilities:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch liability payments
  const fetchPayments = async (liabilityId?: string) => {
    if (!user) return;
    
    try {
      let query = supabase
        .from('liability_payments')
        .select('*')
        .order('payment_date', { ascending: false });

      if (liabilityId) {
        query = query.eq('liability_id', liabilityId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setPayments(data || []);
    } catch (error) {
      console.error('Error fetching payments:', error);
    }
  };

  // Create liability
  const createLiability = async (liability: Omit<Liability, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('liabilities')
        .insert({
          ...liability,
          user_id: user.id,
        });

      if (error) throw error;

      toast({
        title: "บันทึกสำเร็จ",
        description: "เพิ่มหนี้สินเรียบร้อยแล้ว",
      });

      await fetchLiabilities();
    } catch (error) {
      console.error('Error creating liability:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถบันทึกหนี้สินได้",
        variant: "destructive",
      });
    }
  };

  // Update liability
  const updateLiability = async (id: string, updates: Partial<Liability>) => {
    try {
      const { error } = await supabase
        .from('liabilities')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "อัปเดตสำเร็จ",
        description: "แก้ไขหนี้สินเรียบร้อยแล้ว",
      });

      await fetchLiabilities();
    } catch (error) {
      console.error('Error updating liability:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถแก้ไขหนี้สินได้",
        variant: "destructive",
      });
    }
  };

  // Delete liability
  const deleteLiability = async (id: string) => {
    try {
      const { error } = await supabase
        .from('liabilities')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "ลบสำเร็จ",
        description: "ลบหนี้สินเรียบร้อยแล้ว",
      });

      await fetchLiabilities();
    } catch (error) {
      console.error('Error deleting liability:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถลบหนี้สินได้",
        variant: "destructive",
      });
    }
  };

  // Create payment
  const createPayment = async (payment: Omit<LiabilityPayment, 'id' | 'created_at'>, newBalance?: number) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('liability_payments')
        .insert(payment);

      if (error) throw error;

      // Update liability balance if newBalance is provided
      if (newBalance !== undefined) {
        await updateLiability(payment.liability_id, {
          current_balance: newBalance,
        });
      }

      toast({
        title: "บันทึกการจ่ายสำเร็จ",
        description: "บันทึกการจ่ายหนี้เรียบร้อยแล้ว",
      });

      await fetchPayments();
      await fetchLiabilities();
    } catch (error) {
      console.error('Error creating payment:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถบันทึกการจ่ายได้",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (user) {
      fetchLiabilities();
      fetchPayments();
    }
  }, [user]);

  return {
    liabilities,
    payments,
    loading,
    createLiability,
    updateLiability,
    deleteLiability,
    createPayment,
    fetchPayments,
    refetch: fetchLiabilities,
  };
}