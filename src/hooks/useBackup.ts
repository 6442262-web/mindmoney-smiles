import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface BackupLog {
  id: string;
  user_id: string;
  backup_type: 'auto' | 'manual' | 'export';
  status: 'success' | 'failed' | 'in_progress';
  file_size?: number;
  file_url?: string;
  error_message?: string;
  created_at: string;
}

export function useBackup() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const createBackup = async (type: 'manual' | 'export' = 'manual') => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

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

      // Simulate backup process (in real app, this would call an edge function)
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Get user data for backup
      const [
        { data: accounts },
        { data: transactions },
        { data: categories },
        { data: settings }
      ] = await Promise.all([
        supabase.from('accounts').select('*').eq('user_id', user.id),
        supabase.from('transactions').select('*').eq('user_id', user.id),
        supabase.from('categories').select('*').eq('user_id', user.id),
        supabase.from('user_settings').select('*').eq('user_id', user.id)
      ]);

      const backupData = {
        user_id: user.id,
        created_at: new Date().toISOString(),
        accounts: accounts || [],
        transactions: transactions || [],
        categories: categories || [],
        settings: settings?.[0] || null
      };

      const jsonData = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonData], { type: 'application/json' });
      const fileSize = blob.size;

      if (type === 'export') {
        // Download file for export
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `moneymind-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }

      // Update backup log
      await supabase
        .from('backup_logs')
        .update({
          status: 'success',
          file_size: fileSize
        })
        .eq('id', logEntry.id);

      toast({
        title: "สำรองข้อมูลสำเร็จ",
        description: type === 'export' 
          ? "ไฟล์ข้อมูลได้ถูกดาวน์โหลดแล้ว" 
          : "ข้อมูลได้รับการสำรองแล้ว",
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