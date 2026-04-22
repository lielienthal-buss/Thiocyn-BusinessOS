import deMessages from './messages-de.json';
import enMessages from './messages-en.json';
import { useLang } from '@/lib/i18n';

type Messages = typeof deMessages;
const MESSAGES: Record<'de' | 'en', Messages> = { de: deMessages, en: enMessages as Messages };

function get(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, k) => {
    if (acc && typeof acc === 'object' && k in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[k];
    }
    return undefined;
  }, obj);
}

export function useTranslations(scope: string) {
  const { lang } = useLang();
  return (key: string): string => {
    const fullKey = scope ? `${scope}.${key}` : key;
    const value = get(MESSAGES[lang], fullKey) ?? get(MESSAGES.en, fullKey);
    return typeof value === 'string' ? value : fullKey;
  };
}

export function useLocale(): 'de' | 'en' {
  return useLang().lang;
}
