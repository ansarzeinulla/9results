"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";

export default function FiltersPanel({ federations }: { federations: { id: string; name: string }[] }) {
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [open, setOpen] = useState(true);
  const [form, setForm] = useState({
    q: sp.get("q") ?? "",
    federation: sp.get("federation") ?? "",
  });

  const apply = () => {
    const qp = new URLSearchParams();
    if (form.q) qp.set("q", form.q);
    if (form.federation) qp.set("federation", form.federation);
    router.push(`${pathname}?${qp}`);
  };

  const reset = () => {
    setForm({ q: "", federation: "" });
    router.push(pathname);
  };

  const inputCls =
    "w-full rounded-lg border border-neutral-300 bg-transparent px-3 py-2 text-sm";

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
          <input
            className={inputCls}
            placeholder={t("organizers.searchName")}
            value={form.q}
            onChange={(e) => setForm({ ...form, q: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && apply()}
          />
          <select
            className={inputCls}
            value={form.federation}
            onChange={(e) => setForm({ ...form, federation: e.target.value })}
          >
            <option value="">{t("tournaments.anyFederation")}</option>
            {federations.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
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
