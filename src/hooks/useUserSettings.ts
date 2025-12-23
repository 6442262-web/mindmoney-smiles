import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface UserSettings {
  id?: string;
  user_id: string;
  display_name?: string;
  phone_number?: string;
  language: string;
  pin_enabled: boolean;
  pin_hash?: string | null;
  touch_id_enabled: boolean;
  primary_currency: string;
  secondary_currency: string;
  budget_alerts_enabled: boolean;
  email_notifications_enabled: boolean;
  sms_notifications_enabled: boolean;
  auto_backup_enabled: boolean;
  two_factor_enabled: boolean;
  dark_mode_enabled: boolean;
  date_of_birth?: string | null;
  avatar_url?: string | null;
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
        // Create default settings
        const defaultSettings = {
          user_id: user.id,
          display_name: user.user_metadata?.full_name || '',
          phone_number: user.phone || '',
          language: 'th',
          pin_enabled: false,
          pin_hash: null,
          touch_id_enabled: false,
          primary_currency: 'THB',
          secondary_currency: 'USD',
          budget_alerts_enabled: true,
          email_notifications_enabled: false,
          sms_notifications_enabled: false,
          auto_backup_enabled: true,
          two_factor_enabled: false,
          dark_mode_enabled: false,
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

        // Apply dark mode immediately
        if ('dark_mode_enabled' in updates) {
          document.documentElement.classList.toggle('dark', updates.dark_mode_enabled);
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

  // Apply dark mode on load
  useEffect(() => {
    if (settings?.dark_mode_enabled) {
      document.documentElement.classList.add('dark');
    }
  }, [settings?.dark_mode_enabled]);

  return {
    settings,
    loading,
    updateSettings,
    refreshSettings: loadSettings,
  };
}