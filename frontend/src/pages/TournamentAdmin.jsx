import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiGet, apiPost, apiPut } from '../api.js';
import { LEVELS, RATING_TYPES, GENDERS, AGE_CATEGORIES, RATED_RESULTS, NON_RATED_RESULTS } from '../constants.js';
import { useFederations, citiesOf } from '../federations.js';
import { statusLabel, levelLabel, ratingTypeLabel, genderLabel, ageLabel } from '../labels.js';

export default function TournamentAdmin({ user }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [tab, setTab] = useState('settings');
  const [tournament, setTournament] = useState(null);
  const [standings, setStandings] = useState([]);
  const [rounds, setRounds] = useState([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const reload = useCallback(async () => {
    const [s, r] = await Promise.all([
      apiGet(`/tournaments/${id}/standings`),
      apiGet(`/tournaments/${id}/rounds`),
    ]);
    setTournament(s.tournament);
    setStandings(s.standings);
    setRounds(r.rounds);
  }, [id]);

  useEffect(() => {
    if (!user || user.role !== 'organizer') { navigate('/login'); return; }
    reload().catch((e) => setError(e.message));
  }, [user, navigate, reload]);

  if (!user || user.role !== 'organizer') return null;
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
        {levelLabel(t, tournament.level)} · {ratingTypeLabel(t, tournament.rating_type)} ·{' '}
        {genderLabel(t, tournament.gender)} · {ageLabel(t, tournament.age_category)}
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
          onAdd={(player_id) => act(() => apiPost(`/tournaments/${id}/add-player`, { player_id }))}
        />
      )}
      {tab === 'results' && (
        <ResultsTab
          rounds={rounds}
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
  const federations = useFederations();
  const cities = citiesOf(federations, tournament.federation);
  const [form, setForm] = useState({
    name: tournament.name,
    city: tournament.city || '',
    level: tournament.level,
    rating_type: tournament.rating_type,
    gender: tournament.gender,
    age_category: tournament.age_category,
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

// Organizers add players by typing the player ID, then confirming.
function ParticipantsTab({ standings, onAdd }) {
  const { t } = useTranslation();
  const [idInput, setIdInput] = useState('');
  const [found, setFound] = useState(null);
  const [lookupError, setLookupError] = useState('');
  const registered = new Set(standings.map((s) => s.player_id));

  async function find(e) {
    e.preventDefault();
    setLookupError('');
    setFound(null);
    try {
      const { player } = await apiGet(`/players/${Number(idInput)}`);
      setFound(player);
    } catch {
      setLookupError(t('admin.notFound'));
    }
  }

  function add() {
    onAdd(found.id);
    setFound(null);
    setIdInput('');
  }

  return (
    <>
      <div className="card">
        <h2>{t('admin.addById')}</h2>
        <form className="form-row" onSubmit={find}>
          <input
            type="number"
            min="1"
            placeholder={t('admin.enterId')}
            value={idInput}
            onChange={(e) => { setIdInput(e.target.value); setFound(null); setLookupError(''); }}
            required
          />
          <button type="submit">{t('admin.find')}</button>
        </form>
        {lookupError && <p className="error">{lookupError}</p>}
        {found && (
          <div className="player-confirm">
            <p>
              <strong>#{found.id} {found.first_name} {found.last_name}</strong> · {found.federation}
              {found.club ? ` · ${found.club}` : ''}
              {' · '}{t('fields.ratingClassic')}: {found.rating_classic}
            </p>
            {registered.has(found.id) ? (
              <p className="muted">{t('admin.allRegistered')}</p>
            ) : (
              <button type="button" onClick={add}>{t('admin.confirmAdd')}</button>
            )}
          </div>
        )}
      </div>

      <h2>{t('admin.participants')} ({standings.length})</h2>
      {standings.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead><tr><th>{t('fields.rank')}</th><th>ID</th><th>{t('fields.player')}</th><th>{t('fields.startRating')}</th><th>{t('fields.points')}</th></tr></thead>
            <tbody>
              {standings.map((s, i) => (
                <tr key={s.player_id}>
                  <td>{i + 1}</td><td>{s.player_id}</td><td>{s.full_name}</td><td>{s.start_rating ?? '—'}</td><td>{s.current_points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

// One table per round, newest first, with board numbers and a result select.
function ResultsTab({ rounds, onResult, onGenerate }) {
  const { t } = useTranslation();
  const currentRound = rounds.length ? rounds[rounds.length - 1].round_number : 0;
  const currentPairings = rounds.find((r) => r.round_number === currentRound)?.pairings || [];
  const pending = currentPairings.filter((m) => m.player2_id && !m.result).length;

  const statusMsg = rounds.length === 0
    ? t('admin.noRounds')
    : pending > 0
      ? t('admin.roundPending', { count: pending, n: currentRound })
      : t('admin.roundComplete', { n: currentRound });

  return (
    <>
      <div className="card generate-card">
        <p className="muted" style={{ margin: 0 }}>{statusMsg}</p>
        <button onClick={onGenerate} disabled={pending > 0}>{t('admin.generateRound')}</button>
      </div>

      {[...rounds].sort((a, b) => b.round_number - a.round_number).map((round) => (
        <div key={round.round_number}>
          <h2>{t('tournamentView.round', { n: round.round_number })}</h2>
          <RoundTable pairings={round.pairings} onResult={onResult} />
        </div>
      ))}
    </>
  );
}

function RoundTable({ pairings, onResult }) {
  const { t } = useTranslation();
  if (pairings.length === 0) return <p className="muted">{t('tournamentView.noPairings')}</p>;
  const results = [...RATED_RESULTS, ...NON_RATED_RESULTS];

  return (
    <div className="table-wrap round-table">
      <table className="cr-table">
        <thead>
          <tr>
            <th>{t('fields.board')}</th>
            <th>{t('fields.player')} 1</th>
            <th>{t('fields.result')}</th>
            <th>{t('fields.player')} 2</th>
          </tr>
        </thead>
        <tbody>
          {pairings.map((m) => (
            <tr key={m.id} className={m.player2_id && !m.result ? 'row-pending' : ''}>
              <td className="cr-result">{m.board_number ?? '—'}</td>
              <td><strong>{m.player1_name}</strong></td>
              <td className="cr-result">
                {m.player2_id ? (
                  <select
                    className="result-select"
                    value={m.result || ''}
                    onChange={(e) => e.target.value && onResult(m.id, e.target.value)}
                  >
                    <option value="">—</option>
                    {results.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                ) : (
                  m.result
                )}
              </td>
              <td>{m.player2_id ? <strong>{m.player2_name}</strong> : <span className="muted">{t('tournamentView.bye')}</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
