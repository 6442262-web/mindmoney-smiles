import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface NotificationSettings {
  id?: string;
  user_id: string;
  enable_notifications: boolean;
  notify_on_income: boolean;
  notify_on_expense: boolean;
  summary_frequency: 'daily' | 'weekly' | 'monthly';
  budget_alerts: boolean;
  bill_due_reminder: string;
  notification_channel: 'in-app' | 'email' | 'sms' | 'all';
  recurring_reminders: boolean;
  low_balance_alerts: boolean;
  transaction_reminders: boolean;
  daily_reminder_time: string;
  low_balance_threshold: number;
  enable_push: boolean;
  enable_email: boolean;
}

export interface NotificationHistory {
  id: string;
  user_id: string;
  type: 'recurring_reminder' | 'budget_alert' | 'low_balance' | 'transaction_reminder';
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export function useNotifications() {
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [notifications, setNotifications] = useState<NotificationHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Load notification settings
  const loadSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error loading notification settings:', error);
        return;
      }

      if (data) {
        // Ensure summary_frequency is properly typed
        const typedData = {
          ...data,
          summary_frequency: data.summary_frequency as 'daily' | 'weekly' | 'monthly',
          notification_channel: data.notification_channel as 'in-app' | 'email' | 'sms' | 'all'
        };
        setSettings(typedData);
      } else {
        // Create default settings
        const defaultSettings = {
          user_id: user.id,
          enable_notifications: true,
          notify_on_income: true,
          notify_on_expense: true,
          summary_frequency: 'weekly' as const,
          budget_alerts: true,
          bill_due_reminder: '09:00:00',
          notification_channel: 'in-app' as const,
          recurring_reminders: true,
          low_balance_alerts: true,
          transaction_reminders: true,
          daily_reminder_time: '19:00:00',
          low_balance_threshold: 1000,
          enable_push: true,
          enable_email: false,
        };

        const { data: newSettings, error: insertError } = await supabase
          .from('notification_settings')
          .insert(defaultSettings)
          .select()
          .single();

        if (insertError) {
          console.error('Error creating notification settings:', insertError);
        } else {
          const typedData = {
            ...newSettings,
            summary_frequency: newSettings.summary_frequency as 'daily' | 'weekly' | 'monthly',
            notification_channel: newSettings.notification_channel as 'in-app' | 'email' | 'sms' | 'all'
          };
          setSettings(typedData);
        }
      }
    } catch (error) {
      console.error('Error in loadSettings:', error);
    }
  };

  // Load notification history
  const loadNotifications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('notifications_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error loading notifications:', error);
      } else {
        setNotifications(data as NotificationHistory[] || []);
      }
    } catch (error) {
      console.error('Error in loadNotifications:', error);
    }
  };

  // Update notification settings
  const updateSettings = async (updates: Partial<NotificationSettings>) => {
    if (!settings) return;

    try {
      const { data, error } = await supabase
        .from('notification_settings')
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
        const typedData = {
          ...data,
          summary_frequency: data.summary_frequency as 'daily' | 'weekly' | 'monthly',
          notification_channel: data.notification_channel as 'in-app' | 'email' | 'sms' | 'all'
        };
        setSettings(typedData);
        toast({
          title: "บันทึกสำเร็จ",
          description: "การตั้งค่าการแจ้งเตือนได้รับการอัพเดทแล้ว",
        });
      }
    } catch (error) {
      console.error('Error in updateSettings:', error);
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications_history')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) {
        console.error('Error marking notification as read:', error);
      } else {
        setNotifications(prev => 
          prev.map(notif => 
            notif.id === notificationId 
              ? { ...notif, is_read: true }
              : notif
          )
        );
      }
    } catch (error) {
      console.error('Error in markAsRead:', error);
    }
  };

  // Get unread count
  const unreadCount = notifications.filter(n => !n.is_read).length;

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([loadSettings(), loadNotifications()]);
      setLoading(false);
    };

    init();
  }, []);

  return {
    settings,
    notifications,
    unreadCount,
    loading,
    updateSettings,
    markAsRead,
    refreshNotifications: loadNotifications,
  };
}