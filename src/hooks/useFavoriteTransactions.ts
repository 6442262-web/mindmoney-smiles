import { useState, useEffect } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

// `favorite_transactions` isn't in the generated DB types yet,
// so access it through an untyped view of the client.
const sb = supabase as unknown as SupabaseClient;

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

    const { data } = await sb
      .from('favorite_transactions')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    setFavorites((data as FavoriteTransaction[]) || []);
    setLoading(false);
  };

  const addFavorite = async (fav: Omit<FavoriteTransaction, 'id' | 'user_id' | 'created_at'>) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return null;

    const { data, error } = await sb
      .from('favorite_transactions')
      .insert({ ...fav, user_id: session.user.id })
      .select()
      .single();

    if (!error && data) {
      setFavorites(prev => [data as FavoriteTransaction, ...prev]);
      return data as FavoriteTransaction;
    }
    return null;
  };

  const removeFavorite = async (id: string) => {
    await sb.from('favorite_transactions').delete().eq('id', id);
    setFavorites(prev => prev.filter(f => f.id !== id));
  };

  useEffect(() => {
    loadFavorites();
  }, []);

  return { favorites, loading, addFavorite, removeFavorite, refreshFavorites: loadFavorites };
}
