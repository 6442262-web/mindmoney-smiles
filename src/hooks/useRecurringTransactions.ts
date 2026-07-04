import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface RecurringTransaction {
  id: string;
  user_id: string;
  account_id?: string | null;
  category_id?: string | null;
  type: string;
  amount: number;
  description?: string | null;
  priority?: number | null;
  frequency: string;
  start_date: string;
  end_date?: string | null;
  next_execution?: string | null;
  last_execution?: string | null;
  is_active?: boolean;
  day_of_month?: number | null;
  day_of_week?: number | null;
  created_at: string;
  updated_at: string;
}

export function useRecurringTransactions() {
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Load recurring transactions
  const loadRecurringTransactions = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data, error } = await supabase
        .from('recurring_transactions')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading recurring transactions:', error);
        return;
      }

      setRecurringTransactions((data as RecurringTransaction[]) || []);
    } catch (error) {
      console.error('Error in loadRecurringTransactions:', error);
    }
  };

  // Create recurring transaction
  const createRecurringTransaction = async (transactionData: Omit<RecurringTransaction, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        toast({
          title: "กรุณาเข้าสู่ระบบ",
          description: "คุณต้องเข้าสู่ระบบก่อนเพิ่มรายการ",
          variant: "destructive",
        });
        return null;
      }

      const { data, error } = await supabase
        .from('recurring_transactions')
        .insert({
          ...transactionData,
          user_id: session.user.id,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating recurring transaction:', error);
        toast({
          title: "เกิดข้อผิดพลาด",
          description: "ไม่สามารถเพิ่มรายการประจำได้",
          variant: "destructive",
        });
        return null;
      }

      setRecurringTransactions(prev => [data as RecurringTransaction, ...prev]);
      toast({
        title: "เพิ่มรายการประจำสำเร็จ",
        description: `รายการ "${data.description}" ถูกเพิ่มแล้ว`,
      });

      return data;
    } catch (error) {
      console.error('Error in createRecurringTransaction:', error);
      return null;
    }
  };

  // Update recurring transaction
  const updateRecurringTransaction = async (transactionId: string, updates: Partial<RecurringTransaction>) => {
    try {
      const { data, error } = await supabase
        .from('recurring_transactions')
        .update(updates)
        .eq('id', transactionId)
        .select()
        .single();

      if (error) {
        console.error('Error updating recurring transaction:', error);
        toast({
          title: "เกิดข้อผิดพลาด",
          description: "ไม่สามารถอัพเดทรายการประจำได้",
          variant: "destructive",
        });
        return;
      }

      setRecurringTransactions(prev => 
        prev.map(transaction => transaction.id === transactionId ? data as RecurringTransaction : transaction)
      );

      toast({
        title: "อัพเดทสำเร็จ",
        description: "รายการประจำได้รับการอัพเดทแล้ว",
      });
    } catch (error) {
      console.error('Error in updateRecurringTransaction:', error);
    }
  };

  // Delete recurring transaction
  const deleteRecurringTransaction = async (transactionId: string) => {
    try {
      const { error } = await supabase
        .from('recurring_transactions')
        .delete()
        .eq('id', transactionId);

      if (error) {
        console.error('Error deleting recurring transaction:', error);
        toast({
          title: "เกิดข้อผิดพลาด",
          description: "ไม่สามารถลบรายการประจำได้",
          variant: "destructive",
        });
        return;
      }

      setRecurringTransactions(prev => prev.filter(transaction => transaction.id !== transactionId));
      toast({
        title: "ลบรายการประจำสำเร็จ",
        description: "รายการประจำถูกลบแล้ว",
      });
    } catch (error) {
      console.error('Error in deleteRecurringTransaction:', error);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await loadRecurringTransactions();
      setLoading(false);
    };

    init();

    // Listen for auth state changes to reload data after login
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        loadRecurringTransactions();
      } else if (event === 'SIGNED_OUT') {
        setRecurringTransactions([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return {
    recurringTransactions,
    loading,
    createRecurringTransaction,
    updateRecurringTransaction,
    deleteRecurringTransaction,
    refreshRecurringTransactions: loadRecurringTransactions,
  };
}