import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bell, Settings, History, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useNotifications } from '@/hooks/useNotifications';

export function Notifications() {
  const { 
    settings, 
    notifications, 
    unreadCount, 
    loading, 
    updateSettings, 
    markAsRead 
  } = useNotifications();

  const [localSettings, setLocalSettings] = useState(settings);

  // Update local settings when settings change
  React.useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleSettingChange = (key: string, value: any) => {
    if (!localSettings) return;
    const newSettings = { ...localSettings, [key]: value };
    setLocalSettings(newSettings);
    updateSettings({ [key]: value });
  };

  const setAll = (enabled: boolean) => {
    if (!localSettings) return;
    const updates = {
      enable_notifications: enabled,
      notify_on_income: enabled,
      notify_on_expense: enabled,
      recurring_reminders: enabled,
      budget_alerts: enabled,
      low_balance_alerts: enabled,
      transaction_reminders: enabled,
      enable_push: enabled,
      enable_email: enabled,
    };
    setLocalSettings({ ...localSettings, ...updates });
    updateSettings(updates);
  };

  const formatNotificationTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('th-TH', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'recurring_reminder':
        return '🔄';
      case 'budget_alert':
        return '⚠️';
      case 'low_balance':
        return '💰';
      case 'transaction_reminder':
        return '📝';
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
      </div>

      <Tabs defaultValue="history" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            ประวัติการแจ้งเตือน
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            ตั้งค่า
          </TabsTrigger>
        </TabsList>

        {/* Notification History */}
        <TabsContent value="history" className="space-y-4">
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
                      <p className="text-sm text-muted-foreground mb-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatNotificationTime(notification.created_at)}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="settings" className="space-y-4">
          {!localSettings ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">ไม่สามารถโหลดการตั้งค่าได้</p>
            </Card>
          ) : (
            <>
              {/* Quick Actions */}
              <div className="flex justify-between items-center mb-4">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => setAll(false)}
                >
                  ปิดทั้งหมด
                </Button>
                <Button size="sm" onClick={() => setAll(true)}>
                  เปิดทั้งหมด
                </Button>
              </div>

              {/* Master Enable Switch */}
              <Card className="p-4 bg-primary/5">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-semibold">เปิดการแจ้งเตือน</Label>
                    <p className="text-sm text-muted-foreground">
                      เปิด/ปิดการแจ้งเตือนทั้งหมด
                    </p>
                  </div>
                  <Switch
                    checked={localSettings.enable_notifications}
                    onCheckedChange={(checked) => 
                      handleSettingChange('enable_notifications', checked)
                    }
                  />
                </div>
              </Card>

              {/* Transaction Type Notifications */}
              <Card className="p-4">
                <h3 className="font-semibold mb-4">การแจ้งเตือนตามประเภทรายการ</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium">รายรับ</Label>
                      <p className="text-xs text-muted-foreground">
                        แจ้งเตือนเมื่อมีรายรับเข้ามา
                      </p>
                    </div>
                    <Switch
                      checked={localSettings.notify_on_income}
                      onCheckedChange={(checked) => 
                        handleSettingChange('notify_on_income', checked)
                      }
                      disabled={!localSettings.enable_notifications}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium">รายจ่าย</Label>
                      <p className="text-xs text-muted-foreground">
                        แจ้งเตือนเมื่อมีรายจ่าย
                      </p>
                    </div>
                    <Switch
                      checked={localSettings.notify_on_expense}
                      onCheckedChange={(checked) => 
                        handleSettingChange('notify_on_expense', checked)
                      }
                      disabled={!localSettings.enable_notifications}
                    />
                  </div>
                </div>
              </Card>
              {/* Notification Types */}
              <Card className="p-4">
                <h3 className="font-semibold mb-4">ประเภทการแจ้งเตือน</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium">รายจ่ายประจำ</Label>
                      <p className="text-xs text-muted-foreground">
                        แจ้งเตือนรายจ่ายประจำที่กำลังจะถึง
                      </p>
                    </div>
                    <Switch
                      checked={localSettings.recurring_reminders}
                      onCheckedChange={(checked) => 
                        handleSettingChange('recurring_reminders', checked)
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium">เกินงบประมาณ</Label>
                      <p className="text-xs text-muted-foreground">
                        แจ้งเตือนเมื่อใช้เงินเกินงบที่ตั้งไว้
                      </p>
                    </div>
                    <Switch
                      checked={localSettings.budget_alerts}
                      onCheckedChange={(checked) => 
                        handleSettingChange('budget_alerts', checked)
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium">เงินคงเหลือต่ำ</Label>
                      <p className="text-xs text-muted-foreground">
                        แจ้งเตือนเมื่อเงินเหลือน้อยกว่าเกณฑ์
                      </p>
                    </div>
                    <Switch
                      checked={localSettings.low_balance_alerts}
                      onCheckedChange={(checked) => 
                        handleSettingChange('low_balance_alerts', checked)
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium">เตือนบันทึกรายการ</Label>
                      <p className="text-xs text-muted-foreground">
                        แจ้งเตือนให้บันทึกรายรับ/รายจ่าย
                      </p>
                    </div>
                    <Switch
                      checked={localSettings.transaction_reminders}
                      onCheckedChange={(checked) => 
                        handleSettingChange('transaction_reminders', checked)
                      }
                    />
                  </div>
                </div>
              </Card>

              {/* Timing Settings */}
              <Card className="p-4">
                <h3 className="font-semibold mb-4">การตั้งเวลา</h3>
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">เวลาแจ้งเตือนประจำวัน</Label>
                    <Input
                      type="time"
                      value={localSettings.daily_reminder_time?.slice(0, 5) || ''}
                      onChange={(e) => 
                        handleSettingChange('daily_reminder_time', e.target.value.length === 5 ? `${e.target.value}:00` : e.target.value)
                      }
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-medium">เกณฑ์เงินคงเหลือต่ำ (บาท)</Label>
                    <Input
                      type="number"
                      value={localSettings.low_balance_threshold}
                      onChange={(e) => 
                        handleSettingChange('low_balance_threshold', Number(e.target.value))
                      }
                      className="mt-2"
                      placeholder="1000"
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-medium">ความถี่ในการสรุปรายงาน</Label>
                    <Select 
                      value={localSettings.summary_frequency} 
                      onValueChange={(value) => handleSettingChange('summary_frequency', value)}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="เลือกความถี่" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">รายวัน</SelectItem>
                        <SelectItem value="weekly">รายสัปดาห์</SelectItem>
                        <SelectItem value="monthly">รายเดือน</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">เวลาแจ้งเตือนการครบกำหนดชำระ</Label>
                    <Input
                      type="time"
                      value={localSettings.bill_due_reminder?.slice(0, 5) || ''}
                      onChange={(e) => 
                        handleSettingChange('bill_due_reminder', e.target.value.length === 5 ? `${e.target.value}:00` : e.target.value)
                      }
                      className="mt-2"
                    />
                  </div>
                </div>
              </Card>

              {/* Channel Settings */}
              <Card className="p-4">
                <h3 className="font-semibold mb-4">ช่องทางการแจ้งเตือน</h3>
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">ช่องทางหลัก</Label>
                    <Select 
                      value={localSettings.notification_channel} 
                      onValueChange={(value) => handleSettingChange('notification_channel', value)}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="เลือกช่องทาง" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="in-app">ในแอพเท่านั้น</SelectItem>
                        <SelectItem value="email">อีเมลเท่านั้น</SelectItem>
                        <SelectItem value="sms">SMS เท่านั้น</SelectItem>
                        <SelectItem value="all">ทุกช่องทาง</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </Card>

              {/* Detailed Channel Settings */}
              <Card className="p-4">
                <h3 className="font-semibold mb-4">การตั้งค่าแต่ละช่องทาง</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium">Push Notification</Label>
                      <p className="text-xs text-muted-foreground">
                        แจ้งเตือนผ่านแอพ
                      </p>
                    </div>
                    <Switch
                      checked={localSettings.enable_push}
                      onCheckedChange={(checked) => 
                        handleSettingChange('enable_push', checked)
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium">อีเมล</Label>
                      <p className="text-xs text-muted-foreground">
                        แจ้งเตือนผ่านอีเมล
                      </p>
                    </div>
                    <Switch
                      checked={localSettings.enable_email}
                      onCheckedChange={(checked) => 
                        handleSettingChange('enable_email', checked)
                      }
                    />
                  </div>
                </div>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}