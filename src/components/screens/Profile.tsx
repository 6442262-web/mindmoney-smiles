import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, User, Bell, Database, Settings, LogOut, Shield, Wallet } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export function Profile() {
  const { signOut } = useAuth();
  
  return (
    <div className="pb-20 px-4 pt-6">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">โปรไฟล์</h1>
      </div>

      {/* Profile Info */}
      <Card className="p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center">
            <User className="h-8 w-8 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">ผู้ใช้ MoneyMind</h2>
            <p className="text-muted-foreground">user@example.com</p>
          </div>
        </div>
      </Card>

      {/* Settings */}
      <div className="space-y-4">
        {/* Notifications */}
        <Card className="p-4">
          <Link to="/notifications" className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <div>
                <h3 className="font-medium">การแจ้งเตือน</h3>
                <p className="text-sm text-muted-foreground">
                  แจ้งเตือนรายการประจำและงบประมาณ
                </p>
              </div>
            </div>
          </Link>
        </Card>

        {/* Accounts Management */}
        <Card className="p-4">
          <Link to="/accounts" className="flex items-center gap-3">
            <Wallet className="h-5 w-5 text-muted-foreground" />
            <div>
              <h3 className="font-medium">จัดการบัญชี</h3>
              <p className="text-sm text-muted-foreground">
                เพิ่ม แก้ไข หรือสลับบัญชีรายรับรายจ่าย
              </p>
            </div>
          </Link>
        </Card>

        {/* Categories Management */}
        <Card className="p-4">
          <Link to="/categories" className="flex items-center gap-3">
            <Settings className="h-5 w-5 text-muted-foreground" />
            <div>
              <h3 className="font-medium">จัดการหมวดหมู่</h3>
              <p className="text-sm text-muted-foreground">
                เพิ่ม แก้ไข หรือลบหมวดหมู่รายรับรายจ่าย
              </p>
            </div>
          </Link>
        </Card>

        {/* Data Backup */}
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Database className="h-5 w-5 text-muted-foreground" />
            <div className="flex-1">
              <h3 className="font-medium">สำรองข้อมูล</h3>
              <p className="text-sm text-muted-foreground">
                เชื่อมต่อกับ Google Drive หรือ iCloud
              </p>
            </div>
          </div>
          <div className="mt-3 space-y-2">
            <Button variant="outline" size="sm" className="w-full">
              เชื่อมต่อ Google Drive
            </Button>
            <Button variant="outline" size="sm" className="w-full">
              เชื่อมต่อ iCloud
            </Button>
          </div>
        </Card>

        {/* Security */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <div>
                <h3 className="font-medium">ความปลอดภัย</h3>
                <p className="text-sm text-muted-foreground">
                  ป้องกันข้อมูลด้วย PIN หรือ Touch ID
                </p>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">ใช้ PIN Code</span>
              <Switch />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">ใช้ Touch ID / Face ID</span>
              <Switch defaultChecked />
            </div>
          </div>
        </Card>

        {/* App Info */}
        <Card className="p-4">
          <div className="space-y-3">
            <h3 className="font-medium">เกี่ยวกับแอป</h3>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>MoneyMind เวอร์ชั่น 1.0.0</p>
              <p>แอปจัดการรายรับรายจ่ายอัจฉริยะ</p>
              <p>พัฒนาโดยทีม MoneyMind</p>
            </div>
            <div className="pt-2 space-y-2">
              <Button variant="ghost" size="sm" className="w-full justify-start">
                นโยบายความเป็นส่วนตัว
              </Button>
              <Button variant="ghost" size="sm" className="w-full justify-start">
                เงื่อนไขการใช้งาน
              </Button>
              <Link to="/feedback">
                <Button variant="ghost" size="sm" className="w-full justify-start">
                  ติดต่อเรา / ส่งข้อเสนอแนะ
                </Button>
              </Link>
            </div>
          </div>
        </Card>

        {/* Logout */}
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