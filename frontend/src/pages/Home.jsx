import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiGet } from '../api.js';
import { statusLabel } from '../labels.js';

export default function Home() {
  const { t } = useTranslation();
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
        <h1>{t('app.title')}</h1>
        <p>{t('app.tagline')}</p>
        <form onSubmit={search} className="search-bar">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('home.searchPlaceholder')} />
          <button type="submit" disabled={loading}>{loading ? '…' : t('common.search')}</button>
        </form>
      </div>

      {results && (
        <div className="search-results">
          <h2>{t('home.tournaments')}</h2>
          {results.tournaments.length === 0 && <p className="muted">{t('home.noTournaments')}</p>}
          <ul className="result-list">
            {results.tournaments.map((tt) => (
              <li key={tt.id}>
                <Link to={`/tournaments/${tt.id}`}>{tt.name}</Link>
                <span className="muted"> — {tt.city} · {statusLabel(t, tt.status)}</span>
              </li>
            ))}
          </ul>
          <h2>{t('home.players')}</h2>
          {results.players.length === 0 && <p className="muted">{t('home.noPlayers')}</p>}
          <ul className="result-list">
            {results.players.map((p) => (
              <li key={p.id}>
                <Link to={`/players/${p.id}`}>{p.first_name} {p.last_name}</Link>
                <span className="muted"> — {p.federation} · {p.rating_classic}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
