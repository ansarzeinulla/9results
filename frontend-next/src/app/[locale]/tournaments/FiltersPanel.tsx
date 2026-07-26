"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import GroupedSelect from "@/components/GroupedSelect";
import { groupLocations, groupParticipantTypes } from "@/lib/option-groups";

interface Lookup {
  id: string;
  name: string;
}

const today = () => new Date().toISOString().slice(0, 10);

export default function FiltersPanel({
  lookups,
}: {
  lookups: {
    locations: Lookup[];
    levels: Lookup[];
    ratingTypes: Lookup[];
    federations: Lookup[];
    participantTypes: Lookup[];
    tournamentTypes: Lookup[];
  };
}) {
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [open, setOpen] = useState(true);
  const [form, setForm] = useState({
    q: sp.get("q") ?? "",
    federation: sp.get("federation") ?? "",
    location: sp.get("location") ?? "",
    level: sp.get("level") ?? "",
    ratingType: sp.get("ratingType") ?? "",
    // the start-date filter defaults to today so the list opens on
    // current and upcoming events
    dateFrom: sp.get("dateFrom") ?? (sp.size === 0 ? today() : ""),
    dateTo: sp.get("dateTo") ?? "",
    organizer: sp.get("organizer") ?? "",
    timeControl: sp.get("timeControl") ?? "",
    participantType: sp.get("participantType") ?? "",
    system: sp.get("system") ?? "",
    sort: sp.get("sort") ?? "",
  });

  const locationGroups = useMemo(
    () => groupLocations(lookups.locations),
    [lookups.locations]
  );
  const participantGroups = useMemo(
    () => groupParticipantTypes(lookups.participantTypes),
    [lookups.participantTypes]
  );

  const apply = () => {
    const qp = new URLSearchParams();
    Object.entries(form).forEach(([k, v]) => v && qp.set(k, v));
    if (!form.dateFrom) qp.set("dateFrom", "");
    router.push(`${pathname}?${qp}`);
  };
  const reset = () => {
    // Return to the default view (current & upcoming events), exactly like a
    // fresh page load — not the "?dateFrom=" all-time dump that showed past
    // tournaments and looked broken.
    setForm({
      q: "", federation: "", location: "", level: "", ratingType: "",
      dateFrom: today(), dateTo: "", organizer: "", timeControl: "",
      participantType: "", system: "", sort: "",
    });
    router.push(pathname);
  };

  const inputCls =
    "w-full rounded-lg border border-neutral-300 bg-transparent px-3 py-2 text-sm";
  const sel = (key: keyof typeof form, label: string, opts: Lookup[]) => (
    <select
      className={inputCls}
      value={form[key]}
      onChange={(e) => setForm({ ...form, [key]: e.target.value })}
    >
      <option value="">{label}</option>
      {opts.map((o) => (
        <option key={o.id} value={o.id}>
          {o.name}
        </option>
      ))}
    </select>
  );
  const txt = (key: keyof typeof form, placeholder: string) => (
    <input
      className={inputCls}
      placeholder={placeholder}
      value={form[key]}
      onChange={(e) => setForm({ ...form, [key]: e.target.value })}
      onKeyDown={(e) => e.key === "Enter" && apply()}
    />
  );

  return (
    <section className="mb-6 rounded-xl border border-neutral-200 p-4">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between text-left font-semibold"
      >
        <span>{t("tournaments.filters")}</span>
        <span className="text-sm text-neutral-500">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {txt("q", t("tournaments.searchName"))}
          {txt("organizer", t("tournaments.organizerName"))}
          {txt("timeControl", t("tournaments.timeControlFilter"))}
          {sel("federation", t("tournaments.anyFederation"), lookups.federations)}
          <GroupedSelect
            className={inputCls}
            groups={locationGroups}
            value={form.location}
            onChange={(v) => setForm({ ...form, location: v })}
            placeholder={t("tournaments.anyLocation")}
          />
          {sel("level", t("tournaments.anyLevel"), lookups.levels)}
          {sel("ratingType", t("tournaments.anyRatingType"), lookups.ratingTypes)}
          <GroupedSelect
            className={inputCls}
            groups={participantGroups}
            value={form.participantType}
            onChange={(v) => setForm({ ...form, participantType: v })}
            placeholder={t("tournaments.anyParticipantType")}
          />
          {sel("system", t("tournaments.anySystem"), lookups.tournamentTypes)}
          <select
            className={inputCls}
            value={form.sort}
            onChange={(e) => setForm({ ...form, sort: e.target.value })}
          >
            <option value="">{t("tournaments.sortDateDesc")}</option>
            <option value="date_asc">{t("tournaments.sortDateAsc")}</option>
          </select>
          <input
            type="date"
            className={inputCls}
            value={form.dateFrom}
            onChange={(e) => setForm({ ...form, dateFrom: e.target.value })}
          />
          <input
            type="date"
            className={inputCls}
            value={form.dateTo}
            onChange={(e) => setForm({ ...form, dateTo: e.target.value })}
          />
          <div className="flex gap-2">
            <button
              onClick={apply}
              className="flex-1 rounded-lg bg-emerald-600 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              {t("common.apply")}
            </button>
            <button
              onClick={reset}
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            >
              {t("common.cancel")}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
