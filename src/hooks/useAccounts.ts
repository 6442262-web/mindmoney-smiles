import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Account {
  id: string;
  user_id: string;
  name: string;
  type?: string;
  balance?: number;
  currency?: string;
  icon?: string | null;
  color?: string | null;
  is_default?: boolean;
  is_active?: boolean;
  budget_limit?: number | null;
  created_at: string;
  updated_at: string;
}

export function useAccounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [currentAccount, setCurrentAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Load accounts
  const loadAccounts = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', session.user.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading accounts:', error);
        return;
      }

      setAccounts(data || []);
      
      // Set current account: try saved, then default, then first
      const savedAccountId = localStorage.getItem('currentAccountId');
      const savedAccount = savedAccountId ? data?.find(acc => acc.id === savedAccountId) : null;
      const defaultAccount = savedAccount || data?.find(acc => acc.is_default) || data?.[0];
      if (defaultAccount) {
        setCurrentAccount(defaultAccount);
      }

      // Create default account if none exist
      if (!data || data.length === 0) {
        await createAccount({
          name: 'บัญชีหลัก',
          color: '#4CAF50',
          budget_limit: 0,
          is_default: true,
        });
      }
    } catch (error) {
      console.error('Error in loadAccounts:', error);
    }
  };

  // Create account
  const createAccount = async (accountData: Omit<Account, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return null;

      // If this is set as default, unset other defaults
      if (accountData.is_default) {
        await supabase
          .from('accounts')
          .update({ is_default: false })
          .eq('user_id', session.user.id);
      }

      const { data, error } = await supabase
        .from('accounts')
        .insert({
          ...accountData,
          user_id: session.user.id,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating account:', error);
        toast({
          title: "เกิดข้อผิดพลาด",
          description: "ไม่สามารถสร้างบัญชีได้",
          variant: "destructive",
        });
        return null;
      }

      setAccounts(prev => [...prev, data]);
      if (accountData.is_default || accounts.length === 0) {
        setCurrentAccount(data);
      }

      toast({
        title: "สร้างบัญชีสำเร็จ",
        description: `บัญชี "${data.name}" ถูกสร้างแล้ว`,
      });

      return data;
    } catch (error) {
      console.error('Error in createAccount:', error);
      return null;
    }
  };

  // Update account
  const updateAccount = async (accountId: string, updates: Partial<Account>) => {
    try {
      // If setting as default, unset other defaults
      if (updates.is_default) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await supabase
            .from('accounts')
            .update({ is_default: false })
            .eq('user_id', session.user.id)
            .neq('id', accountId);
        }
      }

      const { data, error } = await supabase
        .from('accounts')
        .update(updates)
        .eq('id', accountId)
        .select()
        .single();

      if (error) {
        console.error('Error updating account:', error);
        toast({
          title: "เกิดข้อผิดพลาด",
          description: "ไม่สามารถอัพเดทบัญชีได้",
          variant: "destructive",
        });
        return;
      }

      setAccounts(prev => 
        prev.map(acc => acc.id === accountId ? data : acc)
      );

      if (currentAccount?.id === accountId) {
        setCurrentAccount(data);
      }

      toast({
        title: "อัพเดทสำเร็จ",
        description: "ข้อมูลบัญชีได้รับการอัพเดทแล้ว",
      });
    } catch (error) {
      console.error('Error in updateAccount:', error);
    }
  };

  // Delete account
  const deleteAccount = async (accountId: string) => {
    try {
      const { error } = await supabase
        .from('accounts')
        .delete()
        .eq('id', accountId);

      if (error) {
        console.error('Error deleting account:', error);
        toast({
          title: "เกิดข้อผิดพลาด",
          description: "ไม่สามารถลบบัญชีได้",
          variant: "destructive",
        });
        return;
      }

      setAccounts(prev => prev.filter(acc => acc.id !== accountId));
      
      // If deleted account was current, switch to first available
      if (currentAccount?.id === accountId) {
        const remainingAccounts = accounts.filter(acc => acc.id !== accountId);
        setCurrentAccount(remainingAccounts[0] || null);
      }

      toast({
        title: "ลบบัญชีสำเร็จ",
        description: "บัญชีถูกลบแล้ว",
      });
    } catch (error) {
      console.error('Error in deleteAccount:', error);
    }
  };

  // Switch current account
  const switchAccount = (account: Account) => {
    setCurrentAccount(account);
    localStorage.setItem('currentAccountId', account.id);
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await loadAccounts();
      setLoading(false);
    };

    init();

    // Listen for auth state changes to reload data after login
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        loadAccounts();
      } else if (event === 'SIGNED_OUT') {
        setAccounts([]);
        setCurrentAccount(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return {
    accounts,
    currentAccount,
    loading,
    createAccount,
    updateAccount,
    deleteAccount,
    switchAccount,
    refreshAccounts: loadAccounts,
  };
}