"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

export default function BottomNav() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const items = [
    { href: "/tournaments", icon: "🏆", label: t("tournaments") },
    { href: "/players", icon: "👥", label: t("players") },
    { href: "/login", icon: "⚙️", label: t("login") },
  ];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200 bg-white md:hidden">
      <div className="grid grid-cols-3">
        {items.map((it) => (
          <Link
            key={it.href}
            href={it.href}
            className={`flex flex-col items-center gap-0.5 py-2 text-xs ${
              pathname.startsWith(it.href)
                ? "text-emerald-600"
                : "text-neutral-500"
            }`}
          >
            <span className="text-lg leading-none">{it.icon}</span>
            {it.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
