import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { ParticipantRow } from "@/lib/data";

export default async function ParticipantsTable({
  rows,
  mode,
}: {
  rows: ParticipantRow[];
  mode: "starting" | "alphabetical" | "standings";
}) {
  const t = await getTranslations("fields");
  const showStandings = mode === "standings";
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-neutral-300 text-left text-neutral-500">
            <th className="w-10 py-2 pr-3">{showStandings ? t("rank") : t("sno")}</th>
            <th className="w-12 py-2 pr-3">{t("title")}</th>
            <th className="w-full py-2 pr-3">{t("player")}</th>
            <th className="hidden py-2 pr-3 sm:table-cell">{t("playerId")}</th>
            <th className="hidden py-2 pr-3 sm:table-cell">{t("club")}</th>
            <th className="py-2 pr-3">{t("rating")}</th>
            {showStandings && (
              <>
                <th className="py-2 pr-3 font-bold">{t("points")}</th>
                <th className="hidden py-2 pr-3 sm:table-cell">TB1</th>
                <th className="hidden py-2 pr-3 sm:table-cell">TB2</th>
                <th className="hidden py-2 sm:table-cell">TB3</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((p, i) => (
            <tr
              key={p.player_id}
              className="border-b border-neutral-100"
            >
              <td className="py-2 pr-3">
                {showStandings ? (p.final_rank ?? i + 1) : (p.starting_rank ?? i + 1)}
              </td>
              <td className="py-2 pr-3 text-neutral-500">{p.title_id ?? ""}</td>
              <td className="py-2 pr-3 font-medium">
                <Link href={`/players/${p.player_id}`} className="hover:underline">
                  {p.last_name} {p.first_name}
                </Link>
                {p.status !== "ACTIVE" && (
                  <span className="ml-2 text-xs text-red-500">{p.status}</span>
                )}
              </td>
              <td className="hidden py-2 pr-3 sm:table-cell">
                <Link
                  href={`/players/${p.player_id}`}
                  className="text-emerald-700 hover:underline"
                >
                  {p.player_id}
                </Link>
              </td>
              <td className="hidden py-2 pr-3 sm:table-cell">{p.club ?? ""}</td>
              <td className="py-2 pr-3">{p.rating_at_tournament ?? 0}</td>
              {showStandings && (
                <>
                  <td className="py-2 pr-3 font-bold">{Number(p.points)}</td>
                  <td className="hidden py-2 pr-3 sm:table-cell">{Number(p.tie_break_1)}</td>
                  <td className="hidden py-2 pr-3 sm:table-cell">{Number(p.tie_break_2)}</td>
                  <td className="hidden py-2 sm:table-cell">{Number(p.tie_break_3)}</td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
