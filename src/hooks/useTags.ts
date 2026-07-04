import { useState, useEffect } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

// `transaction_tags`/`transaction_tag_links` aren't in the generated DB types yet,
// so access them through an untyped view of the client.
const sb = supabase as unknown as SupabaseClient;

export interface Tag {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
}

export function useTags() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTags = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const { data } = await sb
      .from('transaction_tags')
      .select('*')
      .eq('user_id', session.user.id)
      .order('name');

    setTags((data as Tag[]) || []);
    setLoading(false);
  };

  const createTag = async (name: string, color: string = '#6366f1') => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return null;

    const { data, error } = await sb
      .from('transaction_tags')
      .insert({ user_id: session.user.id, name, color })
      .select()
      .single();

    if (!error && data) {
      setTags(prev => [...prev, data as Tag]);
      return data as Tag;
    }
    return null;
  };

  const deleteTag = async (tagId: string) => {
    await sb.from('transaction_tags').delete().eq('id', tagId);
    setTags(prev => prev.filter(t => t.id !== tagId));
  };

  const addTagToTransaction = async (transactionId: string, tagId: string) => {
    await sb.from('transaction_tag_links').insert({ transaction_id: transactionId, tag_id: tagId });
  };

  const removeTagFromTransaction = async (transactionId: string, tagId: string) => {
    await sb.from('transaction_tag_links').delete().eq('transaction_id', transactionId).eq('tag_id', tagId);
  };

  const getTagsForTransaction = async (transactionId: string): Promise<Tag[]> => {
    const { data } = await sb
      .from('transaction_tag_links')
      .select('tag_id')
      .eq('transaction_id', transactionId);

    if (!data || data.length === 0) return [];
    const tagIds = (data as { tag_id: string }[]).map(d => d.tag_id);
    return tags.filter(t => tagIds.includes(t.id));
  };

  useEffect(() => {
    loadTags();
  }, []);

  return { tags, loading, createTag, deleteTag, addTagToTransaction, removeTagFromTransaction, getTagsForTransaction, refreshTags: loadTags };
}
