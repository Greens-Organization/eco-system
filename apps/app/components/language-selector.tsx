'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@pack/design-system/components/ui/select';
import { usePathname, useRouter } from 'next/navigation';
import { useLocale } from '@/lib/i18n/provider';
import { locales } from '@pack/i18n';
import { addLocaleToPathname, removeLocaleFromPathname } from '@/lib/i18n/utils';

const languageNames: Record<string, string> = {
  en: 'English',
  es: 'Español',
  pt: 'Português',
};

const languageFlags: Record<string, string> = {
  en: '🇺🇸',
  es: '🇪🇸',
  pt: '🇧🇷',
};

export function LanguageSelector() {
  const router = useRouter();
  const pathname = usePathname();
  const currentLocale = useLocale();

  const handleLocaleChange = (newLocale: string) => {
    const pathWithoutLocale = removeLocaleFromPathname(pathname);
    const newPath = addLocaleToPathname(pathWithoutLocale, newLocale as any);
    router.push(newPath);
  };

  return (
    <Select value={currentLocale} onValueChange={handleLocaleChange}>
      <SelectTrigger className="w-40">
        <SelectValue>
          <span className="flex items-center gap-2">
            <span>{languageFlags[currentLocale]}</span>
            <span>{languageNames[currentLocale]}</span>
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {locales.map((locale) => (
          <SelectItem key={locale} value={locale}>
            <span className="flex items-center gap-2">
              <span>{languageFlags[locale]}</span>
              <span>{languageNames[locale]}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
