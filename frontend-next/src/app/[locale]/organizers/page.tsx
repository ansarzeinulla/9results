import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { cachedLookups, cachedOrganizers } from "@/lib/cached";
import FiltersPanel from "./FiltersPanel";

export default async function OrganizersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; federation?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;
  const t = await getTranslations();
  const lookups = await cachedLookups(locale);
  const rows = await cachedOrganizers(sp.q, sp.federation);

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">{t("organizers.title")}</h1>
      <FiltersPanel federations={lookups.federations} />
      {rows.length === 0 ? (
        <p className="mt-4 text-neutral-500">{t("organizers.empty")}</p>
      ) : (
        <table className="mt-4 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-neutral-300 text-left text-neutral-500">
              <th className="w-full py-2 pr-3">{t("fields.name")}</th>
              <th className="py-2 pr-3">{t("fields.federation")}</th>
              <th className="py-2">{t("organizers.tournamentsOrganized")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                <td className="py-2 pr-3 font-medium">
                  <Link href={`/organizers/${r.id}`} className="hover:underline">
                    {r.name}
                  </Link>
                </td>
                <td className="py-2 pr-3">{r.federation_id ?? ""}</td>
                <td className="py-2">{r.tournaments_count ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
