import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LangDropdown from './LangDropdown.jsx';

export default function Navbar({ user, onLogout }) {
  const { t } = useTranslation();

  return (
    <nav className="navbar">
      <NavLink to="/" className="brand">{t('app.title')}</NavLink>
      <div className="nav-links">
        <NavLink to="/" end>{t('nav.home')}</NavLink>
        <NavLink to="/tournaments">{t('nav.tournaments')}</NavLink>
        <NavLink to="/players">{t('nav.players')}</NavLink>
        {user?.role === 'admin' && <NavLink to="/admin">{t('nav.adminPanel')}</NavLink>}
        {user?.role === 'organizer' && <NavLink to="/organizer">{t('nav.dashboard')}</NavLink>}
        {user ? (
          <button type="button" className="logout-btn" onClick={onLogout}>{t('nav.logout')}</button>
        ) : (
          <NavLink to="/login" className="login-link">{t('nav.login')}</NavLink>
        )}
        <LangDropdown />
      </div>
    </nav>
  );
}
