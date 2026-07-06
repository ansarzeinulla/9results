import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiGet, STATUS_LABELS } from '../api.js';

const FILTERS = ['All', 'Upcoming', 'Live', 'Finished'];

export default function Tournaments() {
  const [filter, setFilter] = useState('All');
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const query = filter === 'All' ? '' : `?status=${filter.toLowerCase()}`;
    apiGet(`/tournaments${query}`)
      .then(setTournaments)
      .finally(() => setLoading(false));
  }, [filter]);

  return (
    <div className="page">
      <h1>Tournaments</h1>
      <div className="filter-row">
        {FILTERS.map((f) => (
          <button
            key={f}
            className={`chip ${filter === f ? 'chip-active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>
      {loading ? (
        <p className="muted">Loading…</p>
      ) : tournaments.length === 0 ? (
        <p className="muted">No tournaments.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th><th>Location</th><th>Status</th><th>System</th><th>Players</th>
              </tr>
            </thead>
            <tbody>
              {tournaments.map((t) => (
                <tr key={t.id}>
                  <td><Link to={`/tournaments/${t.id}`}>{t.name}</Link></td>
                  <td>{t.location}</td>
                  <td><span className={`badge badge-${t.status}`}>{STATUS_LABELS[t.status] || t.status}</span></td>
                  <td>{t.system_type === 'round_robin' ? 'Round Robin' : 'Swiss'}</td>
                  <td>{t.player_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
