import { SkeletonCards } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="space-y-8">
      <div className="h-56 animate-pulse rounded-2xl bg-neutral-200 dark:bg-neutral-800" />
      <SkeletonCards cards={4} />
    </div>
  );
}
