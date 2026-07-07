import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiGet, apiPost, apiPut } from '../api.js';
import { CITIES_BY_FEDERATION, LEVELS, RATING_TYPES, RATED_RESULTS, NON_RATED_RESULTS } from '../constants.js';
import { statusLabel, levelLabel, ratingTypeLabel } from '../labels.js';

export default function TournamentAdmin({ user }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [tab, setTab] = useState('settings');
  const [tournament, setTournament] = useState(null);
  const [standings, setStandings] = useState([]);
  const [matches, setMatches] = useState([]);
  const [allPlayers, setAllPlayers] = useState([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const reload = useCallback(async () => {
    const [s, r, p] = await Promise.all([
      apiGet(`/tournaments/${id}/standings`),
      apiGet(`/tournaments/${id}/rounds`),
      apiGet('/players'),
    ]);
    setTournament(s.tournament);
    setStandings(s.standings);
    setMatches(r.rounds.flatMap((rd) => rd.pairings.map((m) => ({ ...m, round_number: rd.round_number }))));
    setAllPlayers(p);
  }, [id]);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    reload().catch((e) => setError(e.message));
  }, [user, navigate, reload]);

  if (!user) return null;
  if (error && !tournament) return <div className="page"><p className="error">{error}</p></div>;
  if (!tournament) return <div className="page"><p className="muted">{t('common.loading')}</p></div>;

  function flash(msg) { setNotice(msg); setError(''); setTimeout(() => setNotice(''), 2500); }

  async function act(fn, successMsg) {
    setError('');
    try {
      await fn();
      await reload();
      if (successMsg) flash(successMsg);
    } catch (e) {
      setError(e.message);
    }
  }

  const rated = tournament.rating_type !== 'non_rated';

  return (
    <div className="page">
      <p><Link to="/organizer">← {t('admin.backToList')}</Link></p>
      <h1>{tournament.name}</h1>
      <p className="muted">
        {tournament.federation} · {tournament.city} ·{' '}
        <span className={`badge badge-${tournament.status}`}>{statusLabel(t, tournament.status)}</span> ·{' '}
        {levelLabel(t, tournament.level)} · {ratingTypeLabel(t, tournament.rating_type)}
      </p>

      <div className="tabs">
        {[['settings', t('admin.settings')], ['participants', t('admin.participants')], ['results', t('admin.resultsEntry')]].map(([key, label]) => (
          <button key={key} className={`tab ${tab === key ? 'tab-active' : ''}`} onClick={() => setTab(key)}>{label}</button>
        ))}
        {rated && (
          <Link to={`/organizer/tournaments/${id}/ratings`} className="tab">{t('admin.changeRatings')}</Link>
        )}
      </div>

      {error && <p className="error">{error}</p>}
      {notice && <p className="notice">{notice}</p>}

      {tab === 'settings' && (
        <SettingsTab tournament={tournament} onSave={(body) => act(() => apiPut(`/tournaments/${id}`, body), t('common.save'))} />
      )}
      {tab === 'participants' && (
        <ParticipantsTab
          standings={standings}
          allPlayers={allPlayers}
          onAdd={(player_id) => act(() => apiPost(`/tournaments/${id}/add-player`, { player_id }))}
        />
      )}
      {tab === 'results' && (
        <ResultsTab
          matches={matches}
          standings={standings}
          onResult={(match_id, result) => act(() => apiPost(`/tournaments/${id}/results`, { match_id, result }))}
          onGenerate={() => act(async () => {
            const r = await apiPost(`/tournaments/${id}/generate-round`, {});
            flash(`Round ${r.round_number}: ${r.matches.length}`);
          })}
        />
      )}
    </div>
  );
}

function SettingsTab({ tournament, onSave }) {
  const { t } = useTranslation();
  const cities = CITIES_BY_FEDERATION[tournament.federation] || [];
  const [form, setForm] = useState({
    name: tournament.name,
    city: tournament.city || '',
    level: tournament.level,
    rating_type: tournament.rating_type,
    system_type: tournament.system_type,
    status: tournament.status,
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="card">
      <form className="form-grid" onSubmit={(e) => { e.preventDefault(); onSave(form); }}>
        <label>{t('fields.name')}
          <input value={form.name} onChange={(e) => set('name', e.target.value)} required />
        </label>
        <label>{t('admin.federationFixed')}
          <input value={tournament.federation} disabled />
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
        <label>{t('fields.system')}
          <select value={form.system_type} onChange={(e) => set('system_type', e.target.value)}>
            <option value="swiss">{t('system.swiss')}</option>
            <option value="round_robin">{t('system.round_robin')}</option>
          </select>
        </label>
        <label>{t('fields.status')}
          <select value={form.status} onChange={(e) => set('status', e.target.value)}>
            <option value="setup">{t('status.setup')}</option>
            <option value="ongoing">{t('status.ongoing')}</option>
            <option value="finished">{t('status.finished')}</option>
          </select>
        </label>
        <button type="submit">{t('common.save')}</button>
      </form>
    </div>
  );
}

function ParticipantsTab({ standings, allPlayers, onAdd }) {
  const { t } = useTranslation();
  const registered = new Set(standings.map((s) => s.player_id));
  const available = allPlayers.filter((p) => !registered.has(p.id));
  const [selected, setSelected] = useState('');

  return (
    <>
      <div className="card">
        <h2>{t('admin.addPlayer')}</h2>
        {available.length === 0 ? (
          <p className="muted">{t('admin.allRegistered')}</p>
        ) : (
          <form className="form-row" onSubmit={(e) => { e.preventDefault(); if (selected) onAdd(Number(selected)); setSelected(''); }}>
            <select value={selected} onChange={(e) => setSelected(e.target.value)} required>
              <option value="">{t('admin.selectPlayer')}</option>
              {available.map((p) => (
                <option key={p.id} value={p.id}>{p.first_name} {p.last_name} ({p.federation})</option>
              ))}
            </select>
            <button type="submit">{t('admin.add')}</button>
          </form>
        )}
      </div>

      <h2>{t('admin.participants')} ({standings.length})</h2>
      {standings.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead><tr><th>{t('fields.rank')}</th><th>{t('fields.player')}</th><th>{t('fields.startRating')}</th><th>{t('fields.points')}</th></tr></thead>
            <tbody>
              {standings.map((s, i) => (
                <tr key={s.player_id}>
                  <td>{i + 1}</td><td>{s.full_name}</td><td>{s.start_rating ?? '—'}</td><td>{s.current_points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function ResultsTab({ matches, standings, onResult, onGenerate }) {
  const { t } = useTranslation();
  const currentRound = matches.length ? Math.max(...matches.map((m) => m.round_number)) : 0;
  const currentMatches = matches.filter((m) => m.round_number === currentRound);
  const pending = currentMatches.filter((m) => m.player2_id && !m.result).length;

  const statusMsg = matches.length === 0
    ? t('admin.noRounds')
    : pending > 0
      ? t('admin.roundPending', { count: pending, n: currentRound })
      : t('admin.roundComplete', { n: currentRound });

  return (
    <>
      <div className="card generate-card">
        <div>
          <h2>{t('tournamentView.standings')}</h2>
          <p className="muted" style={{ margin: 0 }}>{statusMsg}</p>
        </div>
        <button onClick={onGenerate} disabled={pending > 0}>{t('admin.generateRound')}</button>
      </div>

      {[...new Set(matches.map((m) => m.round_number))].sort((a, b) => b - a).map((rn) => (
        <div key={rn}>
          <h2>{t('tournamentView.round', { n: rn })}</h2>
          <MatchList matches={matches.filter((m) => m.round_number === rn)} onResult={onResult} />
        </div>
      ))}
    </>
  );
}

function MatchList({ matches, onResult }) {
  const { t } = useTranslation();
  if (matches.length === 0) return <p className="muted">{t('tournamentView.noPairings')}</p>;
  return (
    <div className="match-list">
      {matches.map((m) => (
        <div className="match-row" key={m.id}>
          <span className="match-players">
            <strong>{m.player1_name}</strong> vs <strong>{m.player2_name || t('tournamentView.bye')}</strong>
            {m.result && <span className="badge badge-finished" style={{ marginLeft: '0.5rem' }}>{m.result}</span>}
          </span>
          {m.player2_id && (
            <span className="match-buttons">
              {RATED_RESULTS.map((r) => (
                <button key={r} className={`chip ${m.result === r ? 'chip-active' : ''}`} onClick={() => onResult(m.id, r)}>{r}</button>
              ))}
              <span className="result-sep" />
              {NON_RATED_RESULTS.map((r) => (
                <button key={r} className={`chip chip-alt ${m.result === r ? 'chip-active' : ''}`} onClick={() => onResult(m.id, r)}>{r}</button>
              ))}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
