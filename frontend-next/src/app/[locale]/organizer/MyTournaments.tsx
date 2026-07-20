"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { api, getUser } from "@/lib/api";
import type { TournamentRow } from "@/lib/data";

/**
 * The dashboard list is fetched with the organizer's token: the API returns
 * only tournaments they own (admins see everything). The public
 * reads-from-Supabase path cannot know who is asking, so it is not used here.
 */
export default function MyTournaments() {
  const t = useTranslations();
  const [rows, setRows] = useState<TournamentRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getUser()) {
      setRows([]);
      return;
    }
    api<TournamentRow[]>("/my/tournaments")
      .then(setRows)
      .catch((e) => setError((e as Error).message));
  }, []);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (rows === null)
    return (
      <div className="animate-pulse space-y-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-12 rounded-lg bg-neutral-200 dark:bg-neutral-800" />
        ))}
      </div>
    );
  if (rows.length === 0)
    return <p className="text-sm text-neutral-500">{t("dashboard.empty")}</p>;

  return (
    <ul className="divide-y divide-neutral-100 dark:divide-neutral-900">
      {rows.map((tr) => (
        <li key={tr.id} className="flex items-center justify-between py-3">
          <div>
            <Link
              href={`/organizer/tournaments/${tr.id}`}
              className="font-medium text-emerald-700 hover:underline dark:text-emerald-400"
            >
              {tr.name}
            </Link>
            <div className="text-sm text-neutral-500">
              {String(tr.start_date).slice(0, 10)} — {String(tr.end_date).slice(0, 10)} ·{" "}
              {tr.status}
            </div>
          </div>
          <Link
            href={`/tournaments/${tr.slug ?? tr.id}`}
            className="text-sm text-neutral-500 hover:underline"
          >
            {t("common.publicPage")}
          </Link>
        </li>
      ))}
    </ul>
  );
}
