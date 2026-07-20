"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { api } from "@/lib/api";
import ResultChip from "@/components/ResultChip";
import EditTournament from "./EditTournament";
import PairingEditor from "./PairingEditor";
import type {
  PairingRow,
  ParticipantRow,
  RoundRow,
  TournamentRow,
} from "@/lib/data";

interface Lookup {
  id: string;
  name: string;
}

const SPECIALS = ["+--", "--+", "1BYE", "0.5BYE", "0BYE", "---"];

interface BulkOutcome {
  added: number;
  failed: number;
  errors: { id: string; reason: string }[];
}

export default function ControlPanel({
  tournament,
  participants,
  rounds,
  lastRoundPairings,
  lookups,
}: {
  tournament: TournamentRow;
  participants: ParticipantRow[];
  rounds: RoundRow[];
  lastRoundPairings: PairingRow[];
  lookups: {
    locations: Lookup[];
    levels: Lookup[];
    ratingTypes: Lookup[];
    federations: Lookup[];
  };
}) {
  const t = useTranslations();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [bulkIds, setBulkIds] = useState("");
  const [bulkResult, setBulkResult] = useState<BulkOutcome | null>(null);
  const [editingPairings, setEditingPairings] = useState(false);
  const [specialFor, setSpecialFor] = useState<number | null>(null);

  // Results are edited locally and written in one request, so a judge can
  // click through a whole round without a network call per board.
  const [draft, setDraft] = useState<Record<number, string | null>>({});

  const lastRound = rounds[rounds.length - 1] ?? null;
  const finished = tournament.status === "COMPLETED";

  const resultOf = (p: PairingRow) =>
    p.id in draft ? draft[p.id] : p.result_id;

  const dirtyCount = useMemo(
    () =>
      lastRoundPairings.filter(
        (p) => p.id in draft && draft[p.id] !== p.result_id
      ).length,
    [draft, lastRoundPairings]
  );

  const allDone =
    lastRoundPairings.length > 0 &&
    lastRoundPairings.every((p) => resultOf(p));

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

  const setLocalResult = (pairingId: number, result: string) => {
    setDraft((d) => ({ ...d, [pairingId]: result }));
    setSpecialFor(null);
    setNotice(null);
  };

  const saveResults = () =>
    run(async () => {
      if (!lastRound) return;
      const results = Object.entries(draft)
        .filter(([id]) =>
          lastRoundPairings.some((p) => p.id === Number(id))
        )
        .map(([id, result]) => ({ pairing_id: Number(id), result }));
      if (results.length === 0) return;
      await api(`/rounds/${lastRound.id}/results`, {
        method: "POST",
        body: JSON.stringify({ results }),
      });
      setDraft({});
      setNotice(t("admin.pairingsSaved"));
    });

  const bulkAdd = () =>
    run(async () => {
      const res = await api<BulkOutcome>(
        `/tournaments/${tournament.id}/players/bulk`,
        { method: "POST", body: JSON.stringify({ ids: bulkIds }) }
      );
      setBulkResult(res);
      if (res.added > 0) setBulkIds("");
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
        <div className="mt-3">
          <EditTournament tournament={tournament} lookups={lookups} />
        </div>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}
      {notice && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
          {notice}
        </p>
      )}

      {/* Participants */}
      <section>
        <h2 className="mb-2 text-lg font-semibold">{t("admin.participants")}</h2>

        <div className="mb-3 space-y-2">
          <textarea
            className="w-full rounded-lg border border-neutral-300 bg-transparent px-3 py-2 font-mono text-sm dark:border-neutral-700"
            rows={2}
            placeholder="KAZ-001, KAZ-002, KAZ-003…"
            value={bulkIds}
            onChange={(e) => setBulkIds(e.target.value)}
          />
          <div className="flex gap-2">
            <button
              disabled={busy || !bulkIds.trim()}
              onClick={bulkAdd}
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
              title={t("admin.syncRanks")}
            >
              ⟳
            </button>
          </div>
          {bulkResult && (
            <div className="rounded-lg border border-neutral-200 p-2 text-sm dark:border-neutral-800">
              <p className="text-emerald-600">+{bulkResult.added}</p>
              {bulkResult.errors.map((e) => (
                <p key={e.id} className="text-amber-600">
                  {e.id}: {e.reason}
                </p>
              ))}
            </div>
          )}
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
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t("admin.resultsEntry")}</h2>
          {dirtyCount > 0 && (
            <span className="text-sm text-amber-600">●{dirtyCount}</span>
          )}
        </div>
        {lastRound && (
          <p className="mb-2 text-sm text-neutral-500">
            {t("tournamentView.round", { n: lastRound.round_number })}
            {lastRound.is_closed ? " ✓" : ""}
          </p>
        )}

        {editingPairings && lastRound && (
          <div className="mb-4">
            <PairingEditor
              roundId={lastRound.id}
              roundNumber={lastRound.round_number}
              tournamentId={tournament.id}
              pairings={lastRoundPairings}
              participants={participants.filter((p) => p.status === "ACTIVE")}
              onClose={() => setEditingPairings(false)}
            />
          </div>
        )}

        <div className="space-y-2">
          {lastRoundPairings.map((m) => {
            const current = resultOf(m);
            const unsaved = m.id in draft && draft[m.id] !== m.result_id;
            return (
              <div
                key={m.id}
                className={`rounded-xl border p-3 text-sm ${
                  unsaved
                    ? "border-amber-400 dark:border-amber-700"
                    : "border-neutral-200 dark:border-neutral-800"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    {m.board_number === 999 ? "BYE" : `#${m.board_number}`} ·{" "}
                    {m.white_name}
                    {m.black_name ? ` — ${m.black_name}` : ""}
                  </span>
                  <ResultChip result={current} />
                </div>
                {!lastRound?.is_closed && m.black_player_id && !finished && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {["1-0", "0.5-0.5", "0-1"].map((r) => (
                      <button
                        key={r}
                        onClick={() => setLocalResult(m.id, r)}
                        className={`rounded-lg border px-4 py-1.5 font-mono font-semibold ${
                          current === r
                            ? "border-emerald-600 bg-emerald-600 text-white"
                            : "border-neutral-300 hover:border-emerald-500 dark:border-neutral-700"
                        }`}
                      >
                        {r === "0.5-0.5" ? "½-½" : r}
                      </button>
                    ))}
                    <button
                      onClick={() => setSpecialFor(specialFor === m.id ? null : m.id)}
                      className="rounded-lg border border-neutral-300 px-3 py-1.5 dark:border-neutral-700"
                    >
                      …
                    </button>
                    {specialFor === m.id &&
                      SPECIALS.map((r) => (
                        <button
                          key={r}
                          onClick={() => setLocalResult(m.id, r)}
                          className="rounded-lg border border-amber-400 px-3 py-1.5 font-mono text-amber-700 dark:text-amber-400"
                        >
                          {r}
                        </button>
                      ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {dirtyCount > 0 && (
            <button
              disabled={busy}
              onClick={saveResults}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {t("common.save")} ({dirtyCount})
            </button>
          )}
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
          {lastRound && !lastRound.is_closed && !finished && (
            <button
              onClick={() => setEditingPairings((v) => !v)}
              className="rounded-lg border border-amber-400 px-4 py-2 text-sm text-amber-700 dark:text-amber-400"
            >
              {t("admin.editPairings")}
            </button>
          )}
          {lastRound && !lastRound.is_closed && (
            <>
              <button
                disabled={busy || !allDone || dirtyCount > 0}
                title={dirtyCount > 0 ? t("common.save") : undefined}
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
