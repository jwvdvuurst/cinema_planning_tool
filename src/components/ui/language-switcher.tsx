'use client';

import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';
import { Globe } from 'lucide-react';

export function LanguageSwitcher() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className="flex items-center space-x-1">
      <Globe className="w-4 h-4 text-gray-500" />
      <Select value={language} onValueChange={(value: 'en' | 'nl') => setLanguage(value)}>
        <SelectTrigger className="w-24 h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="en">{t('language.english')}</SelectItem>
          <SelectItem value="nl">{t('language.dutch')}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
