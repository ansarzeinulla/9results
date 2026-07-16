import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import eng from './languages/eng.json';
import rus from './languages/rus.json';
import kaz from './languages/kaz.json';

const stored = localStorage.getItem('lang');

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: eng },
    ru: { translation: rus },
    kk: { translation: kaz },
  },
  lng: stored || 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
