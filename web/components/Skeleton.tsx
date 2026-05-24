interface SkeletonProps {
  className?: string;
}

/** Shimmer skeleton block. Compose with width/height utility classes. */
export function Skeleton({ className = "" }: SkeletonProps) {
  return <div className={`skeleton ${className}`} />;
}

export function StopCardSkeleton() {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-start gap-3">
        <Skeleton className="h-10 w-10 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4 rounded" />
          <Skeleton className="h-3 w-1/2 rounded" />
        </div>
      </div>
      <div className="my-4 h-px bg-white/5" />
      <div className="flex gap-2">
        <Skeleton className="h-7 w-12 rounded-full" />
        <Skeleton className="h-7 w-12 rounded-full" />
        <Skeleton className="h-7 w-14 rounded-full" />
      </div>
    </div>
  );
}

export function ScheduleRowSkeleton() {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-2/3 rounded" />
          <Skeleton className="h-3 w-1/3 rounded" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-12 rounded-full" />
          <Skeleton className="h-7 w-14 rounded" />
        </div>
      </div>
    </div>
  );
}
