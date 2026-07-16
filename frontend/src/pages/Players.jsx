import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiGet } from '../api.js';
import { useFederations } from '../federations.js';

export default function Players() {
  const { t } = useTranslation();
  const federations = useFederations();
  const [players, setPlayers] = useState(null);
  const [federation, setFederation] = useState('');

  useEffect(() => {
    const qs = federation ? `?federation=${federation}` : '';
    apiGet(`/players${qs}`).then(setPlayers);
  }, [federation]);

  return (
    <div className="page">
      <h1>{t('players.title')}</h1>
      <div className="filter-grid">
        <select value={federation} onChange={(e) => setFederation(e.target.value)}>
          <option value="">{t('tournaments.anyFederation')}</option>
          {federations.map((f) => <option key={f.code} value={f.code}>{f.code}</option>)}
        </select>
      </div>
      {!players ? (
        <p className="muted">{t('common.loading')}</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t('fields.rank')}</th><th>{t('fields.player')}</th><th>{t('fields.federation')}</th>
                <th>{t('fields.title')}</th><th>{t('ratingType.classic')}</th><th>{t('ratingType.rapid')}</th><th>{t('ratingType.blitz')}</th>
              </tr>
            </thead>
            <tbody>
              {players.map((p, i) => (
                <tr key={p.id}>
                  <td>{i + 1}</td>
                  <td><Link to={`/players/${p.id}`}>{p.first_name} {p.last_name}</Link></td>
                  <td>{p.federation}</td>
                  <td>{p.title || '—'}</td>
                  <td>{p.rating_classic}</td>
                  <td>{p.rating_rapid}</td>
                  <td>{p.rating_blitz}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
