import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Investment {
  id: string;
  user_id: string;
  name: string;
  symbol: string | null;
  asset_type: string;
  quantity: number;
  avg_cost: number;
  current_price: number;
  currency: string;
  note: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InvestmentTransaction {
  id: string;
  user_id: string;
  investment_id: string | null;
  transaction_type: string;
  quantity: number;
  price_per_unit: number;
  total_amount: number;
  fee: number;
  tax: number;
  date: string;
  note: string | null;
  created_at: string;
}

export function useInvestments() {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [transactions, setTransactions] = useState<InvestmentTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const fetchInvestments = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    try {
      const [invRes, txnRes] = await Promise.all([
        supabase.from('investments').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }),
        supabase.from('investment_transactions').select('*').eq('user_id', session.user.id).order('date', { ascending: false }),
      ]);

      if (invRes.error) throw invRes.error;
      if (txnRes.error) throw txnRes.error;

      if (mountedRef.current) {
        setInvestments((invRes.data || []) as Investment[]);
        setTransactions((txnRes.data || []) as InvestmentTransaction[]);
      }
    } catch (error) {
      console.error('Error fetching investments:', error);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  const createInvestment = async (inv: Omit<Investment, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const { error } = await supabase.from('investments').insert({ ...inv, user_id: session.user.id });
    if (error) {
      toast({ title: 'เกิดข้อผิดพลาด', description: 'ไม่สามารถเพิ่มสินทรัพย์ได้', variant: 'destructive' });
      return;
    }
    toast({ title: 'สำเร็จ', description: 'เพิ่มสินทรัพย์เรียบร้อย' });
    await fetchInvestments();
  };

  const updateInvestment = async (id: string, updates: Partial<Investment>) => {
    const { error } = await supabase.from('investments').update(updates).eq('id', id);
    if (error) {
      toast({ title: 'เกิดข้อผิดพลาด', description: 'ไม่สามารถแก้ไขสินทรัพย์ได้', variant: 'destructive' });
      return;
    }
    toast({ title: 'สำเร็จ', description: 'แก้ไขสินทรัพย์เรียบร้อย' });
    await fetchInvestments();
  };

  const deleteInvestment = async (id: string) => {
    const { error } = await supabase.from('investments').delete().eq('id', id);
    if (error) {
      toast({ title: 'เกิดข้อผิดพลาด', description: 'ไม่สามารถลบสินทรัพย์ได้', variant: 'destructive' });
      return;
    }
    toast({ title: 'สำเร็จ', description: 'ลบสินทรัพย์เรียบร้อย' });
    await fetchInvestments();
  };

  const createInvestmentTransaction = async (txn: Omit<InvestmentTransaction, 'id' | 'user_id' | 'created_at'>) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const { error } = await supabase.from('investment_transactions').insert({ ...txn, user_id: session.user.id });
    if (error) {
      toast({ title: 'เกิดข้อผิดพลาด', description: 'ไม่สามารถบันทึกรายการได้', variant: 'destructive' });
      return;
    }

    // Update investment quantity and avg_cost
    if (txn.investment_id) {
      // Fetch latest investment data to avoid stale state
      const { data: invData } = await supabase.from('investments').select('*').eq('id', txn.investment_id).single();
      if (invData) {
        let newQty = invData.quantity;
        let newAvgCost = invData.avg_cost;

        if (txn.transaction_type === 'buy') {
          const totalCost = invData.avg_cost * invData.quantity + txn.total_amount;
          newQty = invData.quantity + txn.quantity;
          newAvgCost = newQty > 0 ? totalCost / newQty : 0;
        } else if (txn.transaction_type === 'sell') {
          newQty = invData.quantity - txn.quantity;
        }

        await supabase.from('investments').update({
          quantity: Math.max(0, newQty),
          avg_cost: newAvgCost,
          current_price: txn.price_per_unit,
        }).eq('id', txn.investment_id);
      }
    }

    toast({ title: 'สำเร็จ', description: `บันทึกรายการ${txn.transaction_type === 'buy' ? 'ซื้อ' : txn.transaction_type === 'sell' ? 'ขาย' : 'เงินปันผล'}เรียบร้อย` });
    await fetchInvestments();
  };

  const deleteInvestmentTransaction = async (id: string) => {
    const { error } = await supabase.from('investment_transactions').delete().eq('id', id);
    if (error) {
      toast({ title: 'เกิดข้อผิดพลาด', variant: 'destructive' });
      return;
    }
    toast({ title: 'ลบรายการเรียบร้อย' });
    await fetchInvestments();
  };

  useEffect(() => {
    fetchInvestments();
  }, [fetchInvestments]);

  // Portfolio calculations — memoized to avoid recalculating on every render
  const { totalInvested, totalCurrentValue, totalPnL, totalPnLPercent, totalDividends } = useMemo(() => {
    let totalInvested = 0;
    let totalCurrentValue = 0;
    for (const inv of investments) {
      const qty = inv.quantity || 0;
      totalInvested += (inv.avg_cost || 0) * qty;
      totalCurrentValue += ((inv.current_price || inv.avg_cost) || 0) * qty;
    }
    const totalPnL = totalCurrentValue - totalInvested;
    const totalPnLPercent = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;
    const totalDividends = transactions
      .filter(t => t.transaction_type === 'dividend' || t.transaction_type === 'interest')
      .reduce((sum, t) => sum + t.total_amount, 0);
    return { totalInvested, totalCurrentValue, totalPnL, totalPnLPercent, totalDividends };
  }, [investments, transactions]);

  return {
    investments,
    transactions,
    loading,
    createInvestment,
    updateInvestment,
    deleteInvestment,
    createInvestmentTransaction,
    deleteInvestmentTransaction,
    refetch: fetchInvestments,
    totalInvested,
    totalCurrentValue,
    totalPnL,
    totalPnLPercent,
    totalDividends,
  };
}
