import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function GuestWarningBanner() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [dismissed, setDismissed] = useState(false);

  // Check if user is anonymous (guest)
  const isGuest = user?.is_anonymous === true;

  if (!isGuest || dismissed) {
    return null;
  }

  return (
    <Alert className="rounded-none border-x-0 border-t-0 bg-amber-500/10 border-amber-500/50">
      <AlertTriangle className="h-4 w-4 text-amber-500" />
      <AlertDescription className="flex items-center justify-between flex-1">
        <span className="text-amber-700 dark:text-amber-400 text-sm">
          {t('auth.guestWarning') || 'คุณกำลังใช้งานแบบ Guest - ข้อมูลจะไม่ถูกบันทึกถาวร กรุณาสมัครสมาชิกเพื่อเก็บข้อมูล'}
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-amber-600 hover:text-amber-700 hover:bg-amber-500/20"
          onClick={() => setDismissed(true)}
        >
          <X className="h-4 w-4" />
        </Button>
      </AlertDescription>
    </Alert>
  );
}
