import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useInviteCode } from '@/hooks/useInviteCode';
import { Loader2, Ticket } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

interface InviteCodeDialogProps {
  trigger?: React.ReactNode;
}

export function InviteCodeDialog({ trigger }: InviteCodeDialogProps) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const { redeemCode, loading } = useInviteCode();
  const { language } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await redeemCode(code);
    if (result.success) {
      setCode('');
      setOpen(false);
    }
  };

  const texts = {
    th: {
      title: 'กรอกรหัสเชิญ',
      description: 'กรอกรหัสเชิญที่ได้รับจาก Developer หรือ Admin เพื่อรับสิทธิ์พิเศษ',
      placeholder: 'เช่น DEV-2024-XXXXX',
      label: 'รหัสเชิญ',
      submit: 'ยืนยันรหัส',
      cancel: 'ยกเลิก',
      buttonText: 'มีรหัสเชิญ?',
    },
    en: {
      title: 'Enter Invite Code',
      description: 'Enter the invite code you received from a Developer or Admin to get special access',
      placeholder: 'e.g., DEV-2024-XXXXX',
      label: 'Invite Code',
      submit: 'Redeem Code',
      cancel: 'Cancel',
      buttonText: 'Have an invite code?',
    }
  };

  const t = texts[language as keyof typeof texts] || texts.th;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
            <div className="flex items-center gap-3">
              <Ticket className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{t.buttonText}</span>
            </div>
          </div>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ticket className="h-5 w-5 text-primary" />
            {t.title}
          </DialogTitle>
          <DialogDescription>
            {t.description}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="invite-code">{t.label}</Label>
            <Input
              id="invite-code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder={t.placeholder}
              className="font-mono text-center text-lg tracking-wider"
              disabled={loading}
              autoComplete="off"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              {t.cancel}
            </Button>
            <Button type="submit" disabled={loading || !code.trim()}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t.submit}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
