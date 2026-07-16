import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

const LANGUAGES = [
  { code: 'en', flag: '🇬🇧', name: 'English' },
  { code: 'ru', flag: '🇷🇺', name: 'Русский' },
];

export default function LangDropdown() {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const current = LANGUAGES.find((l) => i18n.language.startsWith(l.code)) || LANGUAGES[0];

  const select = (code) => {
    i18n.changeLanguage(code);
    localStorage.setItem('lang', code);
    setOpen(false);
  };

  return (
    <span className="lang-dropdown" ref={ref}>
      <button type="button" className="lang-current" onClick={() => setOpen((o) => !o)} aria-haspopup="listbox" aria-expanded={open}>
        <span className="lang-flag">{current.flag}</span> {current.name} <span className="lang-caret">▾</span>
      </button>
      {open && (
        <ul className="lang-menu" role="listbox">
          {LANGUAGES.map((l) => (
            <li key={l.code}>
              <button type="button" className={l.code === current.code ? 'active' : ''} onClick={() => select(l.code)}>
                <span className="lang-flag">{l.flag}</span> {l.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </span>
  );
}
