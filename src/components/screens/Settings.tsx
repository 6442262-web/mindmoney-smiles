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
  Lock,
  Globe,
  Smartphone,
  Banknote,
  Cloud,
  Key,
  Brain,
  Loader2,
  LogOut,
  Database,
  Ticket,
  TrendingUp,
  Upload
} from 'lucide-react';
import { InviteCodeDialog } from '@/components/InviteCodeDialog';
import { Link } from 'react-router-dom';
import { useUserSettings } from '@/hooks/useUserSettings';
import { useBackup } from '@/hooks/useBackup';
import { useAuth } from '@/hooks/useAuth';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useAccounts } from '@/hooks/useAccounts';
import { useInvestmentMode } from '@/hooks/useInvestmentMode';
import { useColorTheme } from '@/hooks/useColorTheme';
import { Palette } from 'lucide-react';

function ColorThemePicker() {
  const { activeThemeId, setTheme, themes } = useColorTheme();

  return (
    <Card className="p-4">
      <div className="flex items-center gap-3 mb-4">
        <Palette className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">สีธีม</h2>
      </div>
      <p className="text-xs text-muted-foreground mb-3">เลือกสีหลักของแอพ</p>
      <div className="grid grid-cols-4 gap-3">
        {themes.map((theme) => (
          <button
            key={theme.id}
            onClick={() => setTheme(theme.id)}
            className={`relative flex flex-col items-center gap-1.5 p-2.5 rounded-xl border-2 transition-all duration-200 ${
              activeThemeId === theme.id
                ? 'border-primary shadow-md scale-105'
                : 'border-transparent hover:border-muted-foreground/20 hover:scale-102'
            }`}
          >
            <div
              className="w-10 h-10 rounded-full shadow-sm"
              style={{ background: theme.preview }}
            />
            <span className="text-[10px] font-medium leading-tight text-center">
              {theme.emoji} {theme.name}
            </span>
            {activeThemeId === theme.id && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                <span className="text-[8px] text-primary-foreground">✓</span>
              </div>
            )}
          </button>
        ))}
      </div>
    </Card>
  );
}

export function Settings() {
  const { investmentMode, setInvestmentMode } = useInvestmentMode();

  const { accounts, createAccount } = useAccounts();

  const handleInvestmentModeToggle = async (checked: boolean) => {
    setInvestmentMode(checked);

    if (checked) {
      // Auto-create investment account if none exists
      const hasInvestmentAccount = accounts.some(acc => acc.type === 'investment');
      if (!hasInvestmentAccount) {
        await createAccount({
          name: 'บัญชีการลงทุน',
          type: 'investment',
          color: '#FF9800',
          icon: '📈',
          is_default: false,
          balance: 0,
        });
      }
    }
  };

  const { settings, loading, updateSettings } = useUserSettings();
  const { loading: backupLoading, createBackup, exportData } = useBackup();
  const { signOut } = useAuth();
  const { isAdminOrDeveloper } = useUserRoles();
  const { t } = useLanguage();

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
                  <span className="text-sm">ดูการแจ้งเตือน</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </Link>

            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-3">
                <Bell className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">เปิดใช้งานการแจ้งเตือน</span>
              </div>
              <Switch 
                checked={settings?.notifications_enabled || false}
                onCheckedChange={(checked) => updateSettings({ notifications_enabled: checked })}
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

            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-3">
                <Banknote className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">สกุลเงิน: {settings?.currency || 'THB'}</span>
              </div>
              <Select 
                value={settings?.currency || 'THB'} 
                onValueChange={(value) => updateSettings({ currency: value })}
              >
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="THB">THB</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="JPY">JPY</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Investment Mode Section */}
        <Card className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">โหมดการลงทุน</h2>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <div>
                  <span className="text-sm">เปิดใช้งานโหมดการลงทุน</span>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    ติดตามพอร์ตการลงทุน หุ้น กองทุน คริปโต
                  </p>
                </div>
              </div>
              <Switch 
                checked={investmentMode}
                onCheckedChange={handleInvestmentModeToggle}
              />
            </div>

            {investmentMode && (
              <Link to="/investment">
                <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">เปิดพอร์ตการลงทุน</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-primary" />
                </div>
              </Link>
            )}
            {investmentMode && (
              <div className="p-3 bg-primary/5 rounded-lg border border-primary/10">
                <p className="text-xs text-muted-foreground">
                  🚀 โหมดการลงทุนเปิดใช้งานแล้ว! คุณสามารถ:
                </p>
                <ul className="text-xs text-muted-foreground space-y-1 ml-4 list-disc">
                  <li>บันทึกรายการซื้อ-ขายหุ้น/กองทุน/คริปโต</li>
                  <li>ติดตามกำไร-ขาดทุน</li>
                  <li>ดูสรุปพอร์ตการลงทุน</li>
                  <li>บันทึกเงินปันผล/ดอกเบี้ย</li>
                </ul>
              </div>
            )}
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
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => createBackup()}
              disabled={backupLoading}
            >
              <Cloud className="h-4 w-4 mr-2" />
              {backupLoading ? 'กำลังสำรองข้อมูล...' : 'สำรองข้อมูลไปยังคลาวด์'}
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={exportData}
              disabled={backupLoading}
            >
              <Download className="h-4 w-4 mr-2" />
              ส่งออกข้อมูลเป็น JSON
            </Button>

            <Link to="/import-csv" className="block">
              <Button variant="outline" className="w-full justify-start">
                <Upload className="h-4 w-4 mr-2" />
                นำเข้าข้อมูลจาก Excel/CSV
              </Button>
            </Link>

            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-3">
                <Cloud className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">สำรองข้อมูลอัตโนมัติ</span>
              </div>
              <Switch 
                checked={settings?.auto_backup || false}
                onCheckedChange={(checked) => updateSettings({ auto_backup: checked })}
              />
            </div>
          </div>
        </Card>

        {/* Security Section */}
        <Card className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">ความปลอดภัย</h2>
          </div>
          
          <div className="space-y-3">
            <Link to="/pin-settings">
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">เปิดใช้งาน PIN</span>
                </div>
                <Switch 
                  checked={settings?.pin_enabled || false}
                  disabled
                />
              </div>
            </Link>

            {/* Invite Code - only show if not already admin/developer */}
            {!isAdminOrDeveloper && (
              <InviteCodeDialog />
            )}
          </div>
        </Card>

        {/* Developer Section - Only visible to admins/developers */}
        {isAdminOrDeveloper && (
          <Card className="p-4 border-primary/50">
            <div className="flex items-center gap-3 mb-4">
              <Database className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Developer Mode</h2>
            </div>
            
            <div className="space-y-3">
              <Link to="/admin">
                <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors">
                  <div className="flex items-center gap-3">
                    <Database className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Admin Dashboard</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-primary" />
                </div>
              </Link>
            </div>
          </Card>
        )}

        {/* Theme Section */}
        <Card className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <SettingsIcon className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">การแสดงผล</h2>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-3">
                <span className="text-sm">ธีม</span>
              </div>
              <Select 
                value={settings?.theme || 'light'} 
                onValueChange={(value) => updateSettings({ theme: value })}
              >
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">สว่าง</SelectItem>
                  <SelectItem value="dark">มืด</SelectItem>
                  <SelectItem value="system">ตามระบบ</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-3">
                <span className="text-sm">รูปแบบวันที่</span>
              </div>
              <Select 
                value={settings?.date_format || 'dd/MM/yyyy'} 
                onValueChange={(value) => updateSettings({ date_format: value })}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dd/MM/yyyy">dd/MM/yyyy</SelectItem>
                  <SelectItem value="MM/dd/yyyy">MM/dd/yyyy</SelectItem>
                  <SelectItem value="yyyy-MM-dd">yyyy-MM-dd</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Color Theme Section */}
        <ColorThemePicker />

        {/* About Section */}
        <Card className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <Info className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">เกี่ยวกับ</h2>
          </div>
          
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>MoneyMind - แอพจัดการการเงินส่วนบุคคล</p>
            <p>เวอร์ชัน 1.0.0</p>
          </div>
        </Card>

        {/* Logout Button */}
        <Button 
          variant="destructive" 
          className="w-full"
          onClick={() => signOut()}
        >
          <LogOut className="h-4 w-4 mr-2" />
          ออกจากระบบ
        </Button>
      </div>
    </div>
  );
}
