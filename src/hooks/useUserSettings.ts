import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface UserSettings {
  id?: string;
  user_id: string;
  language?: string | null;
  currency?: string | null;
  theme?: string | null;
  pin_hash?: string | null;
  pin_enabled?: boolean | null;
  date_format?: string | null;
  notifications_enabled?: boolean | null;
  auto_backup?: boolean | null;
  created_at?: string;
  updated_at?: string;
}

export function useUserSettings() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error loading user settings:', error);
        return;
      }

      if (data) {
        setSettings(data);
      } else {
        const defaultSettings: UserSettings = {
          user_id: user.id,
          language: 'th',
          currency: 'THB',
          theme: 'light',
          pin_enabled: false,
          pin_hash: null,
          date_format: 'dd/MM/yyyy',
          notifications_enabled: true,
          auto_backup: false,
        };

        const { data: newSettings, error: insertError } = await supabase
          .from('user_settings')
          .insert(defaultSettings)
          .select()
          .single();

        if (insertError) {
          console.error('Error creating user settings:', insertError);
        } else {
          setSettings(newSettings);
        }
      }
    } catch (error) {
      console.error('Error in loadSettings:', error);
    }
  };

  const updateSettings = async (updates: Partial<UserSettings>) => {
    if (!settings) return;

    try {
      const { data, error } = await supabase
        .from('user_settings')
        .update(updates)
        .eq('id', settings.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating settings:', error);
        toast({
          title: "เกิดข้อผิดพลาด",
          description: "ไม่สามารถบันทึกการตั้งค่าได้",
          variant: "destructive",
        });
      } else {
        setSettings(data);
        toast({
          title: "บันทึกสำเร็จ",
          description: "การตั้งค่าได้รับการอัพเดทแล้ว",
        });

        // Apply theme immediately
        if ('theme' in updates) {
          document.documentElement.classList.toggle('dark', updates.theme === 'dark');
        }
      }
    } catch (error) {
      console.error('Error in updateSettings:', error);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await loadSettings();
      setLoading(false);
    };

    init();
  }, []);

  // Apply theme on load
  useEffect(() => {
    if (settings?.theme === 'dark') {
      document.documentElement.classList.add('dark');
    }
  }, [settings?.theme]);

  return {
    settings,
    loading,
    updateSettings,
    refreshSettings: loadSettings,
  };
}