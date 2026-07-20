import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { cachedStartList } from "@/lib/cached";
import ParticipantsTable from "../ParticipantsTable";

export default async function AlphabeticalTab({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const { tournament: tr, rows } = await cachedStartList(locale, slug, "alphabetical");
  if (!tr) notFound();
  return <ParticipantsTable rows={rows} mode="alphabetical" />;
}
