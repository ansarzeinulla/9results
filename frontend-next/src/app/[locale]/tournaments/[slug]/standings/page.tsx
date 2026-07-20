import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { cachedStartList } from "@/lib/cached";
import ParticipantsTable from "../ParticipantsTable";

export default async function StandingsTab({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const { tournament: tr, rows } = await cachedStartList(locale, slug, "standings");
  if (!tr) notFound();
  return <ParticipantsTable rows={rows} mode="standings" />;
}
