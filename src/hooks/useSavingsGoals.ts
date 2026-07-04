import { useState, useEffect } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// `savings_goals` isn't in the generated DB types yet,
// so access it through an untyped view of the client.
const sb = supabase as unknown as SupabaseClient;

export interface SavingsGoal {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  icon: string;
  color: string;
  deadline: string | null;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
}

export function useSavingsGoals() {
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadGoals = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data, error } = await sb
        .from('savings_goals')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading savings goals:', error);
        return;
      }
      setGoals((data as SavingsGoal[]) || []);
    } catch (error) {
      console.error('Error in loadGoals:', error);
    }
  };

  const createGoal = async (goalData: { name: string; target_amount: number; icon?: string; color?: string; deadline?: string | null }) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return null;

      const { data, error } = await sb
        .from('savings_goals')
        .insert({ ...goalData, user_id: session.user.id })
        .select()
        .single();

      if (error) {
        toast({ title: "เกิดข้อผิดพลาด", description: "ไม่สามารถสร้างเป้าหมายได้", variant: "destructive" });
        return null;
      }
      setGoals(prev => [data as SavingsGoal, ...prev]);
      toast({ title: "สร้างเป้าหมายสำเร็จ", description: `"${goalData.name}" ถูกเพิ่มแล้ว` });
      return data;
    } catch (error) {
      console.error('Error creating goal:', error);
      return null;
    }
  };

  const updateGoal = async (id: string, updates: Partial<SavingsGoal>): Promise<boolean> => {
    try {
      const { data, error } = await sb
        .from('savings_goals')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        toast({ title: "เกิดข้อผิดพลาด", description: "ไม่สามารถอัพเดทเป้าหมายได้", variant: "destructive" });
        return false;
      }
      setGoals(prev => prev.map(g => g.id === id ? (data as SavingsGoal) : g));
      return true;
    } catch (error) {
      console.error('Error updating goal:', error);
      return false;
    }
  };

  const addAmount = async (id: string, amount: number) => {
    const goal = goals.find(g => g.id === id);
    if (!goal) return;

    // อ่านยอดล่าสุดจาก DB ก่อนบวก กันกดซ้ำเร็ว ๆ แล้วยอดหาย (lost update จาก state เก่า)
    let baseAmount = goal.current_amount;
    const { data: fresh } = await supabase
      .from('savings_goals' as any)
      .select('current_amount')
      .eq('id', id)
      .single();
    if (fresh && typeof (fresh as any).current_amount === 'number') {
      baseAmount = (fresh as any).current_amount;
    }

    const newAmount = baseAmount + amount;
    const isCompleted = newAmount >= goal.target_amount;
    const success = await updateGoal(id, { current_amount: newAmount, is_completed: isCompleted });
    if (success && isCompleted) {
      toast({ title: "🎉 ยินดีด้วย!", description: `คุณบรรลุเป้าหมาย "${goal.name}" แล้ว!` });
    }
  };

  const deleteGoal = async (id: string) => {
    try {
      const { error } = await sb
        .from('savings_goals')
        .delete()
        .eq('id', id);

      if (error) {
        toast({ title: "เกิดข้อผิดพลาด", description: "ไม่สามารถลบเป้าหมายได้", variant: "destructive" });
        return;
      }
      setGoals(prev => prev.filter(g => g.id !== id));
      toast({ title: "ลบเป้าหมายสำเร็จ" });
    } catch (error) {
      console.error('Error deleting goal:', error);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await loadGoals();
      setLoading(false);
    };
    init();
  }, []);

  return { goals, loading, createGoal, updateGoal, addAmount, deleteGoal, refreshGoals: loadGoals };
}
