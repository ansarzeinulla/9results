import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiGet } from '../api.js';
import { statusLabel, levelLabel, ratingTypeLabel, systemLabel } from '../labels.js';

function exportCsv(tournament, standings, rated) {
  const esc = (v) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = ['Rank', 'Player', 'Federation', 'Start rating', ...(rated ? ['Projected rating'] : []), 'Points', 'Buchholz'];
  const rows = [
    header,
    ...standings.map((s, i) => [
      i + 1, s.full_name, s.federation, s.start_rating ?? '',
      ...(rated ? [s.projected_rating ?? ''] : []), s.current_points, s.buchholz,
    ]),
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
  const { t } = useTranslation();
  const [tournament, setTournament] = useState(null);
  const [roundsData, setRoundsData] = useState(null);
  const [selectedRound, setSelectedRound] = useState(null); // null = final
  const [standings, setStandings] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    apiGet(`/tournaments/${id}/rounds`).then(setRoundsData).catch((e) => setError(e.message));
  }, [id]);

  useEffect(() => {
    const rq = selectedRound == null ? '' : `?through_round=${selectedRound}`;
    apiGet(`/tournaments/${id}/standings${rq}`)
      .then((d) => { setStandings(d); setTournament(d.tournament); })
      .catch((e) => setError(e.message));
  }, [id, selectedRound]);

  if (error) return <div className="page"><p className="error">{error}</p></div>;
  if (!tournament || !standings || !roundsData) return <div className="page"><p className="muted">{t('common.loading')}</p></div>;

  const maxRound = roundsData.max_round;
  const rated = standings.rated;
  const currentPairings = roundsData.rounds.find((r) => r.round_number === selectedRound)?.pairings;

  return (
    <div className="page">
      <h1>{tournament.name}</h1>
      <p className="muted">
        {tournament.federation} · {tournament.city} ·{' '}
        <span className={`badge badge-${tournament.status}`}>{statusLabel(t, tournament.status)}</span> ·{' '}
        {levelLabel(t, tournament.level)} · {ratingTypeLabel(t, tournament.rating_type)} · {systemLabel(t, tournament.system_type)}
      </p>

      {/* Round selector buttons */}
      <div className="round-buttons no-print">
        <button className={`chip ${selectedRound === 0 ? 'chip-active' : ''}`} onClick={() => setSelectedRound(0)}>
          {t('tournamentView.start')}
        </button>
        {Array.from({ length: maxRound }, (_, i) => i + 1).map((n) => (
          <button key={n} className={`chip ${selectedRound === n ? 'chip-active' : ''}`} onClick={() => setSelectedRound(n)}>
            {n === maxRound ? t('tournamentView.final') : t('tournamentView.round', { n })}
          </button>
        ))}
      </div>

      {/* Pairings for the selected round */}
      {selectedRound != null && selectedRound > 0 && (
        <>
          <h2>{t('tournamentView.pairings', { n: selectedRound })}</h2>
          {!currentPairings || currentPairings.length === 0 ? (
            <p className="muted">{t('tournamentView.noPairings')}</p>
          ) : (
            <div className="match-list">
              {currentPairings.map((m) => (
                <div className="match-row" key={m.id}>
                  <span className="match-players">
                    <Link to={`/players/${m.player1_id}`}>{m.player1_name}</Link>
                    {' vs '}
                    {m.player2_id ? <Link to={`/players/${m.player2_id}`}>{m.player2_name}</Link> : t('tournamentView.bye')}
                  </span>
                  {m.result && <span className="badge badge-finished">{m.result}</span>}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Standings snapshot */}
      <div className="standings-header no-print">
        <h2>
          {t('tournamentView.standings')}
          {' — '}
          {selectedRound === 0
            ? t('tournamentView.beforeTournament')
            : selectedRound == null || selectedRound === maxRound
              ? t('tournamentView.final')
              : t('tournamentView.round', { n: selectedRound })}
        </h2>
        {standings.standings.length > 0 && (
          <div className="export-buttons">
            <button className="chip" onClick={() => window.print()}>{t('tournamentView.print')}</button>
            <button className="chip" onClick={() => exportCsv(tournament, standings.standings, rated)}>{t('tournamentView.exportCsv')}</button>
          </div>
        )}
      </div>

      {standings.standings.length === 0 ? (
        <p className="muted">{t('tournamentView.noPlayers')}</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t('fields.rank')}</th>
                <th>{t('fields.player')}</th>
                <th>{t('fields.federation')}</th>
                <th>{t('fields.startRating')}</th>
                {rated && <th>{t('fields.projectedRating')}</th>}
                <th>{t('fields.points')}</th>
                <th>{t('fields.buchholz')}</th>
              </tr>
            </thead>
            <tbody>
              {standings.standings.map((s, i) => (
                <tr key={s.player_id}>
                  <td>{i + 1}</td>
                  <td><Link to={`/players/${s.player_id}`}>{s.full_name}</Link></td>
                  <td>{s.federation}</td>
                  <td>{s.start_rating ?? '—'}</td>
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
