"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";

interface Lookup {
  id: string;
  name: string;
}

export default function FiltersPanel({
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
  const pathname = usePathname();
  const sp = useSearchParams();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    q: sp.get("q") ?? "",
    federation: sp.get("federation") ?? "",
    location: sp.get("location") ?? "",
    level: sp.get("level") ?? "",
    ratingType: sp.get("ratingType") ?? "",
    dateFrom: sp.get("dateFrom") ?? "",
    dateTo: sp.get("dateTo") ?? "",
  });

  const apply = () => {
    const qp = new URLSearchParams();
    Object.entries(form).forEach(([k, v]) => v && qp.set(k, v));
    router.push(`${pathname}?${qp}`);
    setOpen(false);
  };
  const reset = () => {
    setForm({ q: "", federation: "", location: "", level: "", ratingType: "", dateFrom: "", dateTo: "" });
    router.push(pathname);
    setOpen(false);
  };

  const sel = (key: keyof typeof form, label: string, opts: Lookup[]) => (
    <select
      className="w-full rounded-lg border border-neutral-300 bg-transparent px-2 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-950"
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

  const body = (
    <div className="space-y-3">
      <input
        className="w-full rounded-lg border border-neutral-300 bg-transparent px-3 py-2 text-sm dark:border-neutral-700"
        placeholder={t("tournaments.searchName")}
        value={form.q}
        onChange={(e) => setForm({ ...form, q: e.target.value })}
      />
      {sel("federation", t("tournaments.anyFederation"), lookups.federations)}
      {sel("location", t("tournaments.anyCity"), lookups.locations)}
      {sel("level", t("tournaments.anyLevel"), lookups.levels)}
      {sel("ratingType", t("tournaments.anyRatingType"), lookups.ratingTypes)}
      <div className="grid grid-cols-2 gap-2">
        <input
          type="date"
          className="rounded-lg border border-neutral-300 bg-transparent px-2 py-2 text-sm dark:border-neutral-700"
          value={form.dateFrom}
          onChange={(e) => setForm({ ...form, dateFrom: e.target.value })}
        />
        <input
          type="date"
          className="rounded-lg border border-neutral-300 bg-transparent px-2 py-2 text-sm dark:border-neutral-700"
          value={form.dateTo}
          onChange={(e) => setForm({ ...form, dateTo: e.target.value })}
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={apply}
          className="flex-1 rounded-lg bg-emerald-600 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          {t("common.apply")}
        </button>
        <button
          onClick={reset}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700"
        >
          {t("common.cancel")}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* mobile trigger + bottom sheet */}
      <div className="md:hidden">
        <button
          onClick={() => setOpen(true)}
          className="w-full rounded-lg border border-neutral-300 py-2 text-sm dark:border-neutral-700"
        >
          {t("tournaments.filters")}
        </button>
        {open && (
          <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={() => setOpen(false)}>
            <div
              className="w-full rounded-t-2xl bg-white p-4 pb-8 dark:bg-neutral-900"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mx-auto mb-3 h-1 w-10 rounded bg-neutral-300 dark:bg-neutral-700" />
              {body}
            </div>
          </div>
        )}
      </div>
      {/* desktop sidebar */}
      <aside className="hidden md:block">
        <h2 className="mb-3 font-semibold">{t("tournaments.filters")}</h2>
        {body}
      </aside>
    </>
  );
}
