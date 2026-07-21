"use client";

import { useTranslations, useLocale } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { useEffect, useState } from "react";
import { getUser, logout } from "@/lib/api";
import OmniSearch from "./OmniSearch";

const LOCALES = [
  { code: "en", label: "🇬🇧 English" },
  { code: "kk", label: "🇰🇿 Қазақша" },
  { code: "ru", label: "🇷🇺 Русский" },
  { code: "tr", label: "🇹🇷 Türkçe" },
  { code: "ko", label: "🇰🇷 한국어" },
  { code: "es", label: "🇨🇴 Español" },
  { code: "cs", label: "🇨🇿 Čeština" },
];

function LangSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  return (
    <select
      aria-label="Language"
      className="h-9 rounded-lg border border-neutral-300 bg-transparent px-3 py-1.5 text-sm"
      value={locale}
      onChange={(e) => router.replace(pathname, { locale: e.target.value })}
    >
      {LOCALES.map((l) => (
        <option key={l.code} value={l.code}>
          {l.label}
        </option>
      ))}
    </select>
  );
}

export default function Header() {
  const t = useTranslations();
  const [user, setUser] = useState<{ username: string; role: string } | null>(null);
  useEffect(() => setUser(getUser()), []);

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-4 px-4">
        <Link href="/" className="shrink-0 text-lg font-bold tracking-tight">
          9Ecosystem
        </Link>
        <nav className="hidden items-center gap-4 text-sm md:flex">
          <Link href="/tournaments" className="hover:text-emerald-600">
            {t("nav.tournaments")}
          </Link>
          <Link href="/players" className="hover:text-emerald-600">
            {t("nav.players")}
          </Link>
          <Link href="/organizers" className="hover:text-emerald-600">
            {t("nav.organizers")}
          </Link>
          <Link href="/arbiters" className="hover:text-emerald-600">
            {t("nav.arbiters")}
          </Link>
          <span className="cursor-not-allowed text-neutral-400" title="Soon">
            {t("nav.engine")}
          </span>
          <span className="cursor-not-allowed text-neutral-400" title="Soon">
            {t("nav.arena")}
          </span>
          <span className="cursor-not-allowed text-neutral-400" title="Soon">
            {t("nav.games")}
          </span>
          <span className="cursor-not-allowed text-neutral-400" title="Soon">
            {t("nav.var")}
          </span>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <LangSwitcher />
          {user ? (
            <div className="flex items-center gap-2 text-sm">
              {user.role === "ADMIN" && (
                <Link
                  href="/admin"
                  className="h-9 rounded-lg border border-emerald-600 px-3 py-1.5 font-medium text-emerald-700 hover:bg-emerald-50"
                >
                  {t("nav.adminPanel")}
                </Link>
              )}
              <Link
                href="/organizer"
                className="h-9 rounded-lg bg-emerald-600 px-3 py-1.5 font-medium text-white hover:bg-emerald-700"
              >
                {t("nav.dashboard")}
              </Link>
              <button
                onClick={() => {
                  logout();
                  setUser(null);
                }}
                className="hidden text-neutral-500 hover:text-neutral-900 md:block"
              >
                {t("nav.logout")}
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="hidden h-9 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 md:block"
            >
              {t("nav.organizerLogin")}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
