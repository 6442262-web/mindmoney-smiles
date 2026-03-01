import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface FavoriteTransaction {
  id: string;
  user_id: string;
  name: string;
  type: string;
  amount: number;
  category_id: string | null;
  description: string | null;
  created_at: string;
}

export function useFavoriteTransactions() {
  const [favorites, setFavorites] = useState<FavoriteTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFavorites = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const { data } = await supabase
      .from('favorite_transactions' as any)
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    setFavorites((data as any as FavoriteTransaction[]) || []);
    setLoading(false);
  };

  const addFavorite = async (fav: Omit<FavoriteTransaction, 'id' | 'user_id' | 'created_at'>) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return null;

    const { data, error } = await supabase
      .from('favorite_transactions' as any)
      .insert({ ...fav, user_id: session.user.id } as any)
      .select()
      .single();

    if (!error && data) {
      setFavorites(prev => [data as any as FavoriteTransaction, ...prev]);
      return data as any as FavoriteTransaction;
    }
    return null;
  };

  const removeFavorite = async (id: string) => {
    await supabase.from('favorite_transactions' as any).delete().eq('id', id);
    setFavorites(prev => prev.filter(f => f.id !== id));
  };

  useEffect(() => {
    loadFavorites();
  }, []);

  return { favorites, loading, addFavorite, removeFavorite, refreshFavorites: loadFavorites };
}
