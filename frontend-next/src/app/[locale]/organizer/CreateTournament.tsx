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
    rounds: 7,
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (k: string, v: string | number) => setForm({ ...form, [k]: v });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/tournaments", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          slug: `${slugify(form.name)}-${Date.now() % 10000}`,
          tournament_type_id: "Swiss",
          level_id: form.level_id || null,
        }),
      });
      router.refresh();
      setForm({ ...form, name: "" });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const cls =
    "w-full rounded-lg border border-neutral-300 bg-transparent px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-950";

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
      <input
        type="number"
        min={1}
        max={50}
        className={cls}
        value={form.rounds}
        onChange={(e) => set("rounds", Number(e.target.value))}
        title={t("fields.rounds")}
      />
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
