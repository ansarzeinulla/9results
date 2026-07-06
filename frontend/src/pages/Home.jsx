import { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiGet, STATUS_LABELS } from '../api.js';

export default function Home() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  async function search(e) {
    e.preventDefault();
    if (!q.trim()) return;
    setLoading(true);
    try {
      setResults(await apiGet(`/search?q=${encodeURIComponent(q)}`));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <div className="hero">
        <h1>results.togyz</h1>
        <p>Togyzkumalak tournament results and player ratings</p>
        <form onSubmit={search} className="search-bar">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search tournaments or players…"
          />
          <button type="submit" disabled={loading}>{loading ? '…' : 'Search'}</button>
        </form>
      </div>

      {results && (
        <div className="search-results">
          <h2>Tournaments</h2>
          {results.tournaments.length === 0 && <p className="muted">No tournaments found.</p>}
          <ul className="result-list">
            {results.tournaments.map((t) => (
              <li key={t.id}>
                <Link to={`/tournaments/${t.id}`}>{t.name}</Link>
                <span className="muted"> — {t.location} · {STATUS_LABELS[t.status] || t.status}</span>
              </li>
            ))}
          </ul>
          <h2>Players</h2>
          {results.players.length === 0 && <p className="muted">No players found.</p>}
          <ul className="result-list">
            {results.players.map((p) => (
              <li key={p.id}>
                <Link to={`/players/${p.id}`}>{p.full_name}</Link>
                <span className="muted"> — rating {p.current_rating}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
