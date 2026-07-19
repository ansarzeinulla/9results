"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { api } from "@/lib/api";
import ResultChip from "@/components/ResultChip";
import type {
  PairingRow,
  ParticipantRow,
  RoundRow,
  TournamentRow,
} from "@/lib/data";

const SPECIALS = ["+--", "--+", "1BYE", "0.5BYE", "0BYE", "---"];

export default function ControlPanel({
  tournament,
  participants,
  rounds,
  lastRoundPairings,
}: {
  tournament: TournamentRow;
  participants: ParticipantRow[];
  rounds: RoundRow[];
  lastRoundPairings: PairingRow[];
}) {
  const t = useTranslations();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [newPlayerId, setNewPlayerId] = useState("");
  const [savedPairing, setSavedPairing] = useState<number | null>(null);
  const [specialFor, setSpecialFor] = useState<number | null>(null);

  const lastRound = rounds[rounds.length - 1] ?? null;
  const allDone =
    lastRoundPairings.length > 0 && lastRoundPairings.every((p) => p.result_id);
  const finished = tournament.status === "COMPLETED";

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const setResult = (pairingId: number, result: string) =>
    run(async () => {
      await api(`/pairings/${pairingId}/result`, {
        method: "POST",
        body: JSON.stringify({ result }),
      });
      setSavedPairing(pairingId);
      setSpecialFor(null);
    });

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <Link href="/organizer" className="text-sm text-neutral-500 hover:underline">
          ← {t("admin.backToList")}
        </Link>
        <h1 className="mt-1 text-2xl font-bold">{tournament.name}</h1>
        <div className="text-sm text-neutral-500">
          {tournament.start_date} — {tournament.end_date} · {tournament.status} ·{" "}
          <Link
            href={`/tournaments/${tournament.slug ?? tournament.id}`}
            className="text-emerald-600 hover:underline"
          >
            {t("common.publicPage")}
          </Link>
        </div>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      {/* Participants */}
      <section>
        <h2 className="mb-2 text-lg font-semibold">{t("admin.participants")}</h2>
        <div className="mb-3 flex gap-2">
          <input
            className="flex-1 rounded-lg border border-neutral-300 bg-transparent px-3 py-2 text-sm dark:border-neutral-700"
            placeholder={t("admin.enterId")}
            value={newPlayerId}
            onChange={(e) => setNewPlayerId(e.target.value)}
          />
          <button
            disabled={busy || !newPlayerId}
            onClick={() =>
              run(() =>
                api(`/tournaments/${tournament.id}/players`, {
                  method: "POST",
                  body: JSON.stringify({ player_id: newPlayerId.trim() }),
                })
              ).then(() => setNewPlayerId(""))
            }
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {t("admin.add")}
          </button>
          <button
            disabled={busy}
            onClick={() =>
              run(() =>
                api(`/tournaments/${tournament.id}/players/sync-ranks`, {
                  method: "POST",
                })
              )
            }
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700"
          >
            ⟳
          </button>
        </div>
        <ul className="divide-y divide-neutral-100 text-sm dark:divide-neutral-900">
          {participants.map((p) => (
            <li key={p.player_id} className="flex items-center justify-between py-1.5">
              <span>
                <span className="mr-2 inline-block w-6 text-neutral-400">
                  {p.starting_rank}
                </span>
                {p.last_name} {p.first_name}{" "}
                <span className="text-neutral-400">
                  [{p.rating_at_tournament ?? 0}]
                </span>
                {p.status !== "ACTIVE" && (
                  <span className="ml-2 text-xs text-red-500">{p.status}</span>
                )}
              </span>
              {rounds.length === 0 ? (
                <button
                  disabled={busy}
                  onClick={() =>
                    run(() =>
                      api(
                        `/tournaments/${tournament.id}/players/${encodeURIComponent(p.player_id)}`,
                        { method: "DELETE" }
                      )
                    )
                  }
                  className="text-red-500 hover:text-red-700"
                  title={t("common.no")}
                >
                  🗑
                </button>
              ) : (
                p.status === "ACTIVE" && (
                  <button
                    disabled={busy}
                    onClick={() =>
                      run(() =>
                        api(
                          `/tournaments/${tournament.id}/withdraw/${encodeURIComponent(p.player_id)}`,
                          { method: "POST" }
                        )
                      )
                    }
                    className="text-xs text-neutral-400 hover:text-red-500"
                  >
                    ✕
                  </button>
                )
              )}
            </li>
          ))}
        </ul>
      </section>

      {/* Round control */}
      <section>
        <h2 className="mb-2 text-lg font-semibold">{t("admin.resultsEntry")}</h2>
        {lastRound && (
          <p className="mb-2 text-sm text-neutral-500">
            {t("tournamentView.round", { n: lastRound.round_number })}
            {lastRound.is_closed ? " ✓" : ""}
          </p>
        )}
        <div className="space-y-2">
          {lastRoundPairings.map((m) => (
            <div
              key={m.id}
              className="rounded-xl border border-neutral-200 p-3 text-sm dark:border-neutral-800"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">
                  {m.board_number === 999 ? "BYE" : `#${m.board_number}`} ·{" "}
                  {m.white_name}
                  {m.black_name ? ` — ${m.black_name}` : ""}
                </span>
                <span className="flex items-center gap-2">
                  {savedPairing === m.id && (
                    <span className="text-xs text-emerald-600">✓</span>
                  )}
                  <ResultChip result={m.result_id} />
                </span>
              </div>
              {!lastRound?.is_closed && m.black_player_id && !finished && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {["1-0", "0.5-0.5", "0-1"].map((r) => (
                    <button
                      key={r}
                      disabled={busy}
                      onClick={() => setResult(m.id, r)}
                      className={`rounded-lg border px-4 py-1.5 font-mono font-semibold ${
                        m.result_id === r
                          ? "border-emerald-600 bg-emerald-600 text-white"
                          : "border-neutral-300 hover:border-emerald-500 dark:border-neutral-700"
                      }`}
                    >
                      {r === "0.5-0.5" ? "½-½" : r}
                    </button>
                  ))}
                  <button
                    disabled={busy}
                    onClick={() => setSpecialFor(specialFor === m.id ? null : m.id)}
                    className="rounded-lg border border-neutral-300 px-3 py-1.5 dark:border-neutral-700"
                  >
                    …
                  </button>
                  {specialFor === m.id &&
                    SPECIALS.map((r) => (
                      <button
                        key={r}
                        disabled={busy}
                        onClick={() => setResult(m.id, r)}
                        className="rounded-lg border border-amber-400 px-3 py-1.5 font-mono text-amber-700 dark:text-amber-400"
                      >
                        {r}
                      </button>
                    ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {!finished && (!lastRound || lastRound.is_closed) && (
            <button
              disabled={busy || participants.length < 2}
              onClick={() =>
                run(() =>
                  api(`/tournaments/${tournament.id}/generate-round`, {
                    method: "POST",
                  })
                )
              }
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {t("admin.generateRound")}
            </button>
          )}
          {lastRound && !lastRound.is_closed && (
            <>
              <button
                disabled={busy || !allDone}
                onClick={() =>
                  run(() =>
                    api(
                      `/tournaments/${tournament.id}/rounds/${lastRound.id}/close`,
                      { method: "POST" }
                    )
                  )
                }
                className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50 dark:bg-white dark:text-neutral-900"
              >
                {t("tournamentView.final")} ✓
              </button>
              <button
                disabled={busy}
                onClick={() =>
                  run(() =>
                    api(`/rounds/${lastRound.id}/pairings`, { method: "DELETE" })
                  )
                }
                className="rounded-lg border border-red-300 px-4 py-2 text-sm text-red-600"
              >
                {t("admin.deleteRound")}
              </button>
            </>
          )}
          {!finished &&
            rounds.length > 0 &&
            rounds.length >= (tournament.rounds ?? 0) &&
            lastRound?.is_closed && (
              <button
                disabled={busy}
                onClick={() =>
                  run(() =>
                    api(`/tournaments/${tournament.id}/finalize`, {
                      method: "POST",
                    })
                  )
                }
                className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
              >
                {t("changeRatings.applyBtn")}
              </button>
            )}
        </div>
      </section>
    </div>
  );
}
