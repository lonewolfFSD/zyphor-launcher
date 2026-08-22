import { createContext, useContext, useMemo, useCallback } from 'react';
import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import de from './locales/de.json';
import ja from './locales/ja.json';
import zhCN from './locales/zh-CN.json';
import ru from './locales/ru.json';
import ko from './locales/ko.json';
import ptBR from './locales/pt-BR.json';
import it from './locales/it.json';

export const SUPPORTED_LANGUAGES = [
  { code: 'en',    name: 'English',              nativeName: 'English',            flag: '🇺🇸' },
  { code: 'es',    name: 'Spanish',              nativeName: 'Español',            flag: '🇪🇸' },
  { code: 'fr',    name: 'French',               nativeName: 'Français',           flag: '🇫🇷' },
  { code: 'de',    name: 'German',               nativeName: 'Deutsch',            flag: '🇩🇪' },
  { code: 'ja',    name: 'Japanese',             nativeName: '日本語',              flag: '🇯🇵' },
  { code: 'zh-CN', name: 'Chinese (Simplified)', nativeName: '简体中文',          flag: '🇨🇳' },
  { code: 'ru',    name: 'Russian',              nativeName: 'Русский',            flag: '🇷🇺' },
  { code: 'ko',    name: 'Korean',               nativeName: '한국어',              flag: '🇰🇷' },
  { code: 'pt-BR', name: 'Portuguese (Brazil)',  nativeName: 'Português (Brasil)', flag: '🇧🇷' },
  { code: 'it',    name: 'Italian',              nativeName: 'Italiano',           flag: '🇮🇹' },
];

export const DICTIONARIES = {
  en,
  es,
  fr,
  de,
  ja,
  'zh-CN': zhCN,
  ru,
  ko,
  'pt-BR': ptBR,
  it,
};

const I18nContext = createContext({
  language: 'en',
  setLanguage: () => {},
  t: (key) => key,
  supportedLanguages: SUPPORTED_LANGUAGES,
});

function getNestedValue(obj, path) {
  if (!obj || !path) return undefined;
  const keys = path.split('.');
  let current = obj;
  for (const k of keys) {
    if (current && typeof current === 'object' && k in current) {
      current = current[k];
    } else {
      return undefined;
    }
  }
  return current;
}

export function I18nProvider({ language = 'en', onLanguageChange, children }) {
  const activeDictionary = useMemo(() => {
    return DICTIONARIES[language] || DICTIONARIES['en'] || {};
  }, [language]);

  const fallbackDictionary = useMemo(() => DICTIONARIES['en'] || {}, []);

  const t = useCallback(
    (key, params = {}, defaultVal) => {
      let value = getNestedValue(activeDictionary, key);
      if (value === undefined || value === null) {
        value = getNestedValue(fallbackDictionary, key);
      }
      if (value === undefined || value === null) {
        return defaultVal !== undefined ? defaultVal : key;
      }

      if (typeof value !== 'string') {
        return value;
      }

      // Variable interpolation: replaces {var} or {{var}}
      if (params && typeof params === 'object') {
        return Object.entries(params).reduce((str, [paramKey, paramVal]) => {
          return str
            .replace(new RegExp(`{{\\s*${paramKey}\\s*}}`, 'g'), String(paramVal))
            .replace(new RegExp(`{\\s*${paramKey}\\s*}`, 'g'), String(paramVal));
        }, value);
      }

      return value;
    },
    [activeDictionary, fallbackDictionary]
  );

  const contextValue = useMemo(
    () => ({
      language,
      setLanguage: onLanguageChange,
      t,
      supportedLanguages: SUPPORTED_LANGUAGES,
    }),
    [language, onLanguageChange, t]
  );

  return <I18nContext.Provider value={contextValue}>{children}</I18nContext.Provider>;
}

export function useTranslation() {
  return useContext(I18nContext);
}
