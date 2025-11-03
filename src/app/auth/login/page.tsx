'use client';

import { useState, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();
  const { login } = useAuth();
  const { t } = useLanguage();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const success = await login(email, password);
      if (success) {
        setMessage('Login successful - redirecting to dashboard...');
        setTimeout(() => {
          router.push('/dashboard');
        }, 1000);
      } else {
        setMessage('Invalid email or password. Please try again.');
      }
    } catch (error) {
      setMessage('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
            <div>
              <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                {t('login.title')}
              </h2>
              <p className="mt-2 text-center text-sm text-gray-600">
                {t('login.subtitle')}
              </p>
            </div>
        
        <Card>
          <CardHeader>
            <CardTitle>{t('login.signIn')}</CardTitle>
            <CardDescription>
              Enter your email to receive a magic link
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="email">Email address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder={t('login.emailPlaceholder')}
                    />
              </div>
              
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder={t('login.passwordPlaceholder')}
                />
              </div>
              
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? t('login.signingIn') : t('login.signIn')}
              </Button>
              
              {message && (
                <p className={`text-sm ${message.includes('error') || message.includes('Invalid') ? 'text-red-600' : 'text-green-600'}`}>
                  {message}
                </p>
              )}

              <div className="text-center mt-4">
                <button
                  onClick={() => router.push('/auth/forgot-password')}
                  className="text-sm text-blue-600 hover:text-blue-800"
                  type="button"
                >
                  Forgot your password?
                </button>
              </div>
            </form>
          </CardContent>
        </Card>

            <div className="text-center">
              <p className="text-xs text-gray-500 mb-2">
                {t('login.demoAccounts')}
              </p>
              <div className="text-xs text-gray-500 space-y-1">
                <div>admin@filmtheater.nl (Admin)</div>
                <div>tech@filmtheater.nl (Techniek)</div>
                <div>zaalwacht@filmtheater.nl (Zaalwacht)</div>
              </div>
              <p className="text-xs text-gray-500 mt-2 mb-2">
                {t('login.volunteerEmails')}
              </p>
              <div className="text-xs text-gray-500 space-y-1">
                <div>alice@example.org (Tech)</div>
                <div>bob@example.org (Zaalwacht)</div>
                <div>carol@example.org (Both)</div>
                <div>daan@example.org (Admin)</div>
                <div>eve@example.org (Tech)</div>
                <div>frank@example.org (Zaalwacht)</div>
                <div>grace@example.org (Both)</div>
                <div>henry@example.org (Programma)</div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {t('login.useAnyPassword')}
              </p>
            </div>
      </div>
    </div>
  );
}

