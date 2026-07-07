import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiPost } from '../api.js';
import { FEDERATIONS } from '../constants.js';

const EMPTY = {
  first_name: '', last_name: '', middle_name: '', birth_year: '',
  federation: 'KAZ', club: '', title: '',
  rating_blitz: 1200, rating_rapid: 1200, rating_classic: 1200,
};

export default function PlayerRegister() {
  const { t } = useTranslation();
  const [form, setForm] = useState(EMPTY);
  const [created, setCreated] = useState(null);
  const [error, setError] = useState('');

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e) {
    e.preventDefault();
    setError('');
    try {
      const p = await apiPost('/players/register', { ...form, birth_year: Number(form.birth_year) || null });
      setCreated(p);
      setForm(EMPTY);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="page">
      <h1>{t('playerRegister.title')}</h1>
      <p className="muted">{t('playerRegister.hint')}</p>

      {created && (
        <p className="notice">
          {t('playerRegister.success')}{' '}
          <Link to={`/players/${created.id}`}>{created.first_name} {created.last_name}</Link>
        </p>
      )}

      <div className="card">
        <form onSubmit={submit} className="form-grid">
          <label>{t('fields.firstName')}
            <input value={form.first_name} onChange={(e) => set('first_name', e.target.value)} required />
          </label>
          <label>{t('fields.lastName')}
            <input value={form.last_name} onChange={(e) => set('last_name', e.target.value)} required />
          </label>
          <label>{t('fields.middleName')} <span className="muted">({t('common.optional')})</span>
            <input value={form.middle_name} onChange={(e) => set('middle_name', e.target.value)} />
          </label>
          <label>{t('fields.birthYear')}
            <input type="number" min="1900" max="2025" value={form.birth_year} onChange={(e) => set('birth_year', e.target.value)} />
          </label>
          <label>{t('fields.federation')}
            <select value={form.federation} onChange={(e) => set('federation', e.target.value)}>
              {FEDERATIONS.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </label>
          <label>{t('fields.club')} <span className="muted">({t('common.optional')})</span>
            <input value={form.club} onChange={(e) => set('club', e.target.value)} />
          </label>
          <label>{t('fields.title')} <span className="muted">({t('common.optional')})</span>
            <input value={form.title} onChange={(e) => set('title', e.target.value)} />
          </label>
          <label>{t('fields.ratingClassic')}
            <input type="number" value={form.rating_classic} onChange={(e) => set('rating_classic', e.target.value)} />
          </label>
          <label>{t('fields.ratingRapid')}
            <input type="number" value={form.rating_rapid} onChange={(e) => set('rating_rapid', e.target.value)} />
          </label>
          <label>{t('fields.ratingBlitz')}
            <input type="number" value={form.rating_blitz} onChange={(e) => set('rating_blitz', e.target.value)} />
          </label>
          {error && <div className="error">{error}</div>}
          <button type="submit">{t('playerRegister.submit')}</button>
        </form>
      </div>
    </div>
  );
}
