"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";

export default function PlayerSearch() {
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get("q") ?? "");
  const [birthYear, setBirthYear] = useState(sp.get("birthYear") ?? "");

  const apply = () => {
    const qp = new URLSearchParams();
    if (q) qp.set("q", q);
    if (birthYear) qp.set("birthYear", birthYear);
    router.push(`${pathname}?${qp}`);
  };

  return (
    <div className="flex flex-wrap gap-2">
      <input
        className="min-w-48 flex-1 rounded-lg border border-neutral-300 bg-transparent px-3 py-2 text-sm dark:border-neutral-700"
        placeholder={t("players.searchName")}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && apply()}
      />
      <input
        className="w-32 rounded-lg border border-neutral-300 bg-transparent px-3 py-2 text-sm dark:border-neutral-700"
        placeholder={t("fields.birthYear")}
        value={birthYear}
        onChange={(e) => setBirthYear(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && apply()}
      />
      <button
        onClick={apply}
        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
      >
        {t("common.search")}
      </button>
    </div>
  );
}
