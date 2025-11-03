'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LanguageSwitcher } from '@/components/ui/language-switcher';
import { Tooltip } from '@/components/ui/tooltip';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { cn } from '@/lib/utils';
import { 
  Calendar, 
  Film, 
  Users, 
  Settings, 
  LogOut,
  Home,
  RotateCcw,
  User,
  UserCheck,
  Mail,
  CalendarDays
} from 'lucide-react';

const navigation = [
  { nameKey: 'nav.dashboard', href: '/dashboard', icon: Home, roles: ['ADMIN', 'PROGRAMMA', 'TECHNIEK', 'ZAALWACHT'] },
  { nameKey: 'nav.calendar', href: '/calendar', icon: CalendarDays, roles: ['ADMIN', 'PROGRAMMA', 'TECHNIEK', 'ZAALWACHT'] },
  { nameKey: 'nav.films', href: '/films', icon: Film, roles: ['ADMIN', 'PROGRAMMA', 'TECHNIEK'] },
  { nameKey: 'nav.screenings', href: '/screenings', icon: Calendar, roles: ['ADMIN', 'PROGRAMMA', 'TECHNIEK', 'ZAALWACHT'] },
  { nameKey: 'nav.availability', href: '/availability', icon: Users, roles: ['ADMIN', 'PROGRAMMA', 'TECHNIEK', 'ZAALWACHT'] },
  { nameKey: 'nav.plan', href: '/plan', icon: RotateCcw, roles: ['ADMIN', 'PROGRAMMA'] },
  { nameKey: 'nav.swaps', href: '/swaps', icon: User, roles: ['ADMIN', 'PROGRAMMA', 'TECHNIEK', 'ZAALWACHT'] },
  { nameKey: 'nav.volunteers', href: '/volunteers', icon: UserCheck, roles: ['ADMIN'] },
  { nameKey: 'nav.settings', href: '/settings', icon: Settings, roles: ['ADMIN', 'PROGRAMMA', 'TECHNIEK', 'ZAALWACHT'] },
  { nameKey: 'nav.testEmail', href: '/test-email', icon: Mail, roles: ['ADMIN'] },
];

// Role hierarchy for determining highest role and color
const roleHierarchy = {
  'ADMIN': { priority: 4, color: 'bg-red-500 text-white hover:bg-red-600' },
  'PROGRAMMA': { priority: 3, color: 'bg-blue-500 text-white hover:bg-blue-600' },
  'TECHNIEK': { priority: 2, color: 'bg-green-500 text-white hover:bg-green-600' },
  'ZAALWACHT': { priority: 1, color: 'bg-purple-500 text-white hover:bg-purple-600' },
};

function getHighestRole(userRoles: string[]) {
  let highestRole = 'ZAALWACHT'; // default
  let highestPriority = 0;
  
  for (const role of userRoles) {
    if (roleHierarchy[role as keyof typeof roleHierarchy]?.priority > highestPriority) {
      highestPriority = roleHierarchy[role as keyof typeof roleHierarchy].priority;
      highestRole = role;
    }
  }
  
  return highestRole;
}

export function Navbar() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const { user, logout } = useAuth();
  const { menuLayout } = useSettings();

  // Filter navigation items based on user roles
  const filteredNavigation = navigation.filter(item => {
    if (!user) return false;
    return item.roles.some(role => user.roles.includes(role));
  });

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Left side - Logo and Navigation */}
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Link href="/dashboard" className="text-lg font-bold text-gray-900">
                Film Theater Planner
              </Link>
            </div>
                <div className="hidden md:ml-6 md:flex md:space-x-4">
                  {filteredNavigation.map((item) => {
                    const isActive = pathname === item.href;
                    
                    // Render based on menu layout setting
                    if (menuLayout === 'icon-only') {
                      return (
                        <Link
                          key={item.nameKey}
                          href={item.href}
                          className={cn(
                            'inline-flex items-center justify-center px-3 py-2 border-b-2 text-sm font-medium transition-colors',
                            isActive
                              ? 'border-primary text-gray-900'
                              : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                          )}
                          title={t(item.nameKey)}
                        >
                          <item.icon className="w-5 h-5" />
                        </Link>
                      );
                    } else if (menuLayout === 'icon-text-below') {
                      return (
                        <Link
                          key={item.nameKey}
                          href={item.href}
                          className={cn(
                            'inline-flex flex-col items-center px-2 py-1 border-b-2 text-xs font-medium transition-colors',
                            isActive
                              ? 'border-primary text-gray-900'
                              : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                          )}
                        >
                          <item.icon className="w-4 h-4 mb-1" />
                          <span className="text-xs">{t(item.nameKey)}</span>
                        </Link>
                      );
                    } else {
                      // Default: icon-text
                      return (
                        <Link
                          key={item.nameKey}
                          href={item.href}
                          className={cn(
                            'inline-flex items-center px-2 py-1 border-b-2 text-sm font-medium transition-colors',
                            isActive
                              ? 'border-primary text-gray-900'
                              : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                          )}
                        >
                          <item.icon className="w-4 h-4 mr-1.5" />
                          <span className="hidden lg:inline">{t(item.nameKey)}</span>
                        </Link>
                      );
                    }
                  })}
                </div>
          </div>

              {/* Right side - User info and logout */}
              <div className="flex items-center space-x-2 ml-4 flex-shrink-0">
                <div className="h-6 w-px bg-gray-300 mx-2"></div>
                <LanguageSwitcher />
                <div className="h-6 w-px bg-gray-300 mx-2"></div>
                {user && (
                  <>
                    <div className="hidden lg:flex items-center space-x-1">
                      <Tooltip content={`Roles: ${user.roles.join(', ')}`}>
                        <Badge 
                          className={cn(
                            'text-xs cursor-help',
                            roleHierarchy[getHighestRole(user.roles) as keyof typeof roleHierarchy]?.color || 'bg-gray-500 text-white'
                          )}
                        >
                          {user.name}
                        </Badge>
                      </Tooltip>
                    </div>
                  </>
                )}
                {user && (
                  <Button variant="outline" size="sm" className="text-xs whitespace-nowrap" onClick={logout}>
                    <LogOut className="w-4 h-4 mr-1" />
                    <span className="hidden md:inline">{t('nav.logout')}</span>
                  </Button>
                )}
              </div>
        </div>

            {/* Mobile navigation */}
            <div className="md:hidden border-t border-gray-200">
              <div className="px-2 pt-2 pb-3 space-y-1">
                {filteredNavigation.map((item) => {
                  const isActive = pathname === item.href;
                  
                  // Mobile always shows icon + text for clarity
                  return (
                    <Link
                      key={item.nameKey}
                      href={item.href}
                      className={cn(
                        'flex items-center px-3 py-2 rounded-md text-sm font-medium',
                        isActive
                          ? 'bg-primary text-white'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      )}
                    >
                      <item.icon className="w-4 h-4 mr-3" />
                      {t(item.nameKey)}
                    </Link>
                  );
                })}
            {user && (
              <div className="border-t border-gray-200 pt-2 mt-2">
                <div className="px-3 py-2 text-sm text-gray-600">
                  <div className="font-medium">{user.name}</div>
                  <div className="text-xs text-gray-500">{user.roles.join(', ')}</div>
                </div>
                <button
                  onClick={logout}
                  className="flex items-center w-full px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                >
                  <LogOut className="w-4 h-4 mr-3" />
                  {t('nav.logout')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

