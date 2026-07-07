import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiGet } from '../api.js';
import { FEDERATIONS, CITIES_BY_FEDERATION, LEVELS, RATING_TYPES } from '../constants.js';
import { statusLabel, levelLabel, ratingTypeLabel, systemLabel } from '../labels.js';

const STATUSES = ['upcoming', 'live', 'finished'];

export default function Tournaments() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState({
    q: searchParams.get('q') || '',
    federation: '', city: '', status: '', level: '', rating_type: '',
    created_from: '', created_to: '',
  });
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);

  const cities = useMemo(
    () => (filters.federation ? CITIES_BY_FEDERATION[filters.federation] || [] : []),
    [filters.federation]
  );

  useEffect(() => {
    setLoading(true);
    const qs = Object.entries(filters)
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join('&');
    apiGet(`/tournaments${qs ? '?' + qs : ''}`)
      .then(setTournaments)
      .finally(() => setLoading(false));
  }, [filters]);

  const set = (k, v) => setFilters((f) => ({ ...f, [k]: v, ...(k === 'federation' ? { city: '' } : {}) }));

  return (
    <div className="page">
      <h1>{t('tournaments.title')}</h1>

      <div className="filter-grid">
        <select value={filters.federation} onChange={(e) => set('federation', e.target.value)}>
          <option value="">{t('tournaments.anyFederation')}</option>
          {FEDERATIONS.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
        <select value={filters.city} onChange={(e) => set('city', e.target.value)} disabled={!filters.federation}>
          <option value="">{t('tournaments.anyCity')}</option>
          {cities.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filters.status} onChange={(e) => set('status', e.target.value)}>
          <option value="">{t('tournaments.anyStatus')}</option>
          {STATUSES.map((s) => <option key={s} value={s}>{statusLabel(t, { upcoming: 'setup', live: 'ongoing', finished: 'finished' }[s])}</option>)}
        </select>
        <select value={filters.level} onChange={(e) => set('level', e.target.value)}>
          <option value="">{t('tournaments.anyLevel')}</option>
          {LEVELS.map((l) => <option key={l} value={l}>{levelLabel(t, l)}</option>)}
        </select>
        <select value={filters.rating_type} onChange={(e) => set('rating_type', e.target.value)}>
          <option value="">{t('tournaments.anyRatingType')}</option>
          {RATING_TYPES.map((r) => <option key={r} value={r}>{ratingTypeLabel(t, r)}</option>)}
        </select>
        <label className="date-filter">{t('fields.createdAt')}
          <input type="date" value={filters.created_from} onChange={(e) => set('created_from', e.target.value)} />
        </label>
        <label className="date-filter">→
          <input type="date" value={filters.created_to} onChange={(e) => set('created_to', e.target.value)} />
        </label>
      </div>

      {loading ? (
        <p className="muted">{t('common.loading')}</p>
      ) : tournaments.length === 0 ? (
        <p className="muted">{t('tournaments.empty')}</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t('fields.name')}</th><th>{t('fields.federation')}</th><th>{t('fields.city')}</th>
                <th>{t('fields.level')}</th><th>{t('fields.ratingType')}</th><th>{t('fields.status')}</th>
                <th>{t('fields.system')}</th><th>{t('fields.players')}</th>
              </tr>
            </thead>
            <tbody>
              {tournaments.map((tt) => (
                <tr key={tt.id}>
                  <td><Link to={`/tournaments/${tt.id}`}>{tt.name}</Link></td>
                  <td>{tt.federation}</td>
                  <td>{tt.city}</td>
                  <td>{levelLabel(t, tt.level)}</td>
                  <td>{ratingTypeLabel(t, tt.rating_type)}</td>
                  <td><span className={`badge badge-${tt.status}`}>{statusLabel(t, tt.status)}</span></td>
                  <td>{systemLabel(t, tt.system_type)}</td>
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
