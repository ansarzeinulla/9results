import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiGet, STATUS_LABELS } from '../api.js';

export default function PlayerView() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    apiGet(`/players/${id}`).then(setData).catch((e) => setError(e.message));
  }, [id]);

  if (error) return <div className="page"><p className="error">{error}</p></div>;
  if (!data) return <div className="page"><p className="muted">Loading…</p></div>;

  const { player, history } = data;

  return (
    <div className="page">
      <h1>{player.full_name}</h1>
      <p className="muted">Current rating: <strong>{player.current_rating}</strong></p>
      <h2>Tournament History</h2>
      {history.length === 0 ? (
        <p className="muted">No tournaments yet.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Tournament</th><th>Location</th><th>Status</th><th>Points</th></tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.tournament_id}>
                  <td><Link to={`/tournaments/${h.tournament_id}`}>{h.name}</Link></td>
                  <td>{h.location}</td>
                  <td><span className={`badge badge-${h.status}`}>{STATUS_LABELS[h.status] || h.status}</span></td>
                  <td>{h.current_points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
