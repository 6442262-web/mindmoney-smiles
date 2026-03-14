import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Transaction {
  id: string;
  user_id: string;
  account_id?: string | null;
  category_id?: string | null;
  type: string;
  amount: number;
  description?: string | null;
  note?: string | null;
  date: string;
  time?: string | null;
  is_business?: boolean;
  project_id?: string | null;
  recurring_id?: string | null;
  tax_amount?: number | null;
  currency?: string | null;
  exchange_rate?: number | null;
  created_at: string;
  updated_at: string;
}

export function useTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Load transactions
  const loadTransactions = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', session.user.id)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading transactions:', error);
        return;
      }

      setTransactions((data as Transaction[]) || []);
    } catch (error) {
      console.error('Error in loadTransactions:', error);
    }
  };

  // Create transaction
  const createTransaction = async (transactionData: Omit<Transaction, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
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
        .from('transactions')
        .insert({
          ...transactionData,
          user_id: session.user.id,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating transaction:', error);
        toast({
          title: "เกิดข้อผิดพลาด",
          description: "ไม่สามารถเพิ่มรายการได้",
          variant: "destructive",
        });
        return null;
      }

      setTransactions(prev => [data as Transaction, ...prev]);
      toast({
        title: "เพิ่มรายการสำเร็จ",
        description: `รายการ "${data.description}" ถูกเพิ่มแล้ว`,
      });

      return data;
    } catch (error: any) {
      console.error('Error in createTransaction:', error);
      const isNetworkError = !navigator.onLine || error?.message?.includes('fetch');
      toast({
        title: isNetworkError ? "ไม่มีการเชื่อมต่อ" : "เกิดข้อผิดพลาด",
        description: isNetworkError 
          ? "กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่" 
          : "ไม่สามารถเพิ่มรายการได้",
        variant: "destructive",
      });
      return null;
    }
  };

  // Update transaction
  const updateTransaction = async (transactionId: string, updates: Partial<Transaction>) => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .update(updates)
        .eq('id', transactionId)
        .select()
        .single();

      if (error) {
        console.error('Error updating transaction:', error);
        toast({
          title: "เกิดข้อผิดพลาด",
          description: "ไม่สามารถอัพเดทรายการได้",
          variant: "destructive",
        });
        return;
      }

      setTransactions(prev => 
        prev.map(transaction => transaction.id === transactionId ? data as Transaction : transaction)
      );

      toast({
        title: "อัพเดทสำเร็จ",
        description: "รายการได้รับการอัพเดทแล้ว",
      });
    } catch (error: any) {
      console.error('Error in updateTransaction:', error);
      const isNetworkError = !navigator.onLine || error?.message?.includes('fetch');
      toast({
        title: isNetworkError ? "ไม่มีการเชื่อมต่อ" : "เกิดข้อผิดพลาด",
        description: isNetworkError
          ? "กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่"
          : "ไม่สามารถอัพเดทรายการได้",
        variant: "destructive",
      });
    }
  };

  // Delete transaction
  const deleteTransaction = async (transactionId: string) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', transactionId);

      if (error) {
        console.error('Error deleting transaction:', error);
        toast({
          title: "เกิดข้อผิดพลาด",
          description: "ไม่สามารถลบรายการได้",
          variant: "destructive",
        });
        return;
      }

      setTransactions(prev => prev.filter(transaction => transaction.id !== transactionId));
      toast({
        title: "ลบรายการสำเร็จ",
        description: "รายการถูกลบแล้ว",
      });
    } catch (error) {
      console.error('Error in deleteTransaction:', error);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await loadTransactions();
      setLoading(false);
    };

    init();

    // Listen for auth state changes to reload data after login
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        loadTransactions();
      } else if (event === 'SIGNED_OUT') {
        setTransactions([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return {
    transactions,
    loading,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    refreshTransactions: loadTransactions,
  };
}