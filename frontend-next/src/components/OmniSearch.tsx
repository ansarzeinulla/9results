"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export interface OmniHit {
  id: string;
  first_name: string;
  last_name: string;
  title_id: string | null;
  rating_classic: number;
  tournament_id: number | null;
  tournament_name: string | null;
  tournament_slug: string | null;
  round_number: number | null;
  board_number: number | null;
  side: 1 | 2 | null;
  opponent_first: string | null;
  opponent_last: string | null;
  result_id: string | null;
}

async function search(q: string): Promise<OmniHit[]> {
  // production: straight to Supabase RPC from the browser (no server hop);
  // local dev without Supabase: a tiny route handler backed by Postgres
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (url) {
    const res = await fetch(`${url}/rest/v1/rpc/omni_search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      },
      body: JSON.stringify({ p_q: q, p_limit: 8 }),
    });
    if (!res.ok) throw new Error("search failed");
    return res.json();
  }
  const res = await fetch(`/api/omni?q=${encodeURIComponent(q)}`);
  if (!res.ok) throw new Error("search failed");
  return res.json();
}

/**
 * The omni-search: type any spelling of a name, get the player and — if they
 * are playing right now — the tournament, round, board and side. Debounced
 * 300ms with a 2-character minimum, so it cannot spam the database.
 */
function SideDisc({ side }: { side: 1 | 2 }) {
  return (
    <svg viewBox="0 0 20 20" className="inline h-4 w-4 shrink-0 align-middle">
      <circle
        cx="10"
        cy="10"
        r="8"
        className={
          side === 1
            ? "fill-emerald-600"
            : "fill-none stroke-emerald-600 [stroke-width:2.5]"
        }
      />
    </svg>
  );
}

export default function OmniSearch() {
  const t = useTranslations("search");
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<OmniHit[] | null>(null);
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    const query = q.trim();
    if (query.length < 2) {
      setHits(null);
      return;
    }
    timer.current = setTimeout(async () => {
      setBusy(true);
      try {
        setHits(await search(query));
      } catch {
        setHits([]);
      } finally {
        setBusy(false);
      }
    }, 300);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [q]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div ref={boxRef} className="relative">
      <button
        aria-label={t("placeholder")}
        onClick={() => setOpen((v) => !v)}
        className="rounded-lg border border-neutral-300 px-2 py-1 text-sm"
      >
        🔍
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-[min(90vw,380px)] rounded-xl border border-neutral-200 bg-white p-3 shadow-lg">
          <input
            autoFocus
            className="w-full rounded-lg border border-neutral-300 bg-transparent px-3 py-2 text-sm"
            placeholder={t("placeholder")}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          {busy && (
            <div className="mt-2 h-8 animate-pulse rounded bg-neutral-200" />
          )}
          {hits && hits.length === 0 && !busy && (
            <p className="mt-2 text-sm text-neutral-500">{t("noResults")}</p>
          )}
          {hits && hits.length > 0 && (
            <ul className="mt-2 max-h-80 divide-y divide-neutral-100 overflow-y-auto">
              {hits.map((h) => (
                <li key={h.id} className="py-2 text-sm">
                  <Link
                    href={
                      h.tournament_slug && h.round_number
                        ? `/tournaments/${h.tournament_slug}/pairings/round/${h.round_number}`
                        : `/players/${h.id}`
                    }
                    onClick={() => setOpen(false)}
                    className="block hover:opacity-80"
                  >
                    <div className="font-medium">
                      {h.title_id && (
                        <span className="mr-1 text-emerald-600">{h.title_id}</span>
                      )}
                      {h.last_name} {h.first_name}{" "}
                      <span className="text-neutral-400">
                        [{h.rating_classic}]
                      </span>
                    </div>
                    {h.tournament_name && h.round_number ? (
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-neutral-500">
                        <span className="font-semibold text-emerald-600">
                          {t("nowPlaying")}
                        </span>
                        <span className="truncate">{h.tournament_name}</span>
                        <span>
                          {t("round")} {h.round_number}
                        </span>
                        <span className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-sm font-bold">
                          {t("board")} {h.board_number}
                        </span>
                        {h.side && <SideDisc side={h.side} />}
                      </div>
                    ) : (
                      <div className="mt-0.5 text-xs text-neutral-400">
                        {t("notPlaying")}
                      </div>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
