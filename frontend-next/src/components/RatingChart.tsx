interface Point {
  rating_after: number | string;
  created_at: string;
}

/** Small inline SVG line chart of rating over time — no chart library needed. */
export default function RatingChart({ points }: { points: Point[] }) {
  if (points.length < 2) return null;

  const values = points.map((p) => Number(p.rating_after));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const w = 600;
  const h = 120;
  const pad = 8;

  const coords = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (w - 2 * pad);
    const y = h - pad - ((v - min) / span) * (h - 2 * pad);
    return [x, y] as const;
  });
  const path = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-28 w-full text-emerald-600">
      <path d={path} fill="none" stroke="currentColor" strokeWidth={2} />
      {coords.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={2.5} fill="currentColor" />
      ))}
    </svg>
  );
}
