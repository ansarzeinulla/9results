import ResultChip from "./ResultChip";

export interface PairingCardData {
  board_number: number | null;
  white_name?: string;
  black_name?: string | null;
  white_title?: string | null;
  black_title?: string | null;
  white_rating?: number | null;
  black_rating?: number | null;
  /** Points before the round started (standings after the previous round). */
  white_points?: string | number | null;
  black_points?: string | number | null;
  result_id: string | null;
}

/** One board of a round. White is always the left column, black the right. */
export default function PairingCard({
  pairing: m,
  byeLabel,
}: {
  pairing: PairingCardData;
  byeLabel: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-neutral-200 px-3 py-2 text-sm">
      <span className="w-8 shrink-0 text-center font-mono text-sm font-semibold tabular-nums text-neutral-500">
        {m.board_number === 999 || m.board_number == null ? "—" : m.board_number}
      </span>
      <div className="min-w-0 flex-1 text-right">
        {m.white_title && (
          <span className="mr-1 text-xs font-semibold text-emerald-700">
            {m.white_title}
          </span>
        )}
        <span className="font-medium">{m.white_name}</span>
        <div className="text-xs text-neutral-500">
          {m.white_rating ?? 0}
          {m.white_points != null ? ` · ${Number(m.white_points)}` : ""}
        </div>
      </div>
      <ResultChip result={m.result_id} />
      <div className="min-w-0 flex-1">
        {m.black_name ? (
          <>
            {m.black_title && (
              <span className="mr-1 text-xs font-semibold text-emerald-700">
                {m.black_title}
              </span>
            )}
            <span className="font-medium">{m.black_name}</span>
            <div className="text-xs text-neutral-500">
              {m.black_rating ?? 0}
              {m.black_points != null ? ` · ${Number(m.black_points)}` : ""}
            </div>
          </>
        ) : (
          <span className="text-neutral-400">{byeLabel}</span>
        )}
      </div>
    </div>
  );
}
