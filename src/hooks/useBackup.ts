import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface BackupLog {
  id: string;
  user_id: string;
  backup_type: string;
  file_name?: string | null;
  file_size?: number | null;
  status?: string | null;
  error_message?: string | null;
  created_at: string;
}

export function useBackup() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const createBackup = async (type: 'manual' | 'export' = 'manual') => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const user = session.user;

      // Create backup log entry
      const { data: logEntry, error: logError } = await supabase
        .from('backup_logs')
        .insert({
          user_id: user.id,
          backup_type: type,
          status: 'in_progress'
        })
        .select()
        .single();

      if (logError) {
        console.error('Error creating backup log:', logError);
        throw logError;
      }

      // Get user data for backup
      const [
        { data: accounts },
        { data: transactions },
        { data: categories },
        { data: settings },
        { data: savingsGoals },
        { data: liabilities },
        { data: accountTransfers },
        { data: recurringTransactions },
        { data: investments },
        { data: investmentTransactions }
      ] = await Promise.all([
        supabase.from('accounts').select('*').eq('user_id', user.id),
        supabase.from('transactions').select('*').eq('user_id', user.id),
        supabase.from('categories').select('*').eq('user_id', user.id),
        supabase.from('user_settings').select('*').eq('user_id', user.id),
        supabase.from('savings_goals' as any).select('*').eq('user_id', user.id),
        supabase.from('liabilities').select('*').eq('user_id', user.id),
        supabase.from('account_transfers').select('*').eq('user_id', user.id),
        supabase.from('recurring_transactions').select('*').eq('user_id', user.id),
        supabase.from('investments').select('*').eq('user_id', user.id),
        supabase.from('investment_transactions').select('*').eq('user_id', user.id)
      ]);

      const backupData = {
        user_id: user.id,
        created_at: new Date().toISOString(),
        accounts: accounts || [],
        transactions: transactions || [],
        categories: categories || [],
        settings: settings?.[0] || null,
        savings_goals: savingsGoals || [],
        liabilities: liabilities || [],
        account_transfers: accountTransfers || [],
        recurring_transactions: recurringTransactions || [],
        investments: investments || [],
        investment_transactions: investmentTransactions || []
      };

      const jsonData = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonData], { type: 'application/json' });
      const fileSize = blob.size;
      const fileName = `moneymind-backup-${new Date().toISOString().split('T')[0]}.json`;

      // ทั้ง manual และ export ต้องได้ไฟล์จริง — เดิมโหมด manual ทิ้งข้อมูลแล้วรายงานว่าสำเร็จ
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Update backup log
      await supabase
        .from('backup_logs')
        .update({
          status: 'success',
          file_name: fileName,
          file_size: fileSize
        })
        .eq('id', logEntry.id);

      toast({
        title: "สำรองข้อมูลสำเร็จ",
        description: "ไฟล์ข้อมูลได้ถูกดาวน์โหลดแล้ว",
      });

    } catch (error) {
      console.error('Error creating backup:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถสำรองข้อมูลได้",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportData = () => createBackup('export');

  return {
    loading,
    createBackup,
    exportData,
  };
}