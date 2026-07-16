import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiGet } from '../api.js';
import { statusLabel, levelLabel, ratingTypeLabel } from '../labels.js';

export default function PlayerView() {
  const { id } = useParams();
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    apiGet(`/players/${id}`).then(setData).catch((e) => setError(e.message));
  }, [id]);

  if (error) return <div className="page"><p className="error">{error}</p></div>;
  if (!data) return <div className="page"><p className="muted">{t('common.loading')}</p></div>;

  const { player, history, rating_history: ratingHistory = [] } = data;
  const fullName = [player.first_name, player.middle_name, player.last_name].filter(Boolean).join(' ');

  return (
    <div className="page">
      <h1>{fullName}</h1>
      <p className="muted">
        {player.federation}{player.title ? ` · ${player.title}` : ''}{player.club ? ` · ${player.club}` : ''}
        {player.birth_year ? ` · ${player.birth_year}` : ''}
      </p>

      <div className="rating-cards">
        <div className="rating-card"><span>{t('ratingType.classic')}</span><strong>{player.rating_classic}</strong></div>
        <div className="rating-card"><span>{t('ratingType.rapid')}</span><strong>{player.rating_rapid}</strong></div>
        <div className="rating-card"><span>{t('ratingType.blitz')}</span><strong>{player.rating_blitz}</strong></div>
      </div>

      <h2>{t('players.ratingHistory')}</h2>
      {ratingHistory.length === 0 ? (
        <p className="muted">{t('players.noRatingHistory')}</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t('fields.date')}</th><th>{t('fields.name')}</th><th>{t('fields.ratingType')}</th>
                <th>{t('changeRatings.oldRating')}</th><th>{t('changeRatings.delta')}</th><th>{t('changeRatings.newRating')}</th>
              </tr>
            </thead>
            <tbody>
              {ratingHistory.map((h) => (
                <tr key={h.id}>
                  <td>{new Date(h.created_at).toLocaleDateString()}</td>
                  <td>{h.tournament_id
                    ? <Link to={`/tournaments/${h.tournament_id}`}>{h.tournament_name}</Link>
                    : '—'}</td>
                  <td>{ratingTypeLabel(t, h.rating_type)}</td>
                  <td>{h.old_rating}</td>
                  <td><span className={`delta ${h.delta >= 0 ? 'up' : 'down'}`}>{h.delta >= 0 ? '+' : ''}{h.delta}</span></td>
                  <td><strong>{h.new_rating}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2>{t('players.history')}</h2>
      {history.length === 0 ? (
        <p className="muted">{t('players.noHistory')}</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t('fields.name')}</th><th>{t('fields.city')}</th><th>{t('fields.level')}</th>
                <th>{t('fields.ratingType')}</th><th>{t('fields.status')}</th><th>{t('fields.points')}</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.tournament_id}>
                  <td><Link to={`/tournaments/${h.tournament_id}`}>{h.name}</Link></td>
                  <td>{h.city}</td>
                  <td>{levelLabel(t, h.level)}</td>
                  <td>{ratingTypeLabel(t, h.rating_type)}</td>
                  <td><span className={`badge badge-${h.status}`}>{statusLabel(t, h.status)}</span></td>
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
