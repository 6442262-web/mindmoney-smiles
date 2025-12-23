import { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { PinGuard } from './PinGuard';
import { PasswordReset } from './screens/PasswordReset';

interface AuthGuardProps {
  children: ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading, signIn, signUp } = useAuth();
  const { t } = useLanguage();
  const [email, setEmail] = useState(() => localStorage.getItem('remembered_email') || '');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [rememberMe, setRememberMe] = useState(() => localStorage.getItem('remember_me') === 'true');
  const [authLoading, setAuthLoading] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    if (showPasswordReset) {
      return <PasswordReset onBack={() => setShowPasswordReset(false)} />;
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md mx-4">
          <div className="p-6">
            <div className="text-center mb-6 relative">
              <div className="absolute top-0 right-0">
                <LanguageSwitcher />
              </div>
              <h1 className="text-2xl font-bold">{t('app.name')}</h1>
              <p className="text-muted-foreground">{t('app.subtitle')}</p>
            </div>

            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">{t('auth.signin')}</TabsTrigger>
                <TabsTrigger value="signup">{t('auth.signup')}</TabsTrigger>
              </TabsList>

              <TabsContent value="signin" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">{t('auth.email')}</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">{t('auth.password')}</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="remember-me"
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                    />
                    <Label htmlFor="remember-me" className="text-sm">{t('auth.remember')}</Label>
                  </div>
                  <Button
                    variant="link"
                    className="text-sm px-0"
                    onClick={() => setShowPasswordReset(true)}
                  >
                    {t('auth.forgotPassword')}
                  </Button>
                </div>
                <Button
                  className="w-full"
                  onClick={async () => {
                    setAuthLoading(true);
                    
                    // Handle remember me logic
                    if (rememberMe) {
                      localStorage.setItem('remembered_email', email);
                      localStorage.setItem('remember_me', 'true');
                    } else {
                      localStorage.removeItem('remembered_email');
                      localStorage.removeItem('remember_me');
                    }
                    
                    await signIn(email, password, rememberMe);
                    setAuthLoading(false);
                  }}
                  disabled={authLoading}
                >
                  {authLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t('auth.signin')}
                </Button>
              </TabsContent>

              <TabsContent value="signup" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">{t('auth.fullname')}</Label>
                  <Input
                    id="signup-name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={t('auth.fullname')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">{t('auth.email')}</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">{t('auth.password')}</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={async () => {
                    setAuthLoading(true);
                    await signUp(email, password, fullName);
                    setAuthLoading(false);
                  }}
                  disabled={authLoading}
                >
                  {authLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t('auth.signup')}
                </Button>
              </TabsContent>
            </Tabs>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <PinGuard>
      {children}
    </PinGuard>
  );
}