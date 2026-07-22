"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { api } from "@/lib/api";

export interface Team {
  id: number;
  name: string;
}

const cls =
  "rounded-lg border border-neutral-300 bg-transparent px-2 py-1 text-sm";

/** Create and remove the teams of one tournament. Deleting a team releases its
 *  players rather than removing them from the tournament. */
export function TeamManager({
  tournamentId,
  teams,
  onChange,
  disabled,
}: {
  tournamentId: number;
  teams: Team[];
  onChange: () => void;
  disabled?: boolean;
}) {
  const t = useTranslations();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      onChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section>
      <h2 className="mb-1 text-lg font-semibold">{t("teams.title")}</h2>
      <p className="mb-2 text-xs text-neutral-500">{t("teams.hint")}</p>

      <div className="mb-2 flex gap-2">
        <input
          className={`${cls} flex-1`}
          placeholder={t("teams.newTeam")}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button
          type="button"
          disabled={disabled || busy || !name.trim()}
          onClick={() =>
            run(async () => {
              await api(`/tournaments/${tournamentId}/teams`, {
                method: "POST",
                body: JSON.stringify({ name: name.trim() }),
              });
              setName("");
            })
          }
          className="rounded-lg bg-emerald-600 px-3 py-1 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {t("teams.create")}
        </button>
      </div>

      <ul className="divide-y divide-neutral-100 text-sm">
        {teams.map((team) => (
          <li key={team.id} className="flex items-center justify-between py-1.5">
            <span>{team.name}</span>
            <button
              type="button"
              disabled={disabled || busy}
              title={t("teams.deleteTeam")}
              onClick={() =>
                run(() =>
                  api(`/tournaments/${tournamentId}/teams/${team.id}`, {
                    method: "DELETE",
                  })
                )
              }
              className="text-red-500 hover:text-red-700"
            >
              🗑
            </button>
          </li>
        ))}
      </ul>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </section>
  );
}

/** The team and board seat of a single participant. Both travel together: the
 *  backend stores them in one update, so clearing the team clears the board. */
export function TeamSeat({
  tournamentId,
  playerId,
  teams,
  teamId,
  boardOrder,
  onChange,
  onError,
  disabled,
}: {
  tournamentId: number;
  playerId: string;
  teams: Team[];
  teamId: number | null;
  boardOrder: number | null;
  onChange: () => void;
  onError: (message: string) => void;
  disabled?: boolean;
}) {
  const t = useTranslations();
  const [busy, setBusy] = useState(false);

  const save = async (nextTeam: number | null, nextBoard: number | null) => {
    setBusy(true);
    try {
      await api(
        `/tournaments/${tournamentId}/players/${encodeURIComponent(playerId)}/team`,
        {
          method: "PUT",
          body: JSON.stringify({
            team_id: nextTeam,
            board_order: nextTeam === null ? null : nextBoard,
          }),
        }
      );
      onChange();
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <span className="flex items-center gap-1">
      <select
        className={cls}
        disabled={disabled || busy}
        value={teamId ?? ""}
        onChange={(e) =>
          save(e.target.value ? Number(e.target.value) : null, boardOrder)
        }
      >
        <option value="">{t("teams.none")}</option>
        {teams.map((team) => (
          <option key={team.id} value={team.id}>
            {team.name}
          </option>
        ))}
      </select>
      <input
        type="number"
        min={1}
        className={`${cls} w-16`}
        title={t("teams.board")}
        placeholder={t("teams.board")}
        disabled={disabled || busy || teamId === null}
        defaultValue={boardOrder ?? ""}
        // Written on blur, not on every keystroke: a board swap is normally two
        // edits, and saving mid-typing would trip the "seat taken" conflict.
        onBlur={(e) => {
          const next = e.target.value ? Number(e.target.value) : null;
          if (next !== boardOrder) save(teamId, next);
        }}
      />
    </span>
  );
}
