const STYLES: Record<string, string> = {
  "1-0": "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300",
  "+--": "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300",
  "0-1": "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300",
  "--+": "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300",
  "0.5-0.5": "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300",
  "1/2-1/2": "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300",
  "=-=": "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300",
};

const LABELS: Record<string, string> = {
  "0.5-0.5": "½ : ½",
  "1/2-1/2": "½ : ½",
  "=-=": "½ : ½",
  "1-0": "1 : 0",
  "0-1": "0 : 1",
  "+--": "+ : −",
  "--+": "− : +",
  "1BYE": "BYE",
  "0.5BYE": "½ BYE",
  "0BYE": "0 BYE",
};

export default function ResultChip({ result }: { result: string | null }) {
  const style =
    (result && STYLES[result]) ??
    "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400";
  const label = result ? (LABELS[result] ?? result) : "− : −";
  return (
    <span
      className={`inline-block min-w-16 rounded-lg px-2 py-1 text-center font-mono text-sm font-semibold ${style}`}
    >
      {label}
    </span>
  );
}
