import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { cachedLookups } from "@/lib/cached";
import {
  getPairings,
  getParticipants,
  getRounds,
  getTournamentById,
} from "@/lib/data";
import ControlPanel from "./ControlPanel";

export default async function TournamentAdminPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const tournament = await getTournamentById(locale, Number(id));
  if (!tournament) notFound();
  const [participants, rounds, lookups] = await Promise.all([
    getParticipants(tournament.id, "starting"),
    getRounds(tournament.id),
    cachedLookups(locale),
  ]);
  const lastRound = rounds[rounds.length - 1] ?? null;
  const pairings = lastRound ? await getPairings(lastRound.id) : [];

  return (
    <ControlPanel
      tournament={tournament}
      participants={participants}
      rounds={rounds}
      lastRoundPairings={pairings}
      lookups={lookups}
    />
  );
}
