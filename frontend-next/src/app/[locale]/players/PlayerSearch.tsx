"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";

interface Lookup {
  id: string;
  name: string;
}

const KEYS = [
  "q", "id", "firstName", "lastName", "middleName", "title", "club",
  "federation", "yobMin", "yobMax", "minClassic", "minRapid", "minBlitz",
] as const;

export default function PlayerSearch({
  lookups,
}: {
  lookups: { titles: Lookup[]; federations: Lookup[] };
}) {
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [open, setOpen] = useState(true);
  const [form, setForm] = useState(
    Object.fromEntries(KEYS.map((k) => [k, sp.get(k) ?? ""])) as Record<
      (typeof KEYS)[number],
      string
    >
  );

  const apply = () => {
    const qp = new URLSearchParams();
    KEYS.forEach((k) => form[k] && qp.set(k, form[k]));
    router.push(`${pathname}?${qp}`);
  };
  const reset = () => {
    setForm(Object.fromEntries(KEYS.map((k) => [k, ""])) as typeof form);
    router.push(pathname);
  };

  const inputCls =
    "w-full rounded-lg border border-neutral-300 bg-transparent px-3 py-2 text-sm";
  const txt = (key: (typeof KEYS)[number], placeholder: string, type = "text") => (
    <input
      type={type}
      className={inputCls}
      placeholder={placeholder}
      value={form[key]}
      onChange={(e) => setForm({ ...form, [key]: e.target.value })}
      onKeyDown={(e) => e.key === "Enter" && apply()}
    />
  );

  return (
    <section className="rounded-xl border border-neutral-200 p-4">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between text-left font-semibold"
      >
        <span>{t("tournaments.filters")}</span>
        <span className="text-sm text-neutral-500">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {txt("q", t("players.searchName"))}
          {txt("id", t("players.idFilter"))}
          {txt("firstName", t("fields.firstName"))}
          {txt("lastName", t("fields.lastName"))}
          {txt("middleName", t("fields.middleName"))}
          <select
            className={inputCls}
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          >
            <option value="">{t("players.anyTitle")}</option>
            {lookups.titles.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
          {txt("club", t("fields.club"))}
          <select
            className={inputCls}
            value={form.federation}
            onChange={(e) => setForm({ ...form, federation: e.target.value })}
          >
            <option value="">{t("tournaments.anyFederation")}</option>
            {lookups.federations.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
          {txt("yobMin", t("players.yobMin"), "number")}
          {txt("yobMax", t("players.yobMax"), "number")}
          {txt("minClassic", t("players.minClassic"), "number")}
          {txt("minRapid", t("players.minRapid"), "number")}
          {txt("minBlitz", t("players.minBlitz"), "number")}
          <div className="flex gap-2">
            <button
              onClick={apply}
              className="flex-1 rounded-lg bg-emerald-600 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              {t("common.search")}
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
