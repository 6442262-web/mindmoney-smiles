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
import { APP_VERSION } from '@/lib/version';

interface AuthGuardProps {
  children: ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading, signIn, signUp, signInAsGuest, signInWithGoogle } = useAuth();
  const { t } = useLanguage();
  const [email, setEmail] = useState(() => localStorage.getItem('remembered_email') || '');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [rememberMe, setRememberMe] = useState(() => localStorage.getItem('remember_me') === 'true');
  const [authLoading, setAuthLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="text-[10px] text-muted-foreground">v{APP_VERSION}</span>
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

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  {t('auth.or') || 'หรือ'}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={async () => {
                  setGoogleLoading(true);
                  await signInWithGoogle();
                  setGoogleLoading(false);
                }}
                disabled={googleLoading}
              >
                {googleLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                )}
                Sign in with Google
              </Button>

              <Button
                variant="outline"
                className="w-full"
                onClick={async () => {
                  setGuestLoading(true);
                  await signInAsGuest();
                  setGuestLoading(false);
                }}
                disabled={guestLoading}
              >
                {guestLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('auth.guestLogin') || 'เข้าใช้งานแบบ Guest'}
              </Button>
            </div>

            <p className="text-center text-[10px] text-muted-foreground mt-4">v{APP_VERSION}</p>
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