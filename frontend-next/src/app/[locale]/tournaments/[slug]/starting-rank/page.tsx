import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { getParticipants, getTournamentBySlug } from "@/lib/data";
import ParticipantsTable from "../ParticipantsTable";

export default async function StartingRankTab({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const tr = await getTournamentBySlug(locale, slug);
  if (!tr) notFound();
  const rows = await getParticipants(tr.id, "starting");
  return <ParticipantsTable rows={rows} mode="starting" />;
}
