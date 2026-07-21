const LABELS: Record<string, string> = {
  "0.5-0.5": "\u00bd : \u00bd",
  "1/2-1/2": "\u00bd : \u00bd",
  "=-=": "\u00bd : \u00bd",
  "1-0": "1 : 0",
  "0-1": "0 : 1",
  "+--": "+ : \u2212",
  "--+": "\u2212 : +",
  "1BYE": "BYE",
  "0.5BYE": "\u00bd BYE",
  "0BYE": "0 BYE",
};

export default function ResultChip({ result }: { result: string | null }) {
  const label = result ? (LABELS[result] ?? result) : "\u2212 : \u2212";
  return (
    <span className="inline-block min-w-16 rounded-lg bg-neutral-100 px-2 py-1 text-center font-mono text-sm font-semibold text-neutral-700">
      {label}
    </span>
  );
}
