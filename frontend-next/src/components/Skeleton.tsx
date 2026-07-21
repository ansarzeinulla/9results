export function SkeletonRows({ rows = 8 }: { rows?: number }) {
  return (
    <div className="animate-pulse space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-10 rounded-lg bg-neutral-200"
        />
      ))}
    </div>
  );
}

export function SkeletonCards({ cards = 3 }: { cards?: number }) {
  return (
    <div className="grid animate-pulse gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: cards }).map((_, i) => (
        <div
          key={i}
          className="h-32 rounded-xl bg-neutral-200"
        />
      ))}
    </div>
  );
}
