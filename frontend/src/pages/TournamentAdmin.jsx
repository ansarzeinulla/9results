import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { apiGet, apiPost, apiPut, STATUS_LABELS } from '../api.js';

const RESULT_BUTTONS = ['1-0', '0.5-0.5', '0-1', '0-0'];

export default function TournamentAdmin({ user }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState('settings');
  const [tournament, setTournament] = useState(null);
  const [standings, setStandings] = useState([]);
  const [matches, setMatches] = useState([]);
  const [allPlayers, setAllPlayers] = useState([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const reload = useCallback(async () => {
    const [s, m, p] = await Promise.all([
      apiGet(`/tournaments/${id}/standings`),
      apiGet(`/tournaments/${id}/matches`),
      apiGet('/players'),
    ]);
    setTournament(s.tournament);
    setStandings(s.standings);
    setMatches(m);
    setAllPlayers(p);
  }, [id]);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    reload().catch((e) => setError(e.message));
  }, [user, navigate, reload]);

  if (!user) return null;
  if (error && !tournament) return <div className="page"><p className="error">{error}</p></div>;
  if (!tournament) return <div className="page"><p className="muted">Loading…</p></div>;

  function flash(msg) {
    setNotice(msg);
    setError('');
    setTimeout(() => setNotice(''), 2500);
  }

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

  return (
    <div className="page">
      <p><Link to="/organizer">← My Tournaments</Link></p>
      <h1>{tournament.name}</h1>
      <p className="muted">
        {tournament.location} · <span className={`badge badge-${tournament.status}`}>{STATUS_LABELS[tournament.status]}</span>
      </p>

      <div className="tabs">
        {[['settings', 'Settings'], ['participants', 'Participants'], ['results', 'Results Entry']].map(([key, label]) => (
          <button key={key} className={`tab ${tab === key ? 'tab-active' : ''}`} onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </div>

      {error && <p className="error">{error}</p>}
      {notice && <p className="notice">{notice}</p>}

      {tab === 'settings' && (
        <SettingsTab tournament={tournament} onSave={(body) => act(() => apiPut(`/tournaments/${id}`, body), 'Saved')} />
      )}
      {tab === 'participants' && (
        <ParticipantsTab
          standings={standings}
          allPlayers={allPlayers}
          onAdd={(player_id) => act(() => apiPost(`/tournaments/${id}/add-player`, { player_id }), 'Player added')}
        />
      )}
      {tab === 'results' && (
        <ResultsTab
          matches={matches}
          standings={standings}
          onResult={(match_id, result) => act(() => apiPost(`/tournaments/${id}/results`, { match_id, result }), `Result ${result} saved`)}
          onCreateMatch={(body) => act(() => apiPost(`/tournaments/${id}/matches`, body), 'Match added')}
        />
      )}
    </div>
  );
}

function SettingsTab({ tournament, onSave }) {
  const [form, setForm] = useState({
    name: tournament.name,
    location: tournament.location || '',
    system_type: tournament.system_type,
    status: tournament.status,
  });

  return (
    <div className="card">
      <form
        className="form-grid"
        onSubmit={(e) => {
          e.preventDefault();
          onSave(form);
        }}
      >
        <label>
          Name
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </label>
        <label>
          Location
          <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
        </label>
        <label>
          System
          <select value={form.system_type} onChange={(e) => setForm({ ...form, system_type: e.target.value })}>
            <option value="swiss">Swiss</option>
            <option value="round_robin">Round Robin</option>
          </select>
        </label>
        <label>
          Status
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="setup">Upcoming</option>
            <option value="ongoing">Live</option>
            <option value="finished">Finished</option>
          </select>
        </label>
        <button type="submit">Save</button>
      </form>
    </div>
  );
}

function ParticipantsTab({ standings, allPlayers, onAdd }) {
  const registered = new Set(standings.map((s) => s.player_id));
  const available = allPlayers.filter((p) => !registered.has(p.id));
  const [selected, setSelected] = useState('');

  return (
    <>
      <div className="card">
        <h2>Add Player</h2>
        {available.length === 0 ? (
          <p className="muted">All players are already registered.</p>
        ) : (
          <form
            className="form-row"
            onSubmit={(e) => {
              e.preventDefault();
              if (selected) onAdd(Number(selected));
              setSelected('');
            }}
          >
            <select value={selected} onChange={(e) => setSelected(e.target.value)} required>
              <option value="">Select a player…</option>
              {available.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name} ({p.current_rating})
                </option>
              ))}
            </select>
            <button type="submit">Add</button>
          </form>
        )}
      </div>

      <h2>Participants ({standings.length})</h2>
      {standings.length === 0 ? (
        <p className="muted">No participants yet.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>#</th><th>Player</th><th>Rating</th><th>Points</th></tr></thead>
            <tbody>
              {standings.map((s, i) => (
                <tr key={s.player_id}>
                  <td>{i + 1}</td><td>{s.full_name}</td><td>{s.current_rating}</td><td>{s.current_points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function ResultsTab({ matches, standings, onResult, onCreateMatch }) {
  const currentRound = matches.length ? Math.max(...matches.map((m) => m.round_number)) : 1;
  const [form, setForm] = useState({ round_number: currentRound, player1_id: '', player2_id: '' });
  const currentMatches = matches.filter((m) => m.round_number === currentRound);
  const earlier = matches.filter((m) => m.round_number !== currentRound);

  return (
    <>
      <div className="card">
        <h2>Add Match (Round {currentRound})</h2>
        <form
          className="form-row"
          onSubmit={(e) => {
            e.preventDefault();
            onCreateMatch({
              round_number: Number(form.round_number),
              player1_id: Number(form.player1_id),
              player2_id: form.player2_id ? Number(form.player2_id) : null,
            });
            setForm({ ...form, player1_id: '', player2_id: '' });
          }}
        >
          <input
            type="number"
            min="1"
            value={form.round_number}
            onChange={(e) => setForm({ ...form, round_number: e.target.value })}
            style={{ maxWidth: '5.5rem' }}
            title="Round"
          />
          <select value={form.player1_id} onChange={(e) => setForm({ ...form, player1_id: e.target.value })} required>
            <option value="">Player 1…</option>
            {standings.map((s) => (
              <option key={s.player_id} value={s.player_id}>{s.full_name}</option>
            ))}
          </select>
          <select value={form.player2_id} onChange={(e) => setForm({ ...form, player2_id: e.target.value })}>
            <option value="">Player 2 (empty = bye)…</option>
            {standings.map((s) => (
              <option key={s.player_id} value={s.player_id}>{s.full_name}</option>
            ))}
          </select>
          <button type="submit">Add</button>
        </form>
      </div>

      <h2>Round {currentRound} Matches</h2>
      <MatchList matches={currentMatches} onResult={onResult} />
      {earlier.length > 0 && (
        <>
          <h2>Earlier Rounds</h2>
          <MatchList matches={earlier} onResult={onResult} />
        </>
      )}
    </>
  );
}

function MatchList({ matches, onResult }) {
  if (matches.length === 0) return <p className="muted">No matches yet.</p>;
  return (
    <div className="match-list">
      {matches.map((m) => (
        <div className="match-row" key={m.id}>
          <span className="match-players">
            R{m.round_number} · <strong>{m.player1_name}</strong> vs <strong>{m.player2_name || 'BYE'}</strong>
            {m.result && <span className="badge badge-finished" style={{ marginLeft: '0.5rem' }}>{m.result}</span>}
          </span>
          <span className="match-buttons">
            {RESULT_BUTTONS.map((r) => (
              <button
                key={r}
                className={`chip ${m.result === r ? 'chip-active' : ''}`}
                onClick={() => onResult(m.id, r)}
                disabled={!m.player2_id && r !== '1-0'}
              >
                {r}
              </button>
            ))}
          </span>
        </div>
      ))}
    </div>
  );
}
