import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiGet } from '../api.js';
import { statusLabel, ratingTypeLabel } from '../labels.js';

export default function Home() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [tournaments, setTournaments] = useState(null);

  useEffect(() => {
    apiGet('/tournaments').then(setTournaments).catch(() => setTournaments([]));
  }, []);

  function search(e) {
    e.preventDefault();
    if (q.trim()) navigate(`/tournaments?q=${encodeURIComponent(q)}`);
  }

  return (
    <div className="page">
      <div className="db-header">
        <h1>{t('app.title')}</h1>
        <form onSubmit={search} className="search-bar compact">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('home.searchPlaceholder')} />
          <button type="submit">{t('common.search')}</button>
        </form>
      </div>
      <p className="muted">{t('app.tagline')}</p>

      <h2>{t('nav.tournaments')}</h2>
      {!tournaments ? (
        <p className="muted">{t('common.loading')}</p>
      ) : tournaments.length === 0 ? (
        <p className="muted">{t('home.noTournaments')}</p>
      ) : (
        <div className="table-wrap">
          <table className="cr-table">
            <thead>
              <tr>
                <th>#</th><th>{t('fields.name')}</th><th>{t('fields.federation')}</th><th>{t('fields.city')}</th>
                <th>{t('fields.timeControl')}</th><th>{t('fields.status')}</th><th>{t('fields.players')}</th>
              </tr>
            </thead>
            <tbody>
              {tournaments.map((tt, i) => (
                <tr key={tt.id}>
                  <td>{i + 1}</td>
                  <td><Link to={`/tournaments/${tt.id}`}>{tt.name}</Link></td>
                  <td>{tt.federation}</td>
                  <td>{tt.city}</td>
                  <td>{ratingTypeLabel(t, tt.rating_type)}</td>
                  <td><span className={`badge badge-${tt.status}`}>{statusLabel(t, tt.status)}</span></td>
                  <td>{tt.player_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
