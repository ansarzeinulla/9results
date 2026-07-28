"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { api } from "@/lib/api";
import { errorText } from "@/lib/api-error";
import GroupedSelect from "@/components/GroupedSelect";
import { groupLocations, groupParticipantTypes } from "@/lib/option-groups";

interface Lookup {
  id: string;
  name: string;
}

const getTodayString = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

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
  const te = useTranslations("errors");
  const router = useRouter();
  const today = getTodayString();
  const [form, setForm] = useState({
    name: "",
    location_id: lookups.locations[0]?.id ?? "",
    level_id: "",
    rating_type_id: lookups.ratingTypes[0]?.id ?? "",
    start_date: today,
    end_date: today,
    tournament_type_id: "Swiss",
    participant_type_id: "All",
    time_control: "",
  });
  // Ordered tie-break criteria; the same criterion may be picked twice.
  const [tieBreaks, setTieBreaks] = useState(["", "", "", ""]);
  // Assigned arbiters: comma-separated official ids.
  const [arbiters, setArbiters] = useState("");

  // TEAM participant categories only make sense for the Team-match format;
  // hide them for Swiss / Round-robin / Olympic.
  const isTeamFormat = form.tournament_type_id === "Team-match";
  const participantOptions = isTeamFormat
    ? lookups.participantTypes
    : lookups.participantTypes.filter((p) => !p.id.startsWith("Team"));
  const locationGroups = useMemo(
    () => groupLocations(lookups.locations),
    [lookups.locations]
  );
  const participantGroups = useMemo(
    () => groupParticipantTypes(participantOptions),
    [participantOptions]
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (k: string, v: string | number) => setForm({ ...form, [k]: v });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (tieBreaks.some((tb) => !tb)) {
      setError(t("fields.tieBreaksRequired"));
      return;
    }
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
          tie_breaks: tieBreaks,
          arbiter_ids: arbiters
            .split(",")
            .map((s) => parseInt(s.trim(), 10))
            .filter((n) => Number.isFinite(n)),
        }),
      });
      // straight to the control panel of the new tournament — also avoids a
      // stale dashboard list (its client-side fetch runs on mount only)
      router.push(`/organizer/tournaments/${created.id}`);
    } catch (err) {
      setError(errorText(te, err));
    } finally {
      setBusy(false);
    }
  };

  const cls =
    "w-full rounded-lg border border-neutral-300 bg-transparent px-3 py-2 text-sm";

  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
      <fieldset disabled={busy} className="contents disabled:opacity-60" aria-busy={busy}>
      <input
        className={`${cls} sm:col-span-2`}
        placeholder={t("fields.name")}
        value={form.name}
        onChange={(e) => set("name", e.target.value)}
        required
      />
      <GroupedSelect
        className={cls}
        groups={locationGroups}
        value={form.location_id}
        onChange={(v) => set("location_id", v)}
        placeholder={t("tournaments.anyLocation")}
      />
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
        onChange={(e) => {
          const type = e.target.value;
          // Switching to a non-team format drops any TEAM participant category.
          const dropsTeam =
            type !== "Team-match" &&
            form.participant_type_id.startsWith("Team");
          setForm({
            ...form,
            tournament_type_id: type,
            ...(dropsTeam ? { participant_type_id: "" } : {}),
          });
        }}
        title={t("fields.system")}
      >
        {lookups.tournamentTypes.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      <GroupedSelect
        className={cls}
        groups={participantGroups}
        value={form.participant_type_id}
        onChange={(v) => set("participant_type_id", v)}
        placeholder={t("tournaments.anyParticipantType")}
      />
      <input
        className={`${cls} sm:col-span-2`}
        placeholder={t("fields.timeControl")}
        value={form.time_control}
        onChange={(e) => set("time_control", e.target.value)}
      />
      <input
        className={`${cls} sm:col-span-2`}
        placeholder={t("fields.arbiters")}
        value={arbiters}
        onChange={(e) => setArbiters(e.target.value)}
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
              required
              aria-label={`TB${i + 1}`}
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
      </fieldset>
      <button
        disabled={busy}
        className="rounded-lg bg-emerald-600 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 sm:col-span-2"
      >
        {busy ? t("dashboard.creating") : t("dashboard.createBtn")}
      </button>
    </form>
  );
}
