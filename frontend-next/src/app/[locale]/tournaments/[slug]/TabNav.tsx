"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

export default function TabNav({ slug }: { slug: string }) {
  const t = useTranslations("tabs");
  const pathname = usePathname();
  const base = `/tournaments/${slug}`;
  const tabs = [
    { href: base, label: t("info"), exact: true },
    { href: `${base}/starting-rank`, label: t("startingRank") },
    { href: `${base}/pairings`, label: t("pairings") },
    { href: `${base}/standings`, label: t("standings") },
    { href: `${base}/alphabetical`, label: t("alphabetical") },
  ];
  return (
    <nav className="scrollbar-none -mx-4 flex gap-1 overflow-x-auto border-b border-neutral-200 px-4">
      {tabs.map((tab) => {
        const active = tab.exact
          ? pathname === tab.href
          : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium ${
              active
                ? "border-emerald-600 text-emerald-600"
                : "border-transparent text-neutral-500 hover:text-neutral-900"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
