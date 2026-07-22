"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { api } from "@/lib/api";

interface Lookup {
  id: string;
  name: string;
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9а-яәіңғүұқөһ]+/gi, "-")
    .replace(/(^-|-$)/g, "");

export default function CreateTournament({
  lookups,
}: {
  lookups: {
    locations: Lookup[];
    levels: Lookup[];
    ratingTypes: Lookup[];
    federations: Lookup[];
    tournamentTypes: Lookup[];
    tieBreaks: Lookup[];
    participantTypes: Lookup[];
  };
}) {
  const t = useTranslations();
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    federation_id: "KAZ",
    location_id: lookups.locations[0]?.id ?? "Astana",
    level_id: "",
    rating_type_id: "Classic",
    start_date: "",
    end_date: "",
    tournament_type_id: "Swiss",
    participant_type_id: "",
    time_control: "",
  });
  // Ordered tie-break criteria; the same criterion may be picked twice.
  const [tieBreaks, setTieBreaks] = useState(["", "", "", ""]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (k: string, v: string | number) => setForm({ ...form, [k]: v });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const created = await api<{ id: number }>("/tournaments", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          slug: `${slugify(form.name)}-${Date.now() % 10000}`,
          level_id: form.level_id || null,
          participant_type_id: form.participant_type_id || null,
          time_control: form.time_control || null,
          tie_breaks: tieBreaks.filter(Boolean),
        }),
      });
      // straight to the control panel of the new tournament — also avoids a
      // stale dashboard list (its client-side fetch runs on mount only)
      router.push(`/organizer/tournaments/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const cls =
    "w-full rounded-lg border border-neutral-300 bg-transparent px-3 py-2 text-sm";

  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
      <input
        className={`${cls} sm:col-span-2`}
        placeholder={t("fields.name")}
        value={form.name}
        onChange={(e) => set("name", e.target.value)}
        required
      />
      <select
        className={cls}
        value={form.federation_id}
        onChange={(e) => set("federation_id", e.target.value)}
      >
        {lookups.federations.map((f) => (
          <option key={f.id} value={f.id}>
            {f.name}
          </option>
        ))}
      </select>
      <select
        className={cls}
        value={form.location_id}
        onChange={(e) => set("location_id", e.target.value)}
      >
        {lookups.locations.map((l) => (
          <option key={l.id} value={l.id}>
            {l.name}
          </option>
        ))}
      </select>
      <select
        className={cls}
        value={form.rating_type_id}
        onChange={(e) => set("rating_type_id", e.target.value)}
      >
        {lookups.ratingTypes.map((r) => (
          <option key={r.id} value={r.id}>
            {r.name}
          </option>
        ))}
      </select>
      <select
        className={cls}
        value={form.level_id}
        onChange={(e) => set("level_id", e.target.value)}
      >
        <option value="">{t("tournaments.anyLevel")}</option>
        {lookups.levels.map((l) => (
          <option key={l.id} value={l.id}>
            {l.name}
          </option>
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
        min={form.start_date || undefined}
        onChange={(e) => set("end_date", e.target.value)}
        required
      />
      <select
        className={cls}
        value={form.tournament_type_id}
        onChange={(e) => set("tournament_type_id", e.target.value)}
        title={t("fields.system")}
      >
        {lookups.tournamentTypes.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      <select
        className={cls}
        value={form.participant_type_id}
        onChange={(e) => set("participant_type_id", e.target.value)}
      >
        <option value="">{t("tournaments.anyParticipantType")}</option>
        {lookups.participantTypes.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <input
        className={`${cls} sm:col-span-2`}
        placeholder={t("fields.timeControl")}
        value={form.time_control}
        onChange={(e) => set("time_control", e.target.value)}
      />
      <div className="sm:col-span-2">
        <div className="mb-1 text-sm font-medium">{t("fields.tieBreaks")}</div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {tieBreaks.map((tb, i) => (
            <select
              key={i}
              className={cls}
              value={tb}
              title={`TB${i + 1}`}
              onChange={(e) => {
                const next = [...tieBreaks];
                next[i] = e.target.value;
                setTieBreaks(next);
              }}
            >
              <option value="">{`TB${i + 1}`}</option>
              {lookups.tieBreaks.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          ))}
        </div>
      </div>
      {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
      <button
        disabled={busy}
        className="rounded-lg bg-emerald-600 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 sm:col-span-2"
      >
        {t("dashboard.createBtn")}
      </button>
    </form>
  );
}
