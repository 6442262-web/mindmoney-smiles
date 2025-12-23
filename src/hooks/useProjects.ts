import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export interface Project {
  id: string;
  user_id: string;
  account_id: string;
  name: string;
  code?: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  budget?: number;
  status: 'active' | 'completed' | 'cancelled' | 'on_hold';
  manager_name?: string;
  created_at: string;
  updated_at: string;
}

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  // Fetch projects
  const fetchProjects = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects((data || []) as Project[]);
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถโหลดข้อมูลโปรเจกต์ได้",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Create project
  const createProject = async (project: Omit<Project, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('projects')
        .insert({
          ...project,
          user_id: user.id,
        });

      if (error) throw error;

      toast({
        title: "สร้างสำเร็จ",
        description: "เพิ่มโปรเจกต์เรียบร้อยแล้ว",
      });

      await fetchProjects();
    } catch (error) {
      console.error('Error creating project:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถสร้างโปรเจกต์ได้",
        variant: "destructive",
      });
    }
  };

  // Update project
  const updateProject = async (id: string, updates: Partial<Project>) => {
    try {
      const { error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "อัปเดตสำเร็จ",
        description: "แก้ไขโปรเจกต์เรียบร้อยแล้ว",
      });

      await fetchProjects();
    } catch (error) {
      console.error('Error updating project:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถแก้ไขโปรเจกต์ได้",
        variant: "destructive",
      });
    }
  };

  // Delete project
  const deleteProject = async (id: string) => {
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "ลบสำเร็จ",
        description: "ลบโปรเจกต์เรียบร้อยแล้ว",
      });

      await fetchProjects();
    } catch (error) {
      console.error('Error deleting project:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถลบโปรเจกต์ได้",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (user) {
      fetchProjects();
    }
  }, [user]);

  return {
    projects,
    loading,
    createProject,
    updateProject,
    deleteProject,
    refetch: fetchProjects,
  };
}