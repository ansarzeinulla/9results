import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiGet, apiPost, STATUS_LABELS } from '../api.js';

export default function OrganizerDashboard({ user }) {
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', location: '', system_type: 'swiss' });

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    apiGet('/my/tournaments').then(setTournaments).catch((e) => setError(e.message));
  }, [user, navigate]);

  async function createTournament(e) {
    e.preventDefault();
    setError('');
    try {
      const t = await apiPost('/tournaments', form);
      navigate(`/organizer/tournaments/${t.id}`);
    } catch (err) {
      setError(err.message);
    }
  }

  if (!user) return null;

  return (
    <div className="page">
      <h1>My Tournaments</h1>
      {error && <p className="error">{error}</p>}

      {tournaments && tournaments.length > 0 && (
        <div className="table-wrap" style={{ marginBottom: '1.5rem' }}>
          <table>
            <thead>
              <tr><th>Name</th><th>Location</th><th>Status</th><th>Players</th><th></th></tr>
            </thead>
            <tbody>
              {tournaments.map((t) => (
                <tr key={t.id}>
                  <td><Link to={`/organizer/tournaments/${t.id}`}>{t.name}</Link></td>
                  <td>{t.location}</td>
                  <td><span className={`badge badge-${t.status}`}>{STATUS_LABELS[t.status]}</span></td>
                  <td>{t.player_count}</td>
                  <td><Link to={`/tournaments/${t.id}`}>Public page</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {tournaments && tournaments.length === 0 && <p className="muted">No tournaments yet — create one below.</p>}

      <div className="card">
        <h2>Create Tournament</h2>
        <form onSubmit={createTournament} className="form-grid">
          <label>
            Name
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </label>
          <label>
            Location
            <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          </label>
          <label>
            System
            <select
              value={form.system_type}
              onChange={(e) => setForm({ ...form, system_type: e.target.value })}
            >
              <option value="swiss">Swiss</option>
              <option value="round_robin">Round Robin</option>
            </select>
          </label>
          <button type="submit">Create</button>
        </form>
      </div>
    </div>
  );
}
