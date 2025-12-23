import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface RecurringExecution {
  id: string;
  recurring_transaction_id: string;
  user_id: string;
  transaction_id?: string;
  execution_date: string;
  amount: number;
  status: 'completed' | 'pending' | 'failed';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export function useRecurringExecutions(recurringTransactionId?: string) {
  const [executions, setExecutions] = useState<RecurringExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Load executions
  const loadExecutions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from('recurring_transaction_executions')
        .select('*')
        .eq('user_id', user.id)
        .order('execution_date', { ascending: false });

      if (recurringTransactionId) {
        query = query.eq('recurring_transaction_id', recurringTransactionId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error loading executions:', error);
        return;
      }

      setExecutions((data as RecurringExecution[]) || []);
    } catch (error) {
      console.error('Error in loadExecutions:', error);
    }
  };

  // Create execution record
  const createExecution = async (executionData: Omit<RecurringExecution, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "กรุณาเข้าสู่ระบบ",
          description: "คุณต้องเข้าสู่ระบบก่อนบันทึกประวัติ",
          variant: "destructive",
        });
        return null;
      }

      const { data, error } = await supabase
        .from('recurring_transaction_executions')
        .insert({
          ...executionData,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating execution:', error);
        toast({
          title: "เกิดข้อผิดพลาด",
          description: "ไม่สามารถบันทึกประวัติได้",
          variant: "destructive",
        });
        return null;
      }

      setExecutions(prev => [data as RecurringExecution, ...prev]);
      toast({
        title: "บันทึกประวัติสำเร็จ",
        description: "ประวัติการเกิดรายการถูกบันทึกแล้ว",
      });

      return data;
    } catch (error) {
      console.error('Error in createExecution:', error);
      return null;
    }
  };

  // Update execution
  const updateExecution = async (executionId: string, updates: Partial<RecurringExecution>) => {
    try {
      const { data, error } = await supabase
        .from('recurring_transaction_executions')
        .update(updates)
        .eq('id', executionId)
        .select()
        .single();

      if (error) {
        console.error('Error updating execution:', error);
        toast({
          title: "เกิดข้อผิดพลาด",
          description: "ไม่สามารถอัพเดทประวัติได้",
          variant: "destructive",
        });
        return;
      }

      setExecutions(prev => 
        prev.map(execution => execution.id === executionId ? data as RecurringExecution : execution)
      );

      toast({
        title: "อัพเดทสำเร็จ",
        description: "ประวัติได้รับการอัพเดทแล้ว",
      });
    } catch (error) {
      console.error('Error in updateExecution:', error);
    }
  };

  // Delete execution
  const deleteExecution = async (executionId: string) => {
    try {
      const { error } = await supabase
        .from('recurring_transaction_executions')
        .delete()
        .eq('id', executionId);

      if (error) {
        console.error('Error deleting execution:', error);
        toast({
          title: "เกิดข้อผิดพลาด",
          description: "ไม่สามารถลบประวัติได้",
          variant: "destructive",
        });
        return;
      }

      setExecutions(prev => prev.filter(execution => execution.id !== executionId));
      toast({
        title: "ลบประวัติสำเร็จ",
        description: "ประวัติถูกลบแล้ว",
      });
    } catch (error) {
      console.error('Error in deleteExecution:', error);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await loadExecutions();
      setLoading(false);
    };

    init();
  }, [recurringTransactionId]);

  return {
    executions,
    loading,
    createExecution,
    updateExecution,
    deleteExecution,
    refreshExecutions: loadExecutions,
  };
}
