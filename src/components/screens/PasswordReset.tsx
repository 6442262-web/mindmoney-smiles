import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Loader2, Mail, Lock } from 'lucide-react';

interface PasswordResetProps {
  onBack: () => void;
}

export function PasswordReset({ onBack }: PasswordResetProps) {
  const { resetPassword, updatePassword, session } = useAuth();
  const { t } = useLanguage();
  const [step, setStep] = useState<'email' | 'newPassword'>('email');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // ถ้ามี session แล้ว (คลิกลิงก์จากอีเมล) ให้ข้ามไปขั้นตอนเปลี่ยนรหัสผ่านเลย
  const currentStep = session ? 'newPassword' : step;

  const handleSendResetEmail = async () => {
    if (!email) {
      return;
    }

    setLoading(true);
    const { error } = await resetPassword(email);
    setLoading(false);

    if (!error) {
      // แสดงข้อความว่าส่งอีเมลสำเร็จแล้ว
      // ผู้ใช้จะต้องไปคลิกลิงก์ในอีเมล
    }
  };

  const handleUpdatePassword = async () => {
    if (!newPassword || !confirmPassword) {
      return;
    }

    if (newPassword !== confirmPassword) {
      return;
    }

    if (newPassword.length < 6) {
      return;
    }

    setLoading(true);
    const { error } = await updatePassword(newPassword);
    setLoading(false);

    if (!error) {
      // รีเซ็ตสำเร็จ กลับไปหน้า login
      onBack();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md mx-4">
        <div className="p-6">
          <div className="mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('common.back')}
            </Button>
            <h2 className="text-2xl font-bold">{t('auth.resetPassword')}</h2>
            <p className="text-muted-foreground mt-2">
              {currentStep === 'email' 
                ? t('auth.resetPassword.description')
                : t('auth.resetPassword.newPasswordDescription')}
            </p>
          </div>

          {currentStep === 'email' ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email">
                  <Mail className="h-4 w-4 inline mr-2" />
                  {t('auth.email')}
                </Label>
                <Input
                  id="reset-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                />
              </div>
              <Button
                className="w-full"
                onClick={handleSendResetEmail}
                disabled={loading || !email}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('auth.resetPassword.sendEmail')}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">
                  <Lock className="h-4 w-4 inline mr-2" />
                  {t('auth.resetPassword.newPassword')}
                </Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">
                  <Lock className="h-4 w-4 inline mr-2" />
                  {t('auth.resetPassword.confirmPassword')}
                </Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              {newPassword && confirmPassword && newPassword !== confirmPassword && (
                <p className="text-sm text-destructive">
                  {t('auth.resetPassword.passwordMismatch')}
                </p>
              )}
              {newPassword && newPassword.length < 6 && (
                <p className="text-sm text-destructive">
                  {t('auth.resetPassword.passwordTooShort')}
                </p>
              )}
              <Button
                className="w-full"
                onClick={handleUpdatePassword}
                disabled={loading || !newPassword || !confirmPassword || newPassword !== confirmPassword || newPassword.length < 6}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('auth.resetPassword.update')}
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
