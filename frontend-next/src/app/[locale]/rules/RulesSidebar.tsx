"use client";

import { usePathname } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

const SECTIONS = [
  { href: "/rules", key: "pairing" },
  { href: "/rules/tie-breaks", key: "tieBreaks" },
  { href: "/rules/titles", key: "titles" },
  { href: "/rules/rating", key: "rating" },
  { href: "/rules/contacts", key: "contacts" },
] as const;

export default function RulesSidebar() {
  const t = useTranslations("rulesPage.nav");
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto sm:w-56 sm:shrink-0 sm:flex-col sm:overflow-visible">
      {SECTIONS.map((s) => {
        const active = pathname === s.href;
        return (
          <Link
            key={s.href}
            href={s.href}
            className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium ${
              active
                ? "bg-emerald-600 text-white"
                : "text-neutral-600 hover:bg-neutral-100"
            }`}
          >
            {t(s.key)}
          </Link>
        );
      })}
    </nav>
  );
}
