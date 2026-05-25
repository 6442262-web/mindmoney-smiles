import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export interface BusinessTransaction {
  id: string;
  user_id: string;
  account_id?: string | null;
  category_id?: string | null;
  type: string;
  amount: number;
  description?: string | null;
  note?: string | null;
  date: string;
  is_business?: boolean;
  project_id?: string | null;
  recurring_id?: string | null;
  tax_amount?: number | null;
  currency?: string | null;
  exchange_rate?: number | null;
  created_at: string;
  updated_at: string;
}

export function useBusinessTransactions() {
  const [transactions, setTransactions] = useState<BusinessTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  // Fetch transactions
  const fetchTransactions = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;
      setTransactions((data || []) as BusinessTransaction[]);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถโหลดรายการธุรกรรมได้",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Create transaction
  const createTransaction = async (transaction: Omit<BusinessTransaction, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('transactions')
        .insert({
          ...transaction,
          user_id: user.id,
        });

      if (error) throw error;

      toast({
        title: "บันทึกสำเร็จ",
        description: `เพิ่มรายการ${transaction.type === 'income' ? 'รายรับ' : 'รายจ่าย'}เรียบร้อยแล้ว`,
      });

      await fetchTransactions();
    } catch (error) {
      console.error('Error creating transaction:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถบันทึกรายการได้",
        variant: "destructive",
      });
    }
  };

  // Update transaction
  const updateTransaction = async (id: string, updates: Partial<BusinessTransaction>) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "อัปเดตสำเร็จ",
        description: "แก้ไขรายการเรียบร้อยแล้ว",
      });

      await fetchTransactions();
    } catch (error) {
      console.error('Error updating transaction:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถแก้ไขรายการได้",
        variant: "destructive",
      });
    }
  };

  // Delete transaction
  const deleteTransaction = async (id: string) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "ลบสำเร็จ",
        description: "ลบรายการเรียบร้อยแล้ว",
      });

      await fetchTransactions();
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถลบรายการได้",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (user) {
      fetchTransactions();
    }
  }, [user]);

  return {
    transactions,
    loading,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    refetch: fetchTransactions,
  };
}