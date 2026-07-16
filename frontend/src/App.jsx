import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import Navbar from './Navbar.jsx';
import Login from './Login.jsx';
import Home from './pages/Home.jsx';
import Tournaments from './pages/Tournaments.jsx';
import TournamentView from './pages/TournamentView.jsx';
import Players from './pages/Players.jsx';
import PlayerView from './pages/PlayerView.jsx';
import AdminPanel from './pages/AdminPanel.jsx';
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

const homeFor = (user) => (user?.role === 'admin' ? '/admin' : '/organizer');

function LoginPage({ user, setUser }) {
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate(homeFor(user), { replace: true });
  }, [user, navigate]);

  if (user) return null;
  return (
    <div className="page center">
      <Login onLogin={(u) => { setUser(u); navigate(homeFor(u)); }} />
    </div>
  );
}

function Shell({ user, setUser }) {
  const navigate = useNavigate();

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    navigate('/');
  }

  return (
    <>
      <Navbar user={user} onLogout={logout} />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/tournaments" element={<Tournaments />} />
        <Route path="/tournaments/:id" element={<TournamentView />} />
        <Route path="/players" element={<Players />} />
        <Route path="/players/:id" element={<PlayerView />} />
        <Route path="/login" element={<LoginPage user={user} setUser={setUser} />} />
        <Route path="/admin" element={<AdminPanel user={user} />} />
        <Route path="/organizer" element={<OrganizerDashboard user={user} />} />
        <Route path="/organizer/tournaments/:id" element={<TournamentAdmin user={user} />} />
        <Route path="/organizer/tournaments/:id/ratings" element={<ChangeRatings user={user} />} />
      </Routes>
    </>
  );
}

export default function App() {
  const [user, setUser] = useState(loadUser);

  return (
    <BrowserRouter>
      <Shell user={user} setUser={setUser} />
    </BrowserRouter>
  );
}
