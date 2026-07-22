"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { api } from "@/lib/api";
import type { PairingRow, ParticipantRow } from "@/lib/data";

interface Issue {
  code: string;
  params: Record<string, string | number>;
}

interface Verdict {
  ok: boolean;
  errors: Issue[];
  warnings: Issue[];
}

/** Manual pairing editor: swap opponents by hand, validate, then save. */
export default function PairingEditor({
  roundId,
  roundNumber,
  tournamentId,
  pairings,
  participants,
  onClose,
}: {
  roundId: number;
  roundNumber: number;
  tournamentId: number;
  pairings: PairingRow[];
  participants: ParticipantRow[];
  onClose: () => void;
}) {
  const t = useTranslations();
  const router = useRouter();
  const [rows, setRows] = useState(
    pairings.map((p) => ({
      player1_id: p.white_player_id,
      player2_id: p.black_player_id,
      board_number: p.board_number,
    }))
  );
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const name = (id: string | null) => {
    if (!id) return t("tournamentView.bye");
    const p = participants.find((x) => x.player_id === id);
    return p ? `${p.last_name} ${p.first_name} ${p.team_id ? `(${p.team_id})` : ""}` : id;
  };

  const setSeat = (index: number, seat: "player1_id" | "player2_id", value: string) => {
    const next = [...rows];
    next[index] = { ...next[index], [seat]: value || null };
    setRows(next);
    setVerdict(null);
  };

  // Structured {code, params} issues are translated on the client.
  const describe = (issue: Issue) => {
    try {
      return t(`swiss.${issue.code}`, issue.params as never);
    } catch {
      return issue.code;
    }
  };

  const validate = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await api<Verdict>(
        `/tournaments/${tournamentId}/validate-pairings`,
        {
          method: "POST",
          body: JSON.stringify({ round_number: roundNumber, pairings: rows }),
        }
      );
      setVerdict(res);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await api<Verdict>(`/rounds/${roundId}/pairings`, {
        method: "PUT",
        body: JSON.stringify({ pairings: rows }),
      });
      if (!res.ok) {
        setVerdict(res);
        return;
      }
      onClose();
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const options = participants.map((p) => (
    <option key={p.player_id} value={p.player_id}>
      {p.last_name} {p.first_name} {p.team_id ? `(${p.team_id})` : ""}
    </option>
  ));

  const cls =
    "rounded-lg border border-neutral-300 bg-transparent px-2 py-1 text-sm";

  return (
    <div className="space-y-3 rounded-xl border border-amber-300 p-4">
      <h3 className="font-semibold">{t("admin.editPairings")}</h3>

      {rows.map((row, i) => (
        <div key={i} className="flex flex-wrap items-center gap-2 text-sm">
          <span className="w-8 text-neutral-400">#{row.board_number ?? "—"}</span>
          <select
            className={cls}
            value={row.player1_id ?? ""}
            onChange={(e) => setSeat(i, "player1_id", e.target.value)}
          >
            {options}
          </select>
          <span className="text-neutral-400">—</span>
          <select
            className={cls}
            value={row.player2_id ?? ""}
            onChange={(e) => setSeat(i, "player2_id", e.target.value)}
          >
            <option value="">{t("tournamentView.bye")}</option>
            {options}
          </select>
        </div>
      ))}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {verdict && (
        <div className="space-y-1 text-sm">
          {verdict.errors.map((e, i) => (
            <p key={`e${i}`} className="text-red-600">✕ {describe(e)}</p>
          ))}
          {verdict.warnings.map((w, i) => (
            <p key={`w${i}`} className="text-amber-600">! {describe(w)}</p>
          ))}
          {verdict.ok && verdict.warnings.length === 0 && (
            <p className="text-emerald-600">✓</p>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          disabled={busy}
          onClick={validate}
          className="rounded-lg border border-neutral-300 px-4 py-2 text-sm disabled:opacity-50"
        >
          {t("common.apply")}
        </button>
        <button
          disabled={busy || (verdict != null && !verdict.ok)}
          onClick={save}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {t("admin.savePairings")}
        </button>
        <button
          onClick={onClose}
          className="rounded-lg border border-neutral-300 px-4 py-2 text-sm"
        >
          {t("common.cancel")}
        </button>
      </div>
    </div>
  );
}
