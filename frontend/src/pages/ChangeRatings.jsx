import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiGet, apiPost } from '../api.js';
import { ratingTypeLabel } from '../labels.js';

export default function ChangeRatings({ user }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    apiGet(`/tournaments/${id}/rating-preview`)
      .then((d) => { setData(d); setApplied(d.ratings_applied); })
      .catch((e) => setError(e.message));
  }, [user, id, navigate]);

  async function apply() {
    if (!window.confirm(t('changeRatings.confirm'))) return;
    setError('');
    try {
      await apiPost(`/tournaments/${id}/apply-ratings`, {});
      setApplied(true);
      setData(await apiGet(`/tournaments/${id}/rating-preview`));
    } catch (e) {
      setError(e.message);
    }
  }

  if (!user) return null;
  if (error) return <div className="page"><p className="error">{error}</p></div>;
  if (!data) return <div className="page"><p className="muted">{t('common.loading')}</p></div>;

  return (
    <div className="page">
      <p><Link to={`/organizer/tournaments/${id}`}>← {t('admin.backToList')}</Link></p>
      <h1>{t('changeRatings.title')}</h1>
      <p className="muted">{t('changeRatings.subtitle', { type: ratingTypeLabel(t, data.rating_type) })}</p>

      {applied && <p className="notice">{t('changeRatings.applied')}</p>}
      {error && <p className="error">{error}</p>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>{t('fields.player')}</th>
              <th>{t('changeRatings.oldRating')}</th>
              <th>{t('changeRatings.delta')}</th>
              <th>{t('changeRatings.newRating')}</th>
            </tr>
          </thead>
          <tbody>
            {data.preview.map((p) => (
              <tr key={p.player_id}>
                <td>{p.full_name}</td>
                <td>{p.old_rating}</td>
                <td><span className={`delta ${p.delta >= 0 ? 'up' : 'down'}`}>{p.delta >= 0 ? '+' : ''}{p.delta}</span></td>
                <td><strong>{p.new_rating}</strong></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!applied && (
        <button style={{ marginTop: '1rem' }} onClick={apply}>{t('changeRatings.applyBtn')}</button>
      )}
    </div>
  );
}
