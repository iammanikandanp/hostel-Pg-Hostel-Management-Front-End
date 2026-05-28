import { create } from 'zustand';
import translations from '../i18n/translations';

const LANGS = [
  { code: 'en', label: 'English',  native: 'English' },
  { code: 'ta', label: 'Tamil',    native: 'தமிழ்'   },
  { code: 'hi', label: 'Hindi',    native: 'हिंदी'    },
];

const saved = localStorage.getItem('hst_lang') || 'en';

export const useHstLangStore = create((set, get) => ({
  lang: saved,
  langs: LANGS,

  setLang: (code) => {
    localStorage.setItem('hst_lang', code);
    set({ lang: code });
  },

  t: (key) => {
    const { lang } = get();
    return translations[lang]?.[key] ?? translations['en']?.[key] ?? key;
  },
}));
