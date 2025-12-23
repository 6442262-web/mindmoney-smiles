import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Keyword {
  id: string;
  user_id: string;
  category: string;
  keyword: string;
  usage_count: number;
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
    } catch (error: any) {
      toast({
        title: "Error fetching keywords",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addOrUpdateKeyword = async (category: string, keyword: string) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      // Check if keyword exists
      const { data: existing } = await supabase
        .from('keywords')
        .select('*')
        .eq('user_id', user.user.id)
        .eq('category', category)
        .eq('keyword', keyword)
        .single();

      if (existing) {
        // Update usage_count
        const { error } = await supabase
          .from('keywords')
          .update({ usage_count: existing.usage_count + 1 })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Create new keyword
        const { error } = await supabase
          .from('keywords')
          .insert({
            user_id: user.user.id,
            category,
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
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
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
    } catch (error: any) {
      toast({
        title: "Error deleting keyword",
        description: error.message,
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
        .update({ usage_count: keyword.usage_count + 1 })
        .eq('id', id);

      if (error) throw error;

      await fetchKeywords();
    } catch (error: any) {
      toast({
        title: "Error updating usage",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getKeywordsByCategory = (): KeywordsByCategory => {
    return keywords.reduce((acc, keyword) => {
      if (!acc[keyword.category]) {
        acc[keyword.category] = [];
      }
      acc[keyword.category].push(keyword);
      return acc;
    }, {} as KeywordsByCategory);
  };

  const getCategories = (): string[] => {
    return Array.from(new Set(keywords.map(k => k.category))).sort();
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