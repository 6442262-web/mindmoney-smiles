import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/getErrorMessage';

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
    } catch (error) {
      console.error('Error in createTransaction:', error);
      const isNetworkError = !navigator.onLine || getErrorMessage(error).includes('fetch');
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

  // Bulk create transactions (e.g. CSV import). Inserts in chunks and refreshes once.
  const createTransactionsBulk = async (
    items: Omit<Transaction, 'id' | 'user_id' | 'created_at' | 'updated_at'>[]
  ): Promise<{ inserted: number; failed: number }> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      toast({
        title: "กรุณาเข้าสู่ระบบ",
        description: "คุณต้องเข้าสู่ระบบก่อนนำเข้ารายการ",
        variant: "destructive",
      });
      return { inserted: 0, failed: items.length };
    }

    const userId = session.user.id;
    const CHUNK = 200;
    let inserted = 0;
    let failed = 0;

    for (let i = 0; i < items.length; i += CHUNK) {
      const chunk = items.slice(i, i + CHUNK).map((item) => ({ ...item, user_id: userId }));
      const { data, error } = await supabase.from('transactions').insert(chunk).select();
      if (error) {
        console.error('Error in bulk insert:', error);
        failed += chunk.length;
      } else {
        inserted += data?.length ?? chunk.length;
      }
    }

    if (inserted > 0) await loadTransactions();
    return { inserted, failed };
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
    } catch (error) {
      console.error('Error in updateTransaction:', error);
      const isNetworkError = !navigator.onLine || getErrorMessage(error).includes('fetch');
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
      const isNetworkError = !navigator.onLine || getErrorMessage(error).includes('fetch');
      toast({
        title: isNetworkError ? "ไม่มีการเชื่อมต่อ" : "เกิดข้อผิดพลาด",
        description: isNetworkError
          ? "กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่"
          : "ไม่สามารถลบรายการได้",
        variant: "destructive",
      });
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
    createTransactionsBulk,
    updateTransaction,
    deleteTransaction,
    refreshTransactions: loadTransactions,
  };
}