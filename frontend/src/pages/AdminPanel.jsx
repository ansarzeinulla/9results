import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiGet, apiPost, apiPut } from '../api.js';
import { useFederations } from '../federations.js';

const EMPTY = {
  first_name: '', last_name: '', middle_name: '', birth_year: '',
  federation: 'KAZ', club: '', title: '',
  rating_blitz: 1200, rating_rapid: 1200, rating_classic: 1200,
};

function PlayerForm({ initial, federations, onSubmit, submitLabel }) {
  const { t } = useTranslation();
  const [form, setForm] = useState(initial);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <form className="form-grid form-grid-wide" onSubmit={(e) => { e.preventDefault(); onSubmit(form); }}>
      <label>{t('fields.firstName')}
        <input value={form.first_name} onChange={(e) => set('first_name', e.target.value)} required />
      </label>
      <label>{t('fields.lastName')}
        <input value={form.last_name} onChange={(e) => set('last_name', e.target.value)} required />
      </label>
      <label>{t('fields.middleName')} <span className="muted">({t('common.optional')})</span>
        <input value={form.middle_name || ''} onChange={(e) => set('middle_name', e.target.value)} />
      </label>
      <label>{t('fields.birthYear')}
        <input type="number" min="1900" max="2026" value={form.birth_year ?? ''} onChange={(e) => set('birth_year', e.target.value)} />
      </label>
      <label>{t('fields.federation')}
        <select value={form.federation} onChange={(e) => set('federation', e.target.value)}>
          {federations.map((f) => <option key={f.code} value={f.code}>{f.code}</option>)}
        </select>
      </label>
      <label>{t('fields.club')} <span className="muted">({t('common.optional')})</span>
        <input value={form.club || ''} onChange={(e) => set('club', e.target.value)} />
      </label>
      <label>{t('fields.title')} <span className="muted">({t('common.optional')})</span>
        <input value={form.title || ''} onChange={(e) => set('title', e.target.value)} />
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
      <button type="submit">{submitLabel}</button>
    </form>
  );
}

export default function AdminPanel({ user }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const federations = useFederations();
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ players: [], total: 0, page_size: 25 });
  const [editing, setEditing] = useState(null); // player being edited
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(() => {
    apiGet(`/admin/players?q=${encodeURIComponent(q)}&page=${page}`)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [q, page]);

  useEffect(() => {
    if (!user || user.role !== 'admin') { navigate('/login'); return; }
    load();
  }, [user, navigate, load]);

  if (!user || user.role !== 'admin') return null;

  function flash(msg) { setNotice(msg); setError(''); setTimeout(() => setNotice(''), 2500); }

  async function createPlayer(form) {
    setError('');
    try {
      const p = await apiPost('/admin/players', { ...form, birth_year: Number(form.birth_year) || null });
      setShowAdd(false);
      flash(`${t('adminPanel.created')} #${p.id} ${p.first_name} ${p.last_name}`);
      load();
    } catch (e) { setError(e.message); }
  }

  async function savePlayer(form) {
    setError('');
    try {
      await apiPut(`/admin/players/${editing.id}`, { ...form, birth_year: Number(form.birth_year) || null });
      setEditing(null);
      flash(t('adminPanel.saved'));
      load();
    } catch (e) { setError(e.message); }
  }

  const pages = Math.max(1, Math.ceil(data.total / data.page_size));

  return (
    <div className="page">
      <div className="db-header">
        <h1>{t('adminPanel.title')}</h1>
        <button type="button" onClick={() => { setShowAdd((s) => !s); setEditing(null); }}>
          {showAdd ? t('common.cancel') : t('adminPanel.addPlayer')}
        </button>
      </div>

      {error && <p className="error">{error}</p>}
      {notice && <p className="notice">{notice}</p>}

      {showAdd && (
        <div className="card">
          <h2>{t('adminPanel.addPlayer')}</h2>
          <PlayerForm initial={EMPTY} federations={federations} onSubmit={createPlayer} submitLabel={t('adminPanel.addPlayer')} />
        </div>
      )}

      {editing && (
        <div className="card">
          <h2>{t('adminPanel.editPlayer', { id: editing.id })}</h2>
          <PlayerForm
            key={editing.id}
            initial={editing}
            federations={federations}
            onSubmit={savePlayer}
            submitLabel={t('common.save')}
          />
        </div>
      )}

      <div className="search-bar compact" style={{ margin: '0 0 1rem' }}>
        <input
          placeholder={t('adminPanel.searchPlaceholder')}
          value={q}
          onChange={(e) => { setQ(e.target.value); setPage(1); }}
        />
      </div>
      <p className="muted">{t('adminPanel.total', { count: data.total })}</p>

      <div className="table-wrap">
        <table className="cr-table">
          <thead>
            <tr>
              <th>ID</th><th>{t('fields.player')}</th><th>{t('fields.federation')}</th>
              <th>{t('fields.birthYear')}</th><th>{t('fields.club')}</th><th>{t('fields.title')}</th>
              <th>{t('fields.ratingClassic')}</th><th>{t('fields.ratingRapid')}</th><th>{t('fields.ratingBlitz')}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {data.players.map((p) => (
              <tr key={p.id}>
                <td><strong>{p.id}</strong></td>
                <td><Link to={`/players/${p.id}`}>{p.first_name} {p.last_name}</Link></td>
                <td>{p.federation}</td>
                <td>{p.birth_year || ''}</td>
                <td>{p.club || ''}</td>
                <td>{p.title || ''}</td>
                <td>{p.rating_classic}</td>
                <td>{p.rating_rapid}</td>
                <td>{p.rating_blitz}</td>
                <td>
                  <button type="button" className="chip" onClick={() => { setEditing(p); setShowAdd(false); window.scrollTo(0, 0); }}>
                    {t('adminPanel.edit')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="filter-row" style={{ marginTop: '1rem' }}>
          <button type="button" className="chip" disabled={page <= 1} onClick={() => setPage(page - 1)}>{t('adminPanel.prev')}</button>
          <span className="muted">{page} / {pages}</span>
          <button type="button" className="chip" disabled={page >= pages} onClick={() => setPage(page + 1)}>{t('adminPanel.next')}</button>
        </div>
      )}
    </div>
  );
}
