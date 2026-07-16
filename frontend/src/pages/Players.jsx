import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiGet } from '../api.js';
import { useFederations } from '../federations.js';

export default function Players() {
  const { t } = useTranslation();
  const federations = useFederations();
  const [players, setPlayers] = useState(null);
  const [filters, setFilters] = useState({ federation: '', q: '', birth_year: '', title: '', id: '' });

  useEffect(() => {
    const qs = Object.entries(filters)
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join('&');
    apiGet(`/players${qs ? '?' + qs : ''}`).then(setPlayers);
  }, [filters]);

  const set = (k, v) => setFilters((f) => ({ ...f, [k]: v }));

  return (
    <div className="page">
      <h1>{t('players.title')}</h1>
      <div className="filter-grid">
        <select value={filters.federation} onChange={(e) => set('federation', e.target.value)}>
          <option value="">{t('tournaments.anyFederation')}</option>
          {federations.map((f) => <option key={f.code} value={f.code}>{f.code}</option>)}
        </select>
        <input
          placeholder={t('players.searchName')}
          value={filters.q}
          onChange={(e) => set('q', e.target.value)}
        />
        <input
          type="number"
          placeholder={t('fields.birthYear')}
          value={filters.birth_year}
          onChange={(e) => set('birth_year', e.target.value)}
        />
        <input
          placeholder={t('fields.title')}
          value={filters.title}
          onChange={(e) => set('title', e.target.value)}
        />
        <input
          type="number"
          placeholder={t('fields.playerId')}
          value={filters.id}
          onChange={(e) => set('id', e.target.value)}
        />
      </div>
      {!players ? (
        <p className="muted">{t('common.loading')}</p>
      ) : players.length === 0 ? (
        <p className="muted">{t('home.noPlayers')}</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th><th>{t('fields.player')}</th><th>{t('fields.federation')}</th>
                <th>{t('fields.birthYear')}</th>
                <th>{t('fields.title')}</th><th>{t('ratingType.classic')}</th><th>{t('ratingType.rapid')}</th><th>{t('ratingType.blitz')}</th>
              </tr>
            </thead>
            <tbody>
              {players.map((p) => (
                <tr key={p.id}>
                  <td>{p.id}</td>
                  <td><Link to={`/players/${p.id}`}>{p.first_name} {p.last_name}</Link></td>
                  <td>{p.federation}</td>
                  <td>{p.birth_year || '—'}</td>
                  <td>{p.title || '—'}</td>
                  <td>{p.rating_classic}</td>
                  <td>{p.rating_rapid}</td>
                  <td>{p.rating_blitz}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
