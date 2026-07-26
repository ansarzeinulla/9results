import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export interface HistoryRow {
  id: number | string;
  slug?: string | null;
  name: string;
  start_date: string;
  end_date: string;
  time_control?: string | null;
  tournament_type_id?: string | null;
  final_rank?: number | null;
  points?: number | null;
  rating_change?: number | null;
}

/**
 * Tournament-history table shared by player / organizer / arbiter profiles.
 * Columns beyond name+dates are only shown when at least one row has them,
 * since organizers/arbiters carry no rank or points.
 */
export default function TournamentHistoryTable({ rows }: { rows: HistoryRow[] }) {
  const t = useTranslations();
  const hasRank = rows.some((r) => r.final_rank != null);
  const hasPoints = rows.some((r) => r.points != null);
  const hasDelta = rows.some((r) => r.rating_change != null);

  if (rows.length === 0) {
    return <p className="mt-2 text-sm text-neutral-500">{t("tournaments.empty")}</p>;
  }

  return (
    <div className="mt-2 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-neutral-500">
            <th className="py-2 pr-3 font-medium">{t("fields.name")}</th>
            <th className="py-2 pr-3 font-medium">{t("fields.date")}</th>
            <th className="py-2 pr-3 font-medium">{t("fields.timeControl")}</th>
            {hasRank && <th className="py-2 pr-3 text-right font-medium">{t("fields.rank")}</th>}
            {hasPoints && <th className="py-2 pr-3 text-right font-medium">{t("fields.points")}</th>}
            {hasDelta && <th className="py-2 pr-3 text-right font-medium">{t("fields.ratingClassic")}</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((tr) => (
            <tr key={tr.id} className="border-b border-neutral-100 last:border-0">
              <td className="py-2 pr-3">
                <Link href={`/tournaments/${tr.slug ?? tr.id}`} className="font-medium hover:underline">
                  {tr.name}
                </Link>
              </td>
              <td className="py-2 pr-3 whitespace-nowrap text-neutral-500">
                {tr.start_date} — {tr.end_date}
              </td>
              <td className="py-2 pr-3 whitespace-nowrap text-neutral-500">
                {tr.time_control ?? tr.tournament_type_id ?? "—"}
              </td>
              {hasRank && (
                <td className="py-2 pr-3 text-right">{tr.final_rank ? `#${tr.final_rank}` : "—"}</td>
              )}
              {hasPoints && (
                <td className="py-2 pr-3 text-right">{tr.points != null ? Number(tr.points) : "—"}</td>
              )}
              {hasDelta && (
                <td className="py-2 pr-3 text-right">
                  {tr.rating_change != null
                    ? `${Number(tr.rating_change) > 0 ? "+" : ""}${Number(tr.rating_change)}`
                    : "—"}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
