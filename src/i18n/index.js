// ─── i18n/index.js ───────────────────────────────────────────────────────────
// Import this wherever you need translated strings.
// Usage: const t = useTranslation();

import en from './en';
import hi from './hi';
import useAppStore from '../store/useAppStore';

export const translations = { en, hi };

export function useTranslation() {
  const lang = useAppStore(s => s.lang);
  return translations[lang] || en;
}
