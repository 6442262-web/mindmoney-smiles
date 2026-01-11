import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Bell, ArrowLeft, CheckCircle, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useNotifications } from '@/hooks/useNotifications';

export function Notifications() {
  const { 
    notifications, 
    unreadCount, 
    loading, 
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();

  const formatNotificationTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('th-TH', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getNotificationIcon = (type: string | null) => {
    switch (type) {
      case 'recurring':
        return '🔄';
      case 'budget':
        return '⚠️';
      case 'low_balance':
        return '💰';
      case 'reminder':
        return '📝';
      case 'warning':
        return '⚠️';
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      default:
        return '🔔';
    }
  };

  if (loading) {
    return (
      <div className="pb-20 px-4 pt-6">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">การแจ้งเตือน</h1>
        </div>
        <div className="text-center py-8">
          <p className="text-muted-foreground">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-20 px-4 pt-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link to="/">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <Bell className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">การแจ้งเตือน</h1>
        {unreadCount > 0 && (
          <span className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">
            {unreadCount}
          </span>
        )}
        
        {unreadCount > 0 && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="ml-auto"
            onClick={markAllAsRead}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            อ่านทั้งหมด
          </Button>
        )}
      </div>

      {/* Notification List */}
      {notifications.length === 0 ? (
        <Card className="p-8 text-center">
          <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">ยังไม่มีการแจ้งเตือน</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <Card 
              key={notification.id} 
              className={`p-4 cursor-pointer transition-colors ${
                !notification.is_read ? 'bg-primary/5 border-primary/20' : ''
              }`}
              onClick={() => !notification.is_read && markAsRead(notification.id)}
            >
              <div className="flex items-start gap-3">
                <span className="text-xl">
                  {getNotificationIcon(notification.type)}
                </span>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className={`font-medium ${
                      !notification.is_read ? 'text-primary' : ''
                    }`}>
                      {notification.title}
                    </h3>
                    {!notification.is_read && (
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                    )}
                  </div>
                  {notification.message && (
                    <p className="text-sm text-muted-foreground mb-2">
                      {notification.message}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {formatNotificationTime(notification.created_at)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNotification(notification.id);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
