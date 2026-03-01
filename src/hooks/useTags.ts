import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

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

    const { data } = await supabase
      .from('transaction_tags' as any)
      .select('*')
      .eq('user_id', session.user.id)
      .order('name');

    setTags((data as any as Tag[]) || []);
    setLoading(false);
  };

  const createTag = async (name: string, color: string = '#6366f1') => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return null;

    const { data, error } = await supabase
      .from('transaction_tags' as any)
      .insert({ user_id: session.user.id, name, color } as any)
      .select()
      .single();

    if (!error && data) {
      setTags(prev => [...prev, data as any as Tag]);
      return data as any as Tag;
    }
    return null;
  };

  const deleteTag = async (tagId: string) => {
    await supabase.from('transaction_tags' as any).delete().eq('id', tagId);
    setTags(prev => prev.filter(t => t.id !== tagId));
  };

  const addTagToTransaction = async (transactionId: string, tagId: string) => {
    await supabase.from('transaction_tag_links' as any).insert({ transaction_id: transactionId, tag_id: tagId } as any);
  };

  const removeTagFromTransaction = async (transactionId: string, tagId: string) => {
    await supabase.from('transaction_tag_links' as any).delete().eq('transaction_id', transactionId).eq('tag_id', tagId);
  };

  const getTagsForTransaction = async (transactionId: string): Promise<Tag[]> => {
    const { data } = await supabase
      .from('transaction_tag_links' as any)
      .select('tag_id')
      .eq('transaction_id', transactionId);

    if (!data || data.length === 0) return [];
    const tagIds = (data as any[]).map(d => d.tag_id);
    return tags.filter(t => tagIds.includes(t.id));
  };

  useEffect(() => {
    loadTags();
  }, []);

  return { tags, loading, createTag, deleteTag, addTagToTransaction, removeTagFromTransaction, getTagsForTransaction, refreshTags: loadTags };
}
