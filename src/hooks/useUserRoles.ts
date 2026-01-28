import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type AppRole = 'admin' | 'developer' | 'user';

interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

export function useUserRoles() {
  const { user } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isDeveloper, setIsDeveloper] = useState(false);
  const [isAdminOrDeveloper, setIsAdminOrDeveloper] = useState(false);

  useEffect(() => {
    if (!user) {
      setRoles([]);
      setIsAdmin(false);
      setIsDeveloper(false);
      setIsAdminOrDeveloper(false);
      setLoading(false);
      return;
    }

    const fetchRoles = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('*')
          .eq('user_id', user.id);

        if (error) {
          console.error('Error fetching user roles:', error);
          setRoles([]);
        } else {
          const userRoles = (data as UserRole[]).map(r => r.role);
          setRoles(userRoles);
          setIsAdmin(userRoles.includes('admin'));
          setIsDeveloper(userRoles.includes('developer'));
          setIsAdminOrDeveloper(userRoles.includes('admin') || userRoles.includes('developer'));
        }
      } catch (err) {
        console.error('Error fetching user roles:', err);
        setRoles([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRoles();
  }, [user]);

  const hasRole = (role: AppRole): boolean => {
    return roles.includes(role);
  };

  return {
    roles,
    loading,
    isAdmin,
    isDeveloper,
    isAdminOrDeveloper,
    hasRole,
  };
}
