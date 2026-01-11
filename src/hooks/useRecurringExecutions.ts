import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface RecurringExecution {
  id: string;
  recurring_id: string;
  transaction_id?: string | null;
  execution_date: string;
  status?: string | null;
  error_message?: string | null;
  created_at: string;
}

export function useRecurringExecutions(recurringId?: string) {
  const [executions, setExecutions] = useState<RecurringExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Load executions
  const loadExecutions = async () => {
    try {
      let query = supabase
        .from('recurring_executions')
        .select('*')
        .order('execution_date', { ascending: false });

      if (recurringId) {
        query = query.eq('recurring_id', recurringId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error loading executions:', error);
        return;
      }

      setExecutions(data || []);
    } catch (error) {
      console.error('Error in loadExecutions:', error);
    }
  };

  // Create execution record
  const createExecution = async (executionData: Omit<RecurringExecution, 'id' | 'created_at'>) => {
    try {
      const { data, error } = await supabase
        .from('recurring_executions')
        .insert(executionData)
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

      setExecutions(prev => [data, ...prev]);
      return data;
    } catch (error) {
      console.error('Error in createExecution:', error);
      return null;
    }
  };

  // Delete execution record
  const deleteExecution = async (id: string) => {
    try {
      const { error } = await supabase
        .from('recurring_executions')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting execution:', error);
        toast({
          title: "เกิดข้อผิดพลาด",
          description: "ไม่สามารถลบประวัติได้",
          variant: "destructive",
        });
        return false;
      }

      setExecutions(prev => prev.filter(e => e.id !== id));
      toast({
        title: "สำเร็จ",
        description: "ลบประวัติเรียบร้อยแล้ว",
      });
      return true;
    } catch (error) {
      console.error('Error in deleteExecution:', error);
      return false;
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await loadExecutions();
      setLoading(false);
    };

    init();
  }, [recurringId]);

  return {
    executions,
    loading,
    createExecution,
    deleteExecution,
    refreshExecutions: loadExecutions,
  };
}
