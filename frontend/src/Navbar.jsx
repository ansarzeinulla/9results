import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function Navbar({ user }) {
  const { t, i18n } = useTranslation();

  const setLang = (lng) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('lang', lng);
  };

  return (
    <nav className="navbar">
      <NavLink to="/" className="brand">{t('app.title')}</NavLink>
      <div className="nav-links">
        <NavLink to="/" end>{t('nav.home')}</NavLink>
        <NavLink to="/tournaments">{t('nav.tournaments')}</NavLink>
        <NavLink to="/players">{t('nav.players')}</NavLink>
        <NavLink to="/register-player">{t('nav.registerPlayer')}</NavLink>
        {user ? (
          <NavLink to="/organizer" className="login-link">{t('nav.dashboard')}</NavLink>
        ) : (
          <NavLink to="/login" className="login-link">{t('nav.organizerLogin')}</NavLink>
        )}
        <span className="lang-switch">
          <button className={i18n.language === 'en' ? 'active' : ''} onClick={() => setLang('en')}>EN</button>
          <button className={i18n.language === 'ru' ? 'active' : ''} onClick={() => setLang('ru')}>RU</button>
        </span>
      </div>
    </nav>
  );
}
