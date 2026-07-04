import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/getErrorMessage';

interface AdminUserRole {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
}

// Demo mode toggle - set to true for mock data
const DEMO_MODE = true;

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
  userRoles: AdminUserRole[];
  inviteCodes: InviteCode[];
  recentTransactions: unknown[];
}

// Generate mock users data
const generateMockUsers = (): UserDetail[] => {
  const users: UserDetail[] = [];
  
  const now = Date.now();
  
  for (let i = 0; i < 443; i++) {
    const isGuest = i < 279; // First 279 are guests
    
    // Created dates spread across the last few months
    const daysAgo = Math.floor(Math.random() * 120) + 30; // 30-150 days ago
    const createdAt = new Date(now - daysAgo * 24 * 60 * 60 * 1000).toISOString();
    
    // Last sign in spread across last 30 days (relative to now)
    const signInDaysAgo = Math.floor(Math.random() * 30);
    const lastSignIn = new Date(now - signInDaysAgo * 24 * 60 * 60 * 1000).toISOString();
    
    // 95% have 1-2 transactions, 5% have 10-30 transactions
    const isHighActivity = Math.random() < 0.05;
    const transactionCount = isHighActivity 
      ? Math.floor(Math.random() * 21) + 10 // 10-30
      : Math.floor(Math.random() * 2) + 1;   // 1-2
    
    // Money in hundreds only (100-999)
    const totalIncome = Math.floor(Math.random() * 900) + 100;
    const totalExpense = Math.floor(Math.random() * 900) + 100;
    
    users.push({
      id: `mock-user-${i + 1}`,
      email: isGuest ? '' : `user${i + 1}@example.com`,
      full_name: '', // No names for all users
      created_at: createdAt,
      last_sign_in_at: lastSignIn,
      is_anonymous: isGuest,
      transaction_count: transactionCount,
      account_count: 1, // Most have just 1 account
      total_income: totalIncome,
      total_expense: totalExpense,
      role: i === 0 ? 'admin' : i < 5 ? 'developer' : 'user',
      language: Math.random() > 0.3 ? 'th' : 'en',
      theme: Math.random() > 0.5 ? 'light' : 'dark'
    });
  }
  
  return users;
};

// Generate mock feedback - base data (empty, real feedback will be added on top)
const generateMockFeedback = (): Feedback[] => {
  // Base mock feedback is empty - real feedback from database will be added
  return [];
};

// Generate mock data - base stats (feedback starts at 0, real data adds on top)
const generateMockData = (): AdminData => {
  const users = generateMockUsers();
  const feedback = generateMockFeedback();
  
  const guestUsers = users.filter(u => u.is_anonymous).length;
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  const newUsersLast30Days = users.filter(u => new Date(u.created_at) >= thirtyDaysAgo).length;
  const activeUsersLast7Days = users.filter(u => u.last_sign_in_at && new Date(u.last_sign_in_at) >= sevenDaysAgo).length;
  
  return {
    stats: {
      totalUsers: 443,
      newUsersLast30Days,
      activeUsersLast7Days,
      guestUsers: 279,
      totalTransactions: users.reduce((sum, u) => sum + u.transaction_count, 0),
      totalAccounts: users.reduce((sum, u) => sum + u.account_count, 0),
      totalCategories: 156,
      totalIncome: users.reduce((sum, u) => sum + u.total_income, 0),
      totalExpense: users.reduce((sum, u) => sum + u.total_expense, 0),
      pendingFeedback: 0,
      resolvedFeedback: 0,
      totalFeedback: 0,
      adminCount: 1,
      developerCount: 4,
      activeInviteCodes: 3
    },
    users: users.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    feedback: feedback,
    userRoles: [
      { id: '1', user_id: 'mock-user-1', role: 'admin', created_at: new Date().toISOString() },
      { id: '2', user_id: 'mock-user-2', role: 'developer', created_at: new Date().toISOString() },
      { id: '3', user_id: 'mock-user-3', role: 'developer', created_at: new Date().toISOString() },
      { id: '4', user_id: 'mock-user-4', role: 'developer', created_at: new Date().toISOString() },
      { id: '5', user_id: 'mock-user-5', role: 'developer', created_at: new Date().toISOString() },
    ],
    inviteCodes: [
      { id: '1', code: 'DEV-2024-MONEYMIND', role: 'developer', max_uses: 100, current_uses: 47, is_active: true, expires_at: null, created_at: new Date().toISOString() },
      { id: '2', code: 'ADMIN-SPECIAL-2024', role: 'admin', max_uses: 5, current_uses: 1, is_active: true, expires_at: null, created_at: new Date().toISOString() },
      { id: '3', code: 'DEV-PROMO-FEB', role: 'developer', max_uses: 50, current_uses: 12, is_active: true, expires_at: '2026-02-28T23:59:59Z', created_at: new Date().toISOString() },
    ],
    recentTransactions: []
  };
};

export function useAdminStats() {
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Use mock data in demo mode
      if (DEMO_MODE) {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 500));
        setData(generateMockData());
        return;
      }

      const { data: response, error: funcError } = await supabase.functions.invoke('admin-stats');
      
      if (funcError) {
        throw funcError;
      }
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      setData(response);
    } catch (err) {
      console.error('Error fetching admin stats:', err);
      setError(getErrorMessage(err));
      toast({
        title: "ไม่สามารถดึงข้อมูลได้",
        description: getErrorMessage(err),
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
