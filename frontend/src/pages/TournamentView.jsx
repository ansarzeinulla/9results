import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiGet } from '../api.js';
import { statusLabel, levelLabel, ratingTypeLabel, genderLabel, ageLabel } from '../labels.js';

function exportCsv(name, standings, rated) {
  const esc = (v) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = ['Rk', 'Name', 'FED', 'Rtg', 'Pts', 'TB1', ...(rated ? ['Rp'] : [])];
  const rows = [
    header,
    ...standings.map((s, i) => [
      i + 1, s.full_name, s.federation, s.start_rating ?? '', s.current_points, s.buchholz,
      ...(rated ? [s.rp ?? ''] : []),
    ]),
  ];
  const csv = rows.map((r) => r.map(esc).join(',')).join('\r\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${name.replace(/[^\w\d-]+/g, '_')}_standings.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function TournamentView() {
  const { id } = useParams();
  const { t } = useTranslation();
  const [detail, setDetail] = useState(null);
  const [rounds, setRounds] = useState(null);
  const [startRank, setStartRank] = useState(null);
  const [view, setView] = useState('');
  const [standings, setStandings] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      apiGet(`/tournaments/${id}`),
      apiGet(`/tournaments/${id}/rounds`),
      apiGet(`/tournaments/${id}/starting-rank`),
    ])
      .then(([d, r, sr]) => {
        setDetail(d); setRounds(r); setStartRank(sr);
        setView(r.max_round > 0 ? 'final' : 'start');
      })
      .catch((e) => setError(e.message));
  }, [id]);

  // Fetch standings when a ranking/final view is selected.
  const throughRound = useMemo(() => {
    if (view === 'final') return null;
    if (view.startsWith('rank-')) return Number(view.slice(5));
    return undefined; // not a standings view
  }, [view]);

  useEffect(() => {
    if (throughRound === undefined) return;
    const q = throughRound == null ? '' : `?through_round=${throughRound}`;
    apiGet(`/tournaments/${id}/standings${q}`).then(setStandings).catch((e) => setError(e.message));
  }, [id, throughRound]);

  if (error) return <div className="page"><p className="error">{error}</p></div>;
  if (!detail || !rounds || !startRank) return <div className="page"><p className="muted">{t('common.loading')}</p></div>;

  const maxRound = rounds.max_round;
  const rated = detail.rating_type !== 'non_rated';

  const info = [
    [t('fields.organizer'), detail.organizer_name],
    [t('fields.federation'), detail.federation],
    [t('fields.city'), detail.city],
    [t('fields.level'), levelLabel(t, detail.level)],
    [t('fields.timeControl'), ratingTypeLabel(t, detail.rating_type)],
    [t('fields.gender'), genderLabel(t, detail.gender)],
    [t('fields.ageCategory'), ageLabel(t, detail.age_category)],
    [t('fields.rounds'), detail.number_of_rounds],
    [t('fields.tieBreak'), 'Buchholz (TB1)'],
    [t('fields.players'), detail.player_count],
    [t('fields.status'), statusLabel(t, detail.status)],
  ];

  const pairingRound = view.startsWith('pair-') ? Number(view.slice(5)) : null;
  const pairings = pairingRound ? rounds.rounds.find((r) => r.round_number === pairingRound)?.pairings : null;
  const isRanking = view === 'final' || view.startsWith('rank-');

  return (
    <div className="page">
      <h1>{detail.name}</h1>

      {/* Info block */}
      <div className="info-block">
        <table>
          <tbody>
            {info.map(([k, v]) => (
              <tr key={k}><th>{k}</th><td>{v ?? '—'}</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Chess-results-style view selector */}
      <div className="view-selector no-print">
        <label>{t('view.label')}:{' '}
          <select value={view} onChange={(e) => setView(e.target.value)}>
            <option value="start">{t('view.startingRank')}</option>
            {maxRound > 0 && (
              <optgroup label={t('view.pairings')}>
                {Array.from({ length: maxRound }, (_, i) => i + 1).map((n) => (
                  <option key={`p${n}`} value={`pair-${n}`}>{t('view.pairings')} — {t('tournamentView.round', { n })}</option>
                ))}
              </optgroup>
            )}
            {maxRound > 0 && (
              <optgroup label={t('view.rankingAfter')}>
                {Array.from({ length: maxRound }, (_, i) => i + 1).map((n) => (
                  <option key={`r${n}`} value={`rank-${n}`}>{t('view.rankingAfter')} {n}</option>
                ))}
              </optgroup>
            )}
            {maxRound > 0 && <option value="final">{t('view.finalRanking')}</option>}
          </select>
        </label>
      </div>

      {/* Starting rank list */}
      {view === 'start' && (
        <>
          <h2>{t('view.startingRank')}</h2>
          <div className="table-wrap">
            <table className="cr-table">
              <thead>
                <tr>
                  <th>{t('fields.sno')}</th><th>{t('fields.title')}</th><th>{t('fields.player')}</th>
                  <th>{t('fields.federation')}</th><th>{t('fields.rating')}</th><th>{t('fields.birthYear')}</th><th>{t('fields.club')}</th>
                </tr>
              </thead>
              <tbody>
                {startRank.map((r) => (
                  <tr key={r.player_id}>
                    <td>{r.sno}</td><td>{r.title || ''}</td>
                    <td><Link to={`/players/${r.player_id}`}>{r.full_name}</Link></td>
                    <td>{r.federation}</td><td>{r.rating ?? '—'}</td><td>{r.birth_year || ''}</td><td>{r.club || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Pairings of a round */}
      {pairingRound && (
        <>
          <h2>{t('view.pairings')} — {t('tournamentView.round', { n: pairingRound })}</h2>
          {!pairings || pairings.length === 0 ? (
            <p className="muted">{t('tournamentView.noPairings')}</p>
          ) : (
            <div className="table-wrap">
              <table className="cr-table">
                <thead>
                  <tr>
                    <th>{t('fields.board')}</th>
                    <th>{t('fields.white')}</th><th>{t('fields.rating')}</th><th>{t('fields.points')}</th><th>{t('fields.buchholz')}</th>
                    <th>{t('fields.result')}</th>
                    <th>{t('fields.black')}</th><th>{t('fields.rating')}</th><th>{t('fields.points')}</th><th>{t('fields.buchholz')}</th>
                  </tr>
                </thead>
                <tbody>
                  {pairings.map((m, i) => (
                    <tr key={m.id}>
                      <td>{m.board_number ?? i + 1}</td>
                      <td><Link to={`/players/${m.player1_id}`}>{m.player1_name}</Link></td>
                      <td>{m.p1_rating ?? '—'}</td><td>{m.p1_points}</td><td>{m.p1_tb}</td>
                      <td className="cr-result">{m.result || '—'}</td>
                      <td>{m.player2_id ? <Link to={`/players/${m.player2_id}`}>{m.player2_name}</Link> : t('tournamentView.bye')}</td>
                      <td>{m.player2_id ? m.p2_rating ?? '—' : ''}</td>
                      <td>{m.player2_id ? m.p2_points : ''}</td>
                      <td>{m.player2_id ? m.p2_tb : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Ranking / final crosstable */}
      {isRanking && standings && (
        <>
          <div className="standings-header no-print">
            <h2>{view === 'final' ? t('view.finalRanking') : `${t('view.rankingAfter')} ${throughRound}`}</h2>
            {standings.standings.length > 0 && (
              <div className="export-buttons">
                <button className="chip" onClick={() => window.print()}>{t('tournamentView.print')}</button>
                <button className="chip" onClick={() => exportCsv(detail.name, standings.standings, rated)}>{t('tournamentView.exportCsv')}</button>
              </div>
            )}
          </div>
          {standings.standings.length === 0 ? (
            <p className="muted">{t('tournamentView.noPlayers')}</p>
          ) : (
            <div className="table-wrap">
              <table className="cr-table">
                <thead>
                  <tr>
                    <th>{t('fields.rank')}</th><th>{t('fields.player')}</th><th>{t('fields.federation')}</th>
                    <th>{t('fields.startRating')}</th><th>{t('fields.points')}</th><th>{t('fields.buchholz')}</th>
                    {rated && <th>{t('fields.rp')}</th>}
                    {rated && <th>{t('fields.projectedRating')}</th>}
                  </tr>
                </thead>
                <tbody>
                  {standings.standings.map((s, i) => (
                    <tr key={s.player_id}>
                      <td>{i + 1}</td>
                      <td><Link to={`/players/${s.player_id}`}>{s.full_name}</Link></td>
                      <td>{s.federation}</td>
                      <td>{s.start_rating ?? '—'}</td>
                      <td><strong>{s.current_points}</strong></td>
                      <td>{s.buchholz}</td>
                      {rated && <td>{s.rp ?? '—'}</td>}
                      {rated && (
                        <td>
                          {s.projected_rating ?? '—'}
                          {s.projected_rating != null && s.start_rating != null && (
                            <span className={`delta ${s.projected_rating >= s.start_rating ? 'up' : 'down'}`}>
                              {' '}{s.projected_rating >= s.start_rating ? '+' : ''}{s.projected_rating - s.start_rating}
                            </span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
