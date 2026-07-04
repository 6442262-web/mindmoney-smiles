import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/getErrorMessage';

export interface Keyword {
  id: string;
  user_id: string;
  keyword: string;
  category_id?: string | null;
  category_name?: string | null;
  usage_count?: number | null;
  created_at: string;
  updated_at: string;
}

export interface KeywordsByCategory {
  [category: string]: Keyword[];
}

export const useKeywords = () => {
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchKeywords = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('keywords')
        .select('*')
        .order('usage_count', { ascending: false });

      if (error) throw error;
      setKeywords(data || []);
    } catch (error) {
      toast({
        title: "Error fetching keywords",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addOrUpdateKeyword = async (categoryName: string, keyword: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('User not authenticated');

      // Check if keyword exists
      const { data: existing } = await supabase
        .from('keywords')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('category_name', categoryName)
        .eq('keyword', keyword)
        .maybeSingle();

      if (existing) {
        // Update usage_count
        const { error } = await supabase
          .from('keywords')
          .update({ usage_count: (existing.usage_count || 0) + 1 })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Create new keyword
        const { error } = await supabase
          .from('keywords')
          .insert({
            user_id: session.user.id,
            category_name: categoryName,
            keyword,
            usage_count: 1,
          });

        if (error) throw error;
      }

      await fetchKeywords();
      toast({
        title: "Success",
        description: existing ? "Keyword usage updated" : "New keyword added",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    }
  };

  const deleteKeyword = async (id: string) => {
    try {
      const { error } = await supabase
        .from('keywords')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await fetchKeywords();
      toast({
        title: "Success",
        description: "Keyword deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error deleting keyword",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    }
  };

  const incrementUsage = async (id: string) => {
    try {
      const keyword = keywords.find(k => k.id === id);
      if (!keyword) return;

      const { error } = await supabase
        .from('keywords')
        .update({ usage_count: (keyword.usage_count || 0) + 1 })
        .eq('id', id);

      if (error) throw error;

      await fetchKeywords();
    } catch (error) {
      toast({
        title: "Error updating usage",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    }
  };

  const getKeywordsByCategory = (): KeywordsByCategory => {
    return keywords.reduce((acc, keyword) => {
      const categoryKey = keyword.category_name || 'uncategorized';
      if (!acc[categoryKey]) {
        acc[categoryKey] = [];
      }
      acc[categoryKey].push(keyword);
      return acc;
    }, {} as KeywordsByCategory);
  };

  const getCategories = (): string[] => {
    return Array.from(new Set(keywords.map(k => k.category_name || 'uncategorized'))).sort();
  };

  useEffect(() => {
    fetchKeywords();
  }, []);

  return {
    keywords,
    loading,
    addOrUpdateKeyword,
    deleteKeyword,
    incrementUsage,
    getKeywordsByCategory,
    getCategories,
    refetchKeywords: fetchKeywords,
  };
};