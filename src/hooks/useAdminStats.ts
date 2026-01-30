import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UserDetail {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
  last_sign_in_at: string | null;
  is_anonymous: boolean;
  transaction_count: number;
  account_count: number;
  total_income: number;
  total_expense: number;
  role: string;
  language: string;
  theme: string;
}

interface Feedback {
  id: string;
  user_id: string;
  type: string;
  subject: string;
  message: string;
  status: string;
  created_at: string;
}

interface InviteCode {
  id: string;
  code: string;
  role: string;
  max_uses: number;
  current_uses: number;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
}

interface AdminStats {
  totalUsers: number;
  newUsersLast30Days: number;
  activeUsersLast7Days: number;
  guestUsers: number;
  totalTransactions: number;
  totalAccounts: number;
  totalCategories: number;
  totalIncome: number;
  totalExpense: number;
  pendingFeedback: number;
  resolvedFeedback: number;
  totalFeedback: number;
  adminCount: number;
  developerCount: number;
  activeInviteCodes: number;
}

interface AdminData {
  stats: AdminStats;
  users: UserDetail[];
  feedback: Feedback[];
  userRoles: any[];
  inviteCodes: InviteCode[];
  recentTransactions: any[];
}

export function useAdminStats() {
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data: response, error: funcError } = await supabase.functions.invoke('admin-stats');
      
      if (funcError) {
        throw funcError;
      }
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      setData(response);
    } catch (err: any) {
      console.error('Error fetching admin stats:', err);
      setError(err.message);
      toast({
        title: "ไม่สามารถดึงข้อมูลได้",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    data,
    loading,
    error,
    fetchStats,
  };
}
