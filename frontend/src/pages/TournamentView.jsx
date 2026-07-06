import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiGet, STATUS_LABELS } from '../api.js';

function exportCsv(tournament, standings) {
  const esc = (v) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = [
    ['Rank', 'Player', 'Rating', 'Points', 'Buchholz'],
    ...standings.map((s, i) => [i + 1, s.full_name, s.current_rating, s.current_points, s.buchholz]),
  ];
  const csv = rows.map((r) => r.map(esc).join(',')).join('\r\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${tournament.name.replace(/[^\w\d-]+/g, '_')}_standings.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

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
      <div className="standings-header no-print">
        <h2>Current Standings</h2>
        {standings.length > 0 && (
          <div className="export-buttons">
            <button className="chip" onClick={() => window.print()}>Print</button>
            <button className="chip" onClick={() => exportCsv(t, standings)}>Export to CSV</button>
          </div>
        )}
      </div>
      <h2 className="print-only">Current Standings</h2>
      {standings.length === 0 ? (
        <p className="muted">No players registered yet.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>#</th><th>Player</th><th>Rating</th><th>Points</th><th>Buchholz</th></tr>
            </thead>
            <tbody>
              {standings.map((s, i) => (
                <tr key={s.player_id}>
                  <td>{i + 1}</td>
                  <td><Link to={`/players/${s.player_id}`}>{s.full_name}</Link></td>
                  <td>{s.current_rating}</td>
                  <td><strong>{s.current_points}</strong></td>
                  <td>{s.buchholz}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
