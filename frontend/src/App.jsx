import { useState } from 'react';
import Login from './Login.jsx';

function loadUser() {
  try {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    return token && user ? JSON.parse(user) : null;
  } catch {
    return null;
  }
}

export default function App() {
  const [user, setUser] = useState(loadUser);

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  }

  if (!user) return <Login onLogin={setUser} />;

  return (
    <div className="login-card">
      <h1>results.togyz</h1>
      <p className="subtitle">Signed in as <strong>{user.username}</strong></p>
      <p>Tournament dashboard coming in Phase 2.</p>
      <button onClick={logout}>Log out</button>
    </div>
  );
}
