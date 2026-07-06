import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiGet, STATUS_LABELS } from '../api.js';

export default function TournamentView() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    apiGet(`/tournaments/${id}/standings`).then(setData).catch((e) => setError(e.message));
  }, [id]);

  if (error) return <div className="page"><p className="error">{error}</p></div>;
  if (!data) return <div className="page"><p className="muted">Loading…</p></div>;

  const { tournament: t, standings } = data;

  return (
    <div className="page">
      <h1>{t.name}</h1>
      <p className="muted">
        {t.location} · <span className={`badge badge-${t.status}`}>{STATUS_LABELS[t.status] || t.status}</span>{' '}
        · {t.system_type === 'round_robin' ? 'Round Robin' : 'Swiss'}
      </p>
      <h2>Current Standings</h2>
      {standings.length === 0 ? (
        <p className="muted">No players registered yet.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>#</th><th>Player</th><th>Rating</th><th>Points</th></tr>
            </thead>
            <tbody>
              {standings.map((s, i) => (
                <tr key={s.player_id}>
                  <td>{i + 1}</td>
                  <td><Link to={`/players/${s.player_id}`}>{s.full_name}</Link></td>
                  <td>{s.current_rating}</td>
                  <td><strong>{s.current_points}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
