import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiGet } from '../api.js';

export default function Players() {
  const [players, setPlayers] = useState(null);

  useEffect(() => {
    apiGet('/players').then(setPlayers);
  }, []);

  if (!players) return <div className="page"><p className="muted">Loading…</p></div>;

  return (
    <div className="page">
      <h1>Players</h1>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>#</th><th>Name</th><th>Rating</th></tr>
          </thead>
          <tbody>
            {players.map((p, i) => (
              <tr key={p.id}>
                <td>{i + 1}</td>
                <td><Link to={`/players/${p.id}`}>{p.full_name}</Link></td>
                <td>{p.current_rating}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
