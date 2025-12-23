import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { useLanguage } from '@/hooks/useLanguage';
import { 
  ArrowLeft, 
  User, 
  Bell, 
  CreditCard, 
  Tag, 
  Shield, 
  Download, 
  Info,
  ChevronRight,
  Settings as SettingsIcon,
  Mail,
  Phone,
  Lock,
  Globe,
  Smartphone,
  Banknote,
  FileText,
  Cloud,
  Key,
  Brain,
  Trash2,
  Loader2,
  LogOut
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useUserSettings } from '@/hooks/useUserSettings';
import { useBackup } from '@/hooks/useBackup';
import { useAuth } from '@/hooks/useAuth';

export function Settings() {
  const { settings, loading, updateSettings } = useUserSettings();
  const { loading: backupLoading, createBackup, exportData } = useBackup();
  const { signOut } = useAuth();
  const { t } = useLanguage();
  const [displayNameDialog, setDisplayNameDialog] = useState(false);
  const [phoneDialog, setPhoneDialog] = useState(false);
  const [currencyDialog, setCurrencyDialog] = useState(false);
  const [tempDisplayName, setTempDisplayName] = useState('');
  const [tempPhone, setTempPhone] = useState('');

  const handleDisplayNameUpdate = () => {
    if (tempDisplayName.trim()) {
      updateSettings({ display_name: tempDisplayName.trim() });
      setDisplayNameDialog(false);
    }
  };

  const handlePhoneUpdate = () => {
    if (tempPhone.trim()) {
      updateSettings({ phone_number: tempPhone.trim() });
      setPhoneDialog(false);
    }
  };

  if (loading) {
    return (
      <div className="pb-20 px-4 pt-6 flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
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
        <SettingsIcon className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">{t('nav.settings')}</h1>
      </div>

      <div className="space-y-6">
        {/* User Profile Section */}
        <Card className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <User className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">โปรไฟล์ผู้ใช้</h2>
          </div>
          
          <div className="space-y-3">
            <Link to="/profile-settings" className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">แก้ไขข้อมูลส่วนตัว</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>

            <Dialog open={displayNameDialog} onOpenChange={setDisplayNameDialog}>
              <DialogTrigger asChild>
                <div 
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => {
                    setTempDisplayName(settings?.display_name || '');
                    setDisplayNameDialog(true);
                  }}
                >
                  <div className="flex items-center gap-3">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">แก้ไขชื่อแสดง</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>แก้ไขชื่อแสดง</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="displayName">ชื่อแสดง</Label>
                    <Input
                      id="displayName"
                      value={tempDisplayName}
                      onChange={(e) => setTempDisplayName(e.target.value)}
                      placeholder="กรุณาใส่ชื่อแสดง"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleDisplayNameUpdate} className="flex-1">
                      บันทึก
                    </Button>
                    <Button variant="outline" onClick={() => setDisplayNameDialog(false)} className="flex-1">
                      ยกเลิก
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={phoneDialog} onOpenChange={setPhoneDialog}>
              <DialogTrigger asChild>
                <div 
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => {
                    setTempPhone(settings?.phone_number || '');
                    setPhoneDialog(true);
                  }}
                >
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">เปลี่ยนเบอร์โทร</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>เปลี่ยนเบอร์โทร</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="phone">เบอร์โทร</Label>
                    <Input
                      id="phone"
                      value={tempPhone}
                      onChange={(e) => setTempPhone(e.target.value)}
                      placeholder="กรุณาใส่เบอร์โทร"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handlePhoneUpdate} className="flex-1">
                      บันทึก
                    </Button>
                    <Button variant="outline" onClick={() => setPhoneDialog(false)} className="flex-1">
                      ยกเลิก
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-3">
                <Lock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">เปลี่ยนรหัสผ่าน</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>

            <Link to="/pin-settings">
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <Smartphone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">ตั้งค่า PIN</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </Link>

            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-3">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{t('settings.language')}</span>
              </div>
              <LanguageSwitcher />
            </div>
          </div>
        </Card>

        {/* Notifications Section */}
        <Card className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <Bell className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">การแจ้งเตือน</h2>
          </div>
          
          <div className="space-y-3">
            <Link to="/notifications">
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <Bell className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">ตั้งค่าการแจ้งเตือน</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </Link>

            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-3">
                <Banknote className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">เตือนเมื่อใช้เงินเกินงบ</span>
              </div>
              <Switch 
                checked={settings?.budget_alerts_enabled || false}
                onCheckedChange={(checked) => updateSettings({ budget_alerts_enabled: checked })}
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">แจ้งเตือนผ่านอีเมล</span>
              </div>
              <Switch 
                checked={settings?.email_notifications_enabled || false}
                onCheckedChange={(checked) => updateSettings({ email_notifications_enabled: checked })}
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">แจ้งเตือนผ่าน SMS</span>
              </div>
              <Switch 
                checked={settings?.sms_notifications_enabled || false}
                onCheckedChange={(checked) => updateSettings({ sms_notifications_enabled: checked })}
              />
            </div>
          </div>
        </Card>

        {/* Account Management Section */}
        <Card className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <CreditCard className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">การจัดการบัญชี</h2>
          </div>
          
          <div className="space-y-3">
            <Link to="/accounts">
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">จัดการบัญชีทั้งหมด</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </Link>

            <Dialog open={currencyDialog} onOpenChange={setCurrencyDialog}>
              <DialogTrigger asChild>
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <Banknote className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">ตั้งค่าสกุลเงิน</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>ตั้งค่าสกุลเงิน</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>สกุลเงินหลัก</Label>
                    <Select 
                      value={settings?.primary_currency || 'THB'} 
                      onValueChange={(value) => updateSettings({ primary_currency: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="เลือกสกุลเงินหลัก" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="THB">บาท (THB)</SelectItem>
                        <SelectItem value="USD">ดอลลาร์ (USD)</SelectItem>
                        <SelectItem value="EUR">ยูโร (EUR)</SelectItem>
                        <SelectItem value="JPY">เยน (JPY)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>สกุลเงินสำรอง</Label>
                    <Select 
                      value={settings?.secondary_currency || 'USD'} 
                      onValueChange={(value) => updateSettings({ secondary_currency: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="เลือกสกุลเงินสำรอง" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="THB">บาท (THB)</SelectItem>
                        <SelectItem value="USD">ดอลลาร์ (USD)</SelectItem>
                        <SelectItem value="EUR">ยูโร (EUR)</SelectItem>
                        <SelectItem value="JPY">เยน (JPY)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </Card>

        {/* Expense Categorization Section */}
        <Card className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <Tag className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">หมวดหมู่รายจ่าย</h2>
          </div>
          
          <div className="space-y-3">
            <Link to="/category-management">
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">จัดการหมวดหมู่ทั้งหมด</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </Link>

            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-3">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">แยกหมวดหมู่ตามบัญชี</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
            <Link to="/keywords">
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <Key className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">จัดการคีย์เวิร์ด</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </Link>
            
            <Link to="/ai-expense-analyzer">
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <Brain className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">AI วิเคราะห์รายจ่าย</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </Link>
          </div>
        </Card>

        {/* Backup & Restore Section */}
        <Card className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <Download className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">สำรองและกู้คืนข้อมูล</h2>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-3">
                <Cloud className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">สำรองข้อมูลอัตโนมัติ</span>
              </div>
              <Switch 
                checked={settings?.auto_backup_enabled || false}
                onCheckedChange={(checked) => updateSettings({ auto_backup_enabled: checked })}
              />
            </div>

            <div 
              className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
              onClick={() => createBackup('manual')}
            >
              <div className="flex items-center gap-3">
                <Download className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">สำรองข้อมูลด้วยตนเอง</span>
              </div>
              {backupLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </div>

            <div 
              className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
              onClick={exportData}
            >
              <div className="flex items-center gap-3">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">ส่งออกข้อมูล JSON</span>
              </div>
              {backupLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </div>
        </Card>

        {/* Security & Privacy Section */}
        <Card className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">ความปลอดภัยและความเป็นส่วนตัว</h2>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-3">
                <Key className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">ยืนยันตัวตน 2 ขั้นตอน (2FA)</span>
              </div>
              <Switch 
                checked={settings?.two_factor_enabled || false}
                onCheckedChange={(checked) => updateSettings({ two_factor_enabled: checked })}
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-3">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">จัดการสิทธิ์การเข้าถึง</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>

            <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-3">
                <Trash2 className="h-4 w-4 text-red-500" />
                <span className="text-sm text-red-700">ลบบัญชีผู้ใช้</span>
              </div>
              <ChevronRight className="h-4 w-4 text-red-500" />
            </div>
          </div>
        </Card>

        {/* About App Section */}
        <Card className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <Info className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">เกี่ยวกับแอป</h2>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-3">
                <Info className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">เวอร์ชันแอป</span>
              </div>
              <span className="text-sm text-muted-foreground">v1.0.0</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-3">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">เงื่อนไขการใช้งาน</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>

            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-3">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">นโยบายความเป็นส่วนตัว</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>

            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">ติดต่อฝ่ายสนับสนุน</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </Card>

        {/* App Theme */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <SettingsIcon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">โหมดมืด</h3>
                <p className="text-sm text-muted-foreground">เปลี่ยนธีมแอป</p>
              </div>
            </div>
            <Switch 
              checked={settings?.dark_mode_enabled || false}
              onCheckedChange={(checked) => updateSettings({ dark_mode_enabled: checked })}
            />
          </div>
        </Card>

        {/* Logout Section */}
        <Card className="p-4">
          <Button 
            variant="destructive" 
            className="w-full"
            onClick={() => signOut()}
          >
            <LogOut className="mr-2 h-4 w-4" />
            ออกจากระบบ
          </Button>
        </Card>
      </div>
    </div>
  );
}