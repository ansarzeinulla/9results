import ResultChip from "./ResultChip";

/** Inline SVG side markers (~200 bytes) instead of image files: side 1 plays
 * the filled disc, side 2 the outlined one. */
export function SideDisc({ side }: { side: 1 | 2 }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className="inline h-4 w-4 shrink-0 align-middle"
      aria-label={side === 1 ? "side 1" : "side 2"}
    >
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

export interface PairingCardData {
  board_number: number | null;
  white_name?: string;
  black_name?: string | null;
  white_rating?: number | null;
  black_rating?: number | null;
  white_points?: string | number | null;
  black_points?: string | number | null;
  result_id: string | null;
}

/**
 * One board of a round, mobile-first: the board number is the biggest element
 * on the card so a player scanning a crowded hall wall finds theirs fast.
 */
export default function PairingCard({
  pairing: m,
  byeLabel,
}: {
  pairing: PairingCardData;
  byeLabel: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-800">
      <span className="w-12 shrink-0 text-center font-mono text-2xl font-bold tabular-nums">
        {m.board_number === 999 || m.board_number == null ? "—" : m.board_number}
      </span>
      <div className="min-w-0 flex-1 text-right">
        <span className="font-medium">{m.white_name}</span>{" "}
        <SideDisc side={1} />
        <div className="text-xs text-neutral-400">
          [{m.white_rating ?? 0}
          {m.white_points != null ? ` · ${Number(m.white_points)}` : ""}]
        </div>
      </div>
      <ResultChip result={m.result_id} />
      <div className="min-w-0 flex-1">
        {m.black_name ? (
          <>
            <SideDisc side={2} />{" "}
            <span className="font-medium">{m.black_name}</span>
            <div className="text-xs text-neutral-400">
              [{m.black_rating ?? 0}
              {m.black_points != null ? ` · ${Number(m.black_points)}` : ""}]
            </div>
          </>
        ) : (
          <span className="text-neutral-400">{byeLabel}</span>
        )}
      </div>
    </div>
  );
}
