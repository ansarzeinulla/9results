import { useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import Navbar from './Navbar.jsx';
import Login from './Login.jsx';
import Home from './pages/Home.jsx';
import Tournaments from './pages/Tournaments.jsx';
import TournamentView from './pages/TournamentView.jsx';
import Players from './pages/Players.jsx';
import PlayerView from './pages/PlayerView.jsx';

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

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  }

  if (user) {
    return (
      <div className="page center">
        <div className="login-card">
          <h1>Organizer</h1>
          <p className="subtitle">Signed in as <strong>{user.username}</strong></p>
          <p>Tournament management coming in Phase 3.</p>
          <button onClick={logout}>Log out</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page center">
      <Login onLogin={(u) => { setUser(u); navigate('/login'); }} />
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(loadUser);

  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/tournaments" element={<Tournaments />} />
        <Route path="/tournaments/:id" element={<TournamentView />} />
        <Route path="/players" element={<Players />} />
        <Route path="/players/:id" element={<PlayerView />} />
        <Route path="/login" element={<LoginPage user={user} setUser={setUser} />} />
      </Routes>
    </BrowserRouter>
  );
}
