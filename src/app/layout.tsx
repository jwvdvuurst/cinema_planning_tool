import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { SettingsProvider } from '@/contexts/SettingsContext';
import { ScreeningConfigProvider } from '@/contexts/ScreeningConfigContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { AuthProvider } from '@/contexts/AuthContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Film Theater Planner',
  description: 'Scheduling system for volunteer-run film theater',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
      return (
        <html lang="en">
          <body className={inter.className}>
            <AuthProvider>
              <LanguageProvider>
                <SettingsProvider>
                  <ScreeningConfigProvider>
                    <div className="min-h-screen bg-background">
                      {children}
                    </div>
                  </ScreeningConfigProvider>
                </SettingsProvider>
              </LanguageProvider>
            </AuthProvider>
          </body>
        </html>
      );
}

