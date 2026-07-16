import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiGet, apiPost } from '../api.js';
import { LEVELS, RATING_TYPES, GENDERS, AGE_CATEGORIES } from '../constants.js';
import { useFederations, citiesOf } from '../federations.js';
import { statusLabel, levelLabel, ratingTypeLabel, genderLabel, ageLabel } from '../labels.js';

export default function OrganizerDashboard({ user }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const federations = useFederations();
  const [tournaments, setTournaments] = useState(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '', city: '', level: 'Regional', rating_type: 'non_rated', gender: 'all', age_category: 'all',
  });

  const cities = user ? citiesOf(federations, user.federation) : [];

  useEffect(() => {
    if (!user || user.role !== 'organizer') { navigate('/login'); return; }
    apiGet('/my/tournaments').then(setTournaments).catch((e) => setError(e.message));
  }, [user, navigate]);

  async function createTournament(e) {
    e.preventDefault();
    setError('');
    try {
      const tt = await apiPost('/tournaments', form);
      navigate(`/organizer/tournaments/${tt.id}`);
    } catch (err) {
      setError(err.message);
    }
  }

  if (!user || user.role !== 'organizer') return null;
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="page">
      <h1>{t('dashboard.title')} <span className="muted">· {user.federation}</span></h1>
      {error && <p className="error">{error}</p>}

      <div className="card">
        <h2>{t('dashboard.create')}</h2>
        <form onSubmit={createTournament} className="form-grid form-grid-wide">
          <label>{t('fields.name')}
            <input value={form.name} onChange={(e) => set('name', e.target.value)} required />
          </label>
          <label>{t('admin.federationFixed')}
            <input value={user.federation} disabled />
          </label>
          <label>{t('fields.city')}
            <select value={form.city} onChange={(e) => set('city', e.target.value)}>
              <option value="">{t('tournaments.anyCity')}</option>
              {cities.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label>{t('fields.level')}
            <select value={form.level} onChange={(e) => set('level', e.target.value)}>
              {LEVELS.map((l) => <option key={l} value={l}>{levelLabel(t, l)}</option>)}
            </select>
          </label>
          <label>{t('fields.ratingType')}
            <select value={form.rating_type} onChange={(e) => set('rating_type', e.target.value)}>
              {RATING_TYPES.map((r) => <option key={r} value={r}>{ratingTypeLabel(t, r)}</option>)}
            </select>
          </label>
          <label>{t('fields.gender')}
            <select value={form.gender} onChange={(e) => set('gender', e.target.value)}>
              {GENDERS.map((g) => <option key={g} value={g}>{genderLabel(t, g)}</option>)}
            </select>
          </label>
          <label>{t('fields.ageCategory')}
            <select value={form.age_category} onChange={(e) => set('age_category', e.target.value)}>
              {AGE_CATEGORIES.map((a) => <option key={a} value={a}>{ageLabel(t, a)}</option>)}
            </select>
          </label>
          <button type="submit">{t('dashboard.createBtn')}</button>
        </form>
      </div>

      {tournaments && tournaments.length > 0 && (
        <div className="table-wrap" style={{ marginBottom: '1.5rem' }}>
          <table className="dash-table">
            <thead>
              <tr>
                <th>{t('fields.name')}</th><th>{t('fields.city')}</th><th>{t('fields.level')}</th>
                <th>{t('fields.ratingType')}</th><th>{t('fields.gender')}</th><th>{t('fields.ageCategory')}</th>
                <th>{t('fields.status')}</th><th>{t('fields.players')}</th><th></th>
              </tr>
            </thead>
            <tbody>
              {tournaments.map((tt) => (
                <tr key={tt.id}>
                  <td className="cell-name" title={tt.name}><Link to={`/organizer/tournaments/${tt.id}`}>{tt.name}</Link></td>
                  <td>{tt.city}</td>
                  <td>{levelLabel(t, tt.level)}</td>
                  <td>{ratingTypeLabel(t, tt.rating_type)}</td>
                  <td>{genderLabel(t, tt.gender)}</td>
                  <td>{ageLabel(t, tt.age_category)}</td>
                  <td><span className={`badge badge-${tt.status}`}>{statusLabel(t, tt.status)}</span></td>
                  <td>{tt.player_count}</td>
                  <td><Link to={`/tournaments/${tt.id}`}>{t('common.publicPage')}</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {tournaments && tournaments.length === 0 && <p className="muted">{t('dashboard.empty')}</p>}
    </div>
  );
}
