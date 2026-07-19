"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { api } from "@/lib/api";
import type { TournamentRow } from "@/lib/data";

interface Lookup {
  id: string;
  name: string;
}

const STATUSES = ["DRAFT", "REGISTRATION", "ONGOING", "COMPLETED", "CANCELLED"];

export default function EditTournament({
  tournament,
  lookups,
}: {
  tournament: TournamentRow;
  lookups: {
    locations: Lookup[];
    levels: Lookup[];
    ratingTypes: Lookup[];
    federations: Lookup[];
  };
}) {
  const t = useTranslations();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: tournament.name,
    slug: tournament.slug ?? "",
    federation_id: tournament.federation_id ?? "KAZ",
    location_id: tournament.location_id ?? "Astana",
    rating_type_id: tournament.rating_type_id ?? "Classic",
    tournament_type_id: tournament.tournament_type_id ?? "Swiss",
    level_id: tournament.level_id ?? "",
    start_date: String(tournament.start_date ?? "").slice(0, 10),
    end_date: String(tournament.end_date ?? "").slice(0, 10),
    rounds: tournament.rounds ?? 7,
    time_control: tournament.time_control ?? "",
    status: tournament.status,
  });

  const set = (k: string, v: string | number) => setForm({ ...form, [k]: v });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api(`/tournaments/${tournament.id}`, {
        method: "PUT",
        body: JSON.stringify({
          ...form,
          level_id: form.level_id || null,
          time_control: form.time_control || null,
          rounds: Number(form.rounds),
        }),
      });
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const cls =
    "w-full rounded-lg border border-neutral-300 bg-transparent px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-950";

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700"
      >
        {t("admin.settings")}
      </button>
    );
  }

  return (
    <form onSubmit={save} className="grid gap-3 rounded-xl border border-neutral-200 p-4 sm:grid-cols-2 dark:border-neutral-800">
      <input
        className={`${cls} sm:col-span-2`}
        value={form.name}
        onChange={(e) => set("name", e.target.value)}
        placeholder={t("fields.name")}
        required
      />
      <select
        className={cls}
        value={form.federation_id}
        onChange={(e) => set("federation_id", e.target.value)}
      >
        {lookups.federations.map((f) => (
          <option key={f.id} value={f.id}>{f.name}</option>
        ))}
      </select>
      <select
        className={cls}
        value={form.location_id}
        onChange={(e) => set("location_id", e.target.value)}
      >
        {lookups.locations.map((l) => (
          <option key={l.id} value={l.id}>{l.name}</option>
        ))}
      </select>
      <select
        className={cls}
        value={form.rating_type_id}
        onChange={(e) => set("rating_type_id", e.target.value)}
      >
        {lookups.ratingTypes.map((r) => (
          <option key={r.id} value={r.id}>{r.name}</option>
        ))}
      </select>
      <select
        className={cls}
        value={form.level_id}
        onChange={(e) => set("level_id", e.target.value)}
      >
        <option value="">{t("tournaments.anyLevel")}</option>
        {lookups.levels.map((l) => (
          <option key={l.id} value={l.id}>{l.name}</option>
        ))}
      </select>
      <input
        type="date"
        className={cls}
        value={form.start_date}
        onChange={(e) => set("start_date", e.target.value)}
        required
      />
      <input
        type="date"
        className={cls}
        value={form.end_date}
        onChange={(e) => set("end_date", e.target.value)}
        required
      />
      <input
        type="number"
        min={1}
        max={50}
        className={cls}
        value={form.rounds}
        onChange={(e) => set("rounds", Number(e.target.value))}
        title={t("fields.rounds")}
      />
      <input
        className={cls}
        value={form.time_control}
        onChange={(e) => set("time_control", e.target.value)}
        placeholder={t("fields.timeControl")}
      />
      <select
        className={cls}
        value={form.status}
        onChange={(e) => set("status", e.target.value)}
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
      {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
      <div className="flex gap-2 sm:col-span-2">
        <button
          disabled={busy}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {t("common.save")}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg border border-neutral-300 px-4 py-2 text-sm dark:border-neutral-700"
        >
          {t("common.cancel")}
        </button>
      </div>
    </form>
  );
}
