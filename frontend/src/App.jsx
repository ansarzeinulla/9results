import { useState } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Navbar from './Navbar.jsx';
import Login from './Login.jsx';
import Home from './pages/Home.jsx';
import Tournaments from './pages/Tournaments.jsx';
import TournamentView from './pages/TournamentView.jsx';
import Players from './pages/Players.jsx';
import PlayerView from './pages/PlayerView.jsx';
import PlayerRegister from './pages/PlayerRegister.jsx';
import OrganizerDashboard from './pages/OrganizerDashboard.jsx';
import TournamentAdmin from './pages/TournamentAdmin.jsx';
import ChangeRatings from './pages/ChangeRatings.jsx';

function loadUser() {
  try {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    return token && user ? JSON.parse(user) : null;
  } catch {
    return null;
  }
}

function LoginPage({ user, setUser }) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  }

  if (user) {
    return (
      <div className="page center">
        <div className="login-card">
          <h1>{t('nav.dashboard')}</h1>
          <p className="subtitle">{user.username} · {user.federation}</p>
          <p><Link to="/organizer">{t('nav.dashboard')} →</Link></p>
          <button onClick={logout}>{t('nav.logout')}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page center">
      <Login onLogin={(u) => { setUser(u); navigate('/organizer'); }} />
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(loadUser);

  return (
    <BrowserRouter>
      <Navbar user={user} />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/tournaments" element={<Tournaments />} />
        <Route path="/tournaments/:id" element={<TournamentView />} />
        <Route path="/players" element={<Players />} />
        <Route path="/players/:id" element={<PlayerView />} />
        <Route path="/register-player" element={<PlayerRegister />} />
        <Route path="/login" element={<LoginPage user={user} setUser={setUser} />} />
        <Route path="/organizer" element={<OrganizerDashboard user={user} />} />
        <Route path="/organizer/tournaments/:id" element={<TournamentAdmin user={user} />} />
        <Route path="/organizer/tournaments/:id/ratings" element={<ChangeRatings user={user} />} />
      </Routes>
    </BrowserRouter>
  );
}
