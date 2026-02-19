import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string | null;
  type: string | null;
  is_read: boolean | null;
  related_id: string | null;
  action_url: string | null;
  created_at: string;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Load notifications
  const loadNotifications = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error loading notifications:', error);
      } else {
        setNotifications(data || []);
      }
    } catch (error) {
      console.error('Error in loadNotifications:', error);
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
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

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', session.user.id)
        .eq('is_read', false);

      if (error) {
        console.error('Error marking all as read:', error);
      } else {
        setNotifications(prev => 
          prev.map(notif => ({ ...notif, is_read: true }))
        );
        toast({
          title: "สำเร็จ",
          description: "อ่านการแจ้งเตือนทั้งหมดแล้ว",
        });
      }
    } catch (error) {
      console.error('Error in markAllAsRead:', error);
    }
  };

  // Delete notification
  const deleteNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) {
        console.error('Error deleting notification:', error);
      } else {
        setNotifications(prev => 
          prev.filter(notif => notif.id !== notificationId)
        );
      }
    } catch (error) {
      console.error('Error in deleteNotification:', error);
    }
  };

  // Get unread count
  const unreadCount = notifications.filter(n => !n.is_read).length;

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await loadNotifications();
      setLoading(false);
    };

    init();
  }, []);

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refreshNotifications: loadNotifications,
  };
}
