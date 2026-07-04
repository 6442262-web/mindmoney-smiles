import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Category {
  id: string;
  user_id: string;
  name: string;
  type: string;
  color?: string | null;
  icon?: string | null;
  parent_id?: string | null;
  is_active?: boolean;
  is_default?: boolean;
  created_at: string;
  updated_at: string;
}

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadCategories = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', session.user.id)
        .order('name');

      if (error) {
        console.error('Error loading categories:', error);
      } else {
        setCategories((data as Category[]) || []);
      }
    } catch (error) {
      console.error('Error in loadCategories:', error);
    }
  };

  const createCategory = async (categoryData: Omit<Category, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data, error } = await supabase
        .from('categories')
        .insert({ ...categoryData, user_id: session.user.id })
        .select()
        .single();

      if (error) {
        console.error('Error creating category:', error);
        toast({
          title: "เกิดข้อผิดพลาด",
          description: "ไม่สามารถสร้างหมวดหมู่ได้",
          variant: "destructive",
        });
      } else {
        setCategories(prev => [...prev, data as Category]);
        toast({
          title: "สร้างสำเร็จ",
          description: "หมวดหมู่ใหม่ถูกสร้างแล้ว",
        });
      }
    } catch (error) {
      console.error('Error in createCategory:', error);
    }
  };

  // หา category ตามชื่อ+ประเภท ถ้าไม่มีก็สร้างแบบเงียบ (ไม่ toast) — ใช้ตอน map ชื่อหมวด → category_id
  const findOrCreateCategory = async (name: string, type: string): Promise<Category | null> => {
    const trimmed = name.trim();
    if (!trimmed) return null;

    const existing = categories.find(c => c.name === trimmed && c.type === type);
    if (existing) return existing;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return null;

      // เช็คใน DB อีกชั้นเผื่อ state ยังไม่ได้โหลด
      const { data: dbExisting } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('name', trimmed)
        .eq('type', type)
        .limit(1);
      if (dbExisting && dbExisting.length > 0) {
        const found = dbExisting[0] as Category;
        setCategories(prev => prev.some(c => c.id === found.id) ? prev : [...prev, found]);
        return found;
      }

      const { data, error } = await supabase
        .from('categories')
        .insert({ name: trimmed, type, user_id: session.user.id })
        .select()
        .single();

      if (error) {
        console.error('Error creating category in findOrCreateCategory:', error);
        return null;
      }

      const created = data as Category;
      setCategories(prev => [...prev, created]);
      return created;
    } catch (error) {
      console.error('Error in findOrCreateCategory:', error);
      return null;
    }
  };

  const updateCategory = async (categoryId: string, updates: Partial<Category>) => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .update(updates)
        .eq('id', categoryId)
        .select()
        .single();

      if (error) {
        console.error('Error updating category:', error);
        toast({
          title: "เกิดข้อผิดพลาด",
          description: "ไม่สามารถอัพเดทหมวดหมู่ได้",
          variant: "destructive",
        });
      } else {
        setCategories(prev => prev.map(cat => cat.id === categoryId ? data as Category : cat));
        toast({
          title: "อัพเดทสำเร็จ",
          description: "หมวดหมู่ได้รับการอัพเดทแล้ว",
        });
      }
    } catch (error) {
      console.error('Error in updateCategory:', error);
    }
  };

  const deleteCategory = async (categoryId: string) => {
    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', categoryId);

      if (error) {
        console.error('Error deleting category:', error);
        toast({
          title: "เกิดข้อผิดพลาด",
          description: "ไม่สามารถลบหมวดหมู่ได้",
          variant: "destructive",
        });
      } else {
        setCategories(prev => prev.filter(cat => cat.id !== categoryId));
        toast({
          title: "ลบสำเร็จ",
          description: "หมวดหมู่ถูกลบแล้ว",
        });
      }
    } catch (error) {
      console.error('Error in deleteCategory:', error);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await loadCategories();
      setLoading(false);
    };

    init();
  }, []);

  return {
    categories,
    loading,
    createCategory,
    findOrCreateCategory,
    updateCategory,
    deleteCategory,
    refreshCategories: loadCategories,
  };
}